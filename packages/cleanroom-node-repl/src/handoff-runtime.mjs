import { createHash } from 'node:crypto';
import { recoveryAdapter } from './private-linked-science-recovery.mjs';
import { jsonCopy, fail, name } from './handoff-values.mjs';

export function createHandoffRuntime({call, scientificSession}) {
  const steps=new Map(),loaded=new Map(),leases=new Map();
  const stepKey=s=>`${s.name}@${s.version}`;
  const identity=spec=>{const entry=steps.get(stepKey(spec));if(!entry)fail('HANDOFF_CODE_MISMATCH');return entry.identity;};
  async function cleanup(request) {
    const entries=leases.get(request)??[];
    for(const entry of entries) {
      await scientificSession.revoke({capability:entry.grant.capability});
      for(const publication of entry.publications) {try{scientificSession.unpublish(publication);}catch(e){if(e.code!=='SESSION_OBJECT_UNKNOWN')throw e;}}
      for(const handle of entry.handles)await entry.workspace.release(handle);
    }
    leases.delete(request);
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
      for(const id of leases.keys())if(['cancelled','accepted'].includes((await call('status',{activity,request:id})).status))await cleanup(id);
      return receipt;
    },
    cleanup,
    async grant(activity,request,workspace,{ttlMs=60000}={}) {
      const r=await call('status',{activity,request});
      if(!['dispatch-intent','dispatched'].includes(r.status))fail('HANDOFF_STATE');
      const publications=[],handles=[];
      try {
        for(const ref of r.inputs) {
          const snapshot=await call('load',{activity,ref});
          const value=snapshot.kind==='json'?snapshot.items:recoveryAdapter(workspace).restore(snapshot,ref);
          // Independent immutable snapshots own in-flight input data. Original
          // source release retains its existing invalidation semantics.
          if(snapshot.kind!=='json')handles.push(value);
          publications.push(snapshot.kind==='json'?scientificSession.publishJson(workspace,value):scientificSession.publish(workspace,value));
        }
        const grant=await scientificSession.grant({objects:publications.map(p=>p.object),operations:['describe','match','bindings','query','jsonRead','deposit'],outputSlot:request,ttlMs});
        leases.set(request,[...(leases.get(request)??[]),{grant,publications,handles,workspace}]);
        return {grant,inputs:r.inputs.map((ref,i)=>({ref,publication:publications[i]}))};
      } catch(e) {for(const p of publications)scientificSession.unpublish(p);for(const handle of handles)await workspace.release(handle);throw e;}
    },
    remove:(activity,ref)=>call('remove',{activity,ref}),
    removeActivity:activity=>call('removeActivity',{activity}),
  };
  return Object.freeze(api);
}
