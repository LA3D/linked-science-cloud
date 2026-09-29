import { createHash } from 'node:crypto';
import { recoveryAdapter } from './private-linked-science-recovery.mjs';
import { jsonCopy, fail, name } from './handoff-values.mjs';

export function createHandoffRuntime({call, scientificSession}) {
  const steps=new Map(),loaded=new Map(),leases=new Map(),cleanups=new Map();
  const stepKey=s=>`${s.name}@${s.version}`;
  const identity=spec=>{const entry=steps.get(stepKey(spec));if(!entry)fail('HANDOFF_CODE_MISMATCH');return entry.identity;};
  const released = error => ['LS_RELEASED_HANDLE','LS_STALE_HANDLE','LS_STALE_WORKSPACE'].includes(error?.code);
  async function releaseEntry(entry) {
    if (entry.grant) {
      await scientificSession.revoke({capability:entry.grant.capability});
      entry.grant=null;
    }
    while(entry.publications.length) {
      try {scientificSession.unpublish(entry.publications[0]);}
      catch(error) {if(error.code!=='SESSION_OBJECT_UNKNOWN')throw error;}
      entry.publications.shift();
    }
    while(entry.handles.length) {
      try {await entry.workspace.release(entry.handles[0]);}
      catch(error) {if(!released(error))throw error;}
      entry.handles.shift();
    }
  }
  function cleanup(request) {
    if(cleanups.has(request))return cleanups.get(request);
    const work=(async()=>{
      const entries=leases.get(request)??[];
      for(const entry of [...entries]) {
        if(entry.allocating) {entry.cancelled=true;continue;}
        await releaseEntry(entry);
        const index=entries.indexOf(entry);if(index>=0)entries.splice(index,1);
      }
      if(entries.length)fail('HANDOFF_CLEANUP_PENDING');
      leases.delete(request);
    })();
    cleanups.set(request,work);
    work.finally(()=>{if(cleanups.get(request)===work)cleanups.delete(request);}).catch(()=>{});
    return work;
  }
  const api={
    capabilities:()=>call('capabilities',{}),
    async register({name:stepName,version},fn) {
      name(stepName);name(version);if(typeof fn!=='function')fail('HANDOFF_STEP');
      const step={name:stepName,version,digest:createHash('sha256').update(Function.prototype.toString.call(fn)).digest('hex')};
      const existing=steps.get(stepKey(step));if(existing&&existing.identity.digest!==step.digest)fail('HANDOFF_CODE_MISMATCH');
      await call('register',{step});steps.set(stepKey(step),{identity:step,fn});return step;
    },
    activities:(options={})=>call('activities',options),
    open:options=>call('open',options),
    async save(activity,workspace,handle) {return call('save',{activity,snapshot:await recoveryAdapter(workspace).snapshot(handle)});},
    saveJson:(activity,value)=>call('save',{activity,snapshot:{format:1,kind:'json',semantics:'json',items:jsonCopy(value,128*1024),metadata:{evidence:'caller-json'}}}),
    async load(activity,ref,workspace) {
      const snapshot=await call('load',{activity,ref});
      const value=recoveryAdapter(workspace).restore(snapshot,ref);
      loaded.set(`${activity.epoch}:${ref.id}`,{value,workspace,kind:snapshot.kind});return value;
    },
    readJson:(workspace,handle,options={})=>recoveryAdapter(workspace).readJson(handle,options),
    async map(activity,options={}) {
      const result=await call('list',{activity,...options});
      result.items=result.items.map(item=>{
        const record=loaded.get(`${activity.epoch}:${item.ref.id}`);let status='saved';
        if(record) {try {record.workspace.results.profile(record.value);status='loaded';}catch{status='saved';}}
        return {...item,status};
      });return result;
    },
    start:(activity,{step,state=null,inputs=[],parentRequest}={})=>call('start',{activity,step:identity(step),state:jsonCopy(state),inputs,...(parentRequest?{parentRequest}:{})}),
    computations:(activity,options={})=>call('computations',{activity,...options}),
    read:(activity,computation)=>call('read',{activity,computation}),
    async run(activity,computation) {
      const c=await call('read',{activity,computation});
      if(c.status!=='ready')fail('HANDOFF_STATE');
      const registered=steps.get(stepKey(c.step));if(!registered||registered.identity.digest!==c.step.digest)fail('HANDOFF_CODE_MISMATCH');
      // Only explicit serializable values cross the continuation boundary.
      const outcome=await registered.fn({state:c.state,result:c.result,inputs:c.inputs});
      const normalized=jsonCopy(outcome);
      if(normalized.type==='yield')normalized.continuation=identity(normalized.continuation);
      return call('advance',{activity,computation,revision:c.revision,outcome:normalized});
    },
    pending:(activity,options={})=>call('pending',{activity,...options}),
    status:(activity,request)=>call('status',{activity,request}),
    dispatch:(activity,request)=>call('dispatch',{activity,request}),
    dispatched:(activity,request,child)=>call('dispatched',{activity,request,child}),
    reconcile:(activity,request,decision,child)=>call('reconcile',{activity,request,decision,...(child?{child}:{})}),
    async accept(activity,request,inputs,result) {
      const receipt=await call('accept',{activity,request,inputs,result:jsonCopy(result,32768)});
      try {await cleanup(request);return {...receipt,cleanup:'complete'};}catch{return {...receipt,cleanup:'pending',repair:'retry cleanup(request)'};}
    },
    async cancel(activity,request) {
      const receipt=await call('cancel',{activity,request});
      // Cancellation cascades; cleanup every tracked terminal request.
      let pending=false;
      for(const [id,entries] of leases) {
        if(entries[0]?.activity.id!==activity.id)continue;
        if(['cancelled','accepted'].includes((await call('status',{activity,request:id})).status)) {try{await cleanup(id);}catch{pending=true;}}
      }
      return {...receipt,cleanup:pending?'pending':'complete',...(pending?{repair:'retry cleanup(request)'}:{})};
    },
    cleanup,
    async grant(activity,request,workspace,{ttlMs=60000}={}) {
      const r=await call('status',{activity,request});
      if(!['dispatch-intent','dispatched'].includes(r.status))fail('HANDOFF_STATE');
      const publications=[],handles=[];
      const entry={activity,grant:null,publications,handles,workspace,allocating:true,cancelled:false};
      // Track provisional allocations before the first await, so races and
      // partial cleanup remain retryable without persisting capabilities.
      const entries=leases.get(request)??[];entries.push(entry);leases.set(request,entries);
      try {
        for(const ref of r.inputs) {
          const snapshot=await call('load',{activity,ref});
          if(entry.cancelled)fail('HANDOFF_STATE');
          const value=snapshot.kind==='json'?snapshot.items:recoveryAdapter(workspace).restore(snapshot,ref);
          // Independent immutable snapshots own in-flight input data. Original
          // source release retains its existing invalidation semantics.
          if(snapshot.kind!=='json')handles.push(value);
          publications.push(snapshot.kind==='json'?scientificSession.publishJson(workspace,value):scientificSession.publish(workspace,value));
        }
        const grant=entry.grant=await scientificSession.grant({objects:publications.map(p=>p.object),operations:['describe','match','bindings','query','jsonRead','deposit'],outputSlot:request,ttlMs});
        const current=await call('status',{activity,request});
        if(entry.cancelled||!['dispatch-intent','dispatched'].includes(current.status))fail('HANDOFF_STATE');
        return {grant,inputs:r.inputs.map((ref,i)=>({ref,publication:publications[i]}))};
      } catch(error) {
        try {await releaseEntry(entry);const index=entries.indexOf(entry);if(index>=0)entries.splice(index,1);if(!entries.length)leases.delete(request);}
        catch {error.cleanup='pending';error.repair='retry cleanup(request)';}
        throw error;
      } finally {entry.allocating=false;}
    },
    remove:(activity,ref)=>call('remove',{activity,ref}),
    removeActivity:activity=>call('removeActivity',{activity}),
  };
  return Object.freeze(api);
}
