import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, lstatSync, realpathSync, chmodSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fail, jsonCopy, digest, name, integer, fields, validateSnapshot, validateContract } from './handoff-values.mjs';

const MAX_DATA_BYTES = 128 * 1024;
const terminal = r => ['accepted','cancelled'].includes(r.status);
const identity = step => { fields(step,['name','version','digest']); name(step.name); name(step.version); if (!/^[a-f0-9]{64}$/.test(step.digest)) fail('HANDOFF_STEP'); return step; };
const empty = () => ({format:1,activities:{},data:{},computations:{},requests:{}});

/** Host-only durable data/continuation ledger. It never executes code or starts agents.
 * All durable transitions use an IMMEDIATE SQLite transaction. Capabilities and
 * registrations are deliberately kept outside the database. */
export class HandoffStore {
  constructor({root, deniedRoots = [], maxBytes = 32*1024*1024, fault = () => {}}) {
    this.maxBytes = integer(maxBytes, 4096, 256*1024*1024);
    if (typeof root !== 'string' || !root.startsWith('/')) fail('HANDOFF_ROOT');
    this.root = resolve(root);
    mkdirSync(this.root, {recursive:true, mode:0o700});
    const stat = lstatSync(this.root);
    if (stat.isSymbolicLink() || !stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) fail('HANDOFF_ROOT');
    this.root=realpathSync(this.root);
    if (deniedRoots.some(p => {const r=realpathSync(p); return this.root === r || this.root.startsWith(r+sep);})) fail('HANDOFF_ROOT_READABLE_BY_CHILD');
    const path = join(this.root,'handoff.sqlite');
    try { const s=lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || s.nlink!==1 || s.uid!==process.getuid()) fail('HANDOFF_ROOT'); } catch(e) { if(e.code!=='ENOENT')throw e; }
    this.db = new DatabaseSync(path); chmodSync(path,0o600);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY CHECK(id=1), format INTEGER NOT NULL, payload TEXT NOT NULL, sha TEXT NOT NULL);`);
    this.db.exec(`PRAGMA max_page_count=${Math.ceil(this.maxBytes*3/4096)+64}`);
    this.instance = randomUUID(); this.sessions = new Map(); this.registrations = new Map(); this.fault=fault;
    this.transaction('initialize', state => state);
  }
  transaction(operation, fn) {
    this.db.exec('BEGIN IMMEDIATE');
    let result;
    try {
      const row=this.db.prepare('SELECT * FROM ledger WHERE id=1').get();
      let state=empty();
      if(row) {
        if(row.format!==1 || digest(row.payload)!==row.sha)fail('HANDOFF_INTEGRITY');
        state=JSON.parse(row.payload); if(state.format!==1)fail('HANDOFF_FORMAT');
      }
      result=fn(state);
      const payload=JSON.stringify(state);
      if(Buffer.byteLength(payload)>this.maxBytes)fail('HANDOFF_QUOTA');
      this.fault(`${operation}:before-commit`);
      this.db.prepare('INSERT OR REPLACE INTO ledger VALUES (1,1,?,?)').run(payload,digest(payload));
      this.db.exec('COMMIT');
    } catch(e) {this.db.exec('ROLLBACK');throw e;}
    this.fault(`${operation}:after-commit`);
    return result === undefined ? null : structuredClone(result);
  }
  session(activity, owner) {
    const session=this.sessions.get(activity?.epoch);
    if(!session || session.owner!==owner.token || session.activity!==activity.id)fail('HANDOFF_EPOCH');
    return session;
  }
  dropOwner(owner) {
    for(const [id,s] of this.sessions)if(s.owner===owner.token)this.sessions.delete(id);
    this.registrations.delete(owner.token);
  }
  registered(step, owner) {
    identity(step);
    if(this.registrations.get(owner.token)?.get(`${step.name}@${step.version}`)!==step.digest)fail('HANDOFF_CODE_MISMATCH');
  }
  data(state, ref, session) {
    fields(ref,['id','version']);
    const d=Object.hasOwn(state.data,ref.id)?state.data[ref.id]:null;
    if(!d || d.version!==ref.version || (d.activity!==session.activity && !session.shared.some(r=>r.id===ref.id && r.version===ref.version)))fail('HANDOFF_INPUT_SCOPE');
    if(digest(d.snapshot)!==d.version)fail('HANDOFF_INTEGRITY');
    return d;
  }
  computation(state, id, session) {
    const c=Object.hasOwn(state.computations,id)?state.computations[id]:null; if(!c || c.activity!==session.activity)fail('HANDOFF_SCOPE'); return c;
  }
  request(state, id, session) {
    const r=Object.hasOwn(state.requests,id)?state.requests[id]:null; if(!r || r.activity!==session.activity)fail('HANDOFF_SCOPE'); return r;
  }
  view(r) {
    const {createdEvaluation,createdEpoch,dispatchInstance,...view}=r;
    if(['dispatch-intent','dispatched'].includes(r.status) && dispatchInstance!==this.instance)view.status='dispatch-uncertain';
    return view;
  }
  call(operation, raw = {}, owner) {
    if(!owner?.token)fail('HANDOFF_OWNER');
    const args=jsonCopy(raw, 3*1024*1024);
    if(operation==='capabilities')return {available:true,version:1,durability:'explicit-snapshot',maxDataBytes:MAX_DATA_BYTES,maxItems:10000,maxLedgerBytes:this.maxBytes,modelExecution:false,retention:'until-explicit-remove',limitsScope:'registered-protocol-only'};
    if(operation==='register') {
      fields(args,['step']);identity(args.step);
      let registry=this.registrations.get(owner.token);if(!registry)this.registrations.set(owner.token,registry=new Map());
      const key=`${args.step.name}@${args.step.version}`;
      if(registry.has(key)&&registry.get(key)!==args.step.digest)fail('HANDOFF_CODE_MISMATCH');
      if(registry.size>=128&&!registry.has(key))fail('HANDOFF_CAPACITY');
      registry.set(key,args.step.digest);return args.step;
    }
    if(operation==='activities') {
      fields(args,['offset','limit']);
      return this.transaction('activities',state=>{const rows=Object.entries(state.activities),offset=integer(args.offset??0,0,64),limit=integer(args.limit??8,1,16);return {total:rows.length,items:rows.slice(offset,offset+limit).map(([id,a])=>({id,label:a.label,createdAt:a.createdAt})),nextOffset:offset+limit<rows.length?offset+limit:null};});
    }
    if(operation==='open') {
      if(this.sessions.size>=256)fail('HANDOFF_CAPACITY');
      fields(args,['id','label','shared','budgets']);
      const shared=args.shared??[]; if(!Array.isArray(shared)||shared.length>32)fail('HANDOFF_BOUNDS');
      const id=this.transaction('open',state=>{
        let id=args.id;
        if(id!==undefined) {if(!Object.hasOwn(state.activities,id))fail('HANDOFF_SCOPE');}
        else {if(Object.keys(state.activities).length>=64)fail('HANDOFF_CAPACITY');id=randomUUID();const b=args.budgets??{};fields(b,['maxDepth','maxCalls','maxPending']);state.activities[id]={label:name(args.label),createdAt:Date.now(),budgets:{maxDepth:integer(b.maxDepth??4,0,4),maxCalls:integer(b.maxCalls??64,1,64),maxPending:integer(b.maxPending??8,1,8)}};}
        for(const ref of shared){fields(ref,['id','version']);if(state.data[ref.id]?.version!==ref.version)fail('HANDOFF_INPUT_SCOPE');}
        return id;
      });
      const epoch=randomUUID();this.sessions.set(epoch,{owner:owner.token,activity:id,shared});return {id,epoch};
    }
    const session=this.session(args.activity,owner);
    const allowed={save:['snapshot'],load:['ref'],list:['offset','limit'],start:['step','state','inputs','parentRequest'],read:['computation'],advance:['computation','revision','outcome'],pending:['offset','limit'],status:['request'],dispatch:['request'],dispatched:['request','child'],reconcile:['request','decision','child'],accept:['request','inputs','result'],cancel:['request'],remove:['ref'],removeActivity:[]};
    if(!allowed[operation])fail('HANDOFF_OPERATION');fields(args,['activity',...allowed[operation]]);
    return this.transaction(operation,state=>{
      if(!state.activities[session.activity])fail('HANDOFF_SCOPE');
      if(operation==='save') {
        const snapshot=jsonCopy(args.snapshot,MAX_DATA_BYTES); validateSnapshot(snapshot);
        if(Object.keys(state.data).length>=256)fail('HANDOFF_CAPACITY');
        const id=randomUUID(),version=digest(snapshot);
        state.data[id]={activity:session.activity,version,snapshot,savedAt:Date.now()};return {id,version};
      }
      if(operation==='load')return this.data(state,args.ref,session).snapshot;
      if(operation==='list') {
        const offset=integer(args.offset??0,0,256),limit=integer(args.limit??16,1,32);
        const rows=Object.entries(state.data).filter(([id,d])=>d.activity===session.activity||session.shared.some(r=>r.id===id&&r.version===d.version));
        return {total:rows.length,items:rows.slice(offset,offset+limit).map(([id,d])=>({ref:{id,version:d.version},kind:d.snapshot.kind,semantics:d.snapshot.semantics,status:'saved',savedAt:d.savedAt})),nextOffset:offset+limit<rows.length?offset+limit:null};
      }
      if(operation==='remove') {
        const d=this.data(state,args.ref,session); if(d.activity!==session.activity)fail('HANDOFF_SCOPE');
        if(Object.values(state.computations).some(c=>c.inputs.some(r=>r.id===args.ref.id)))fail('HANDOFF_INPUT_PINNED');
        delete state.data[args.ref.id];return {removed:args.ref};
      }
      if(operation==='removeActivity') {
        if(Object.values(state.requests).some(r=>r.activity===session.activity&&!terminal(r)))fail('HANDOFF_PENDING');
        const ids=Object.keys(state.data).filter(id=>state.data[id].activity===session.activity);
        if(Object.values(state.computations).some(c=>c.activity!==session.activity&&c.inputs.some(r=>ids.includes(r.id))))fail('HANDOFF_INPUT_PINNED');
        for(const collection of ['data','computations','requests'])for(const [id,r] of Object.entries(state[collection]))if(r.activity===session.activity)delete state[collection][id];
        delete state.activities[session.activity];return {removed:session.activity};
      }
      if(operation==='start') {
        this.registered(args.step,owner); const inputs=args.inputs??[];
        if(!Array.isArray(inputs)||inputs.length>32)fail('HANDOFF_BOUNDS');for(const ref of inputs)this.data(state,ref,session);
        let depth=0,parent=null;
        if(args.parentRequest) {parent=this.request(state,args.parentRequest,session);if(terminal(parent))fail('HANDOFF_STATE'); depth=this.computation(state,parent.computation,session).depth+1;}
        if(depth>state.activities[session.activity].budgets.maxDepth || Object.values(state.computations).filter(c=>c.activity===session.activity).length>=128)fail('HANDOFF_BUDGET');
        const id=randomUUID(); state.computations[id]={id,activity:session.activity,parentRequest:parent?.id??null,depth,step:args.step,state:jsonCopy(args.state??null),inputs,revision:0,status:'ready',result:null};
        return {id,revision:0,status:'ready'};
      }
      if(operation==='read') {
        const c=this.computation(state,args.computation,session);this.registered(c.step,owner);
        for(const ref of c.inputs)this.data(state,ref,session);return c;
      }
      if(operation==='advance') {
        const c=this.computation(state,args.computation,session);this.registered(c.step,owner);
        if(c.revision!==args.revision||c.status!=='ready')fail('HANDOFF_REVISION');
        const o=jsonCopy(args.outcome); fields(o,['type','value','state','continuation','request']);
        if(o.type==='done') {fields(o,['type','value']);c.status='complete';c.value=jsonCopy(o.value);c.revision++;return {computation:c.id,status:c.status,revision:c.revision};}
        if(o.type!=='yield')fail('HANDOFF_OUTCOME');fields(o,['type','state','continuation','request']);
        this.registered(o.continuation,owner);fields(o.request,['context','contract']);validateContract(o.request.contract,null,false);jsonCopy(o.request.context,16384);
        const all=Object.values(state.requests).filter(r=>r.activity===session.activity),budgets=state.activities[session.activity].budgets;
        if(all.length>=budgets.maxCalls||all.filter(r=>!terminal(r)).length>=budgets.maxPending)fail('HANDOFF_BUDGET');
        const id=randomUUID();c.state=jsonCopy(o.state);c.step=o.continuation;c.status='waiting';c.revision++;c.request=id;c.result=null;
        state.requests[id]={id,activity:session.activity,computation:c.id,parentRequest:c.parentRequest,inputs:c.inputs,context:o.request.context,contract:o.request.contract,status:'prepared',revision:c.revision,createdAt:Date.now(),createdEpoch:`${this.instance}:${owner.epoch}`,createdEvaluation:owner.evaluation,events:[{kind:'prepared',at:Date.now()}]};
        return {computation:c.id,revision:c.revision,status:'waiting',request:id};
      }
      if(operation==='pending') {
        const offset=integer(args.offset??0,0,64),limit=integer(args.limit??8,1,16);
        const rows=Object.values(state.requests).filter(r=>r.activity===session.activity&&!terminal(r));
        return {total:rows.length,items:rows.slice(offset,offset+limit).map(r=>({id:r.id,computation:r.computation,status:this.view(r).status})),nextOffset:offset+limit<rows.length?offset+limit:null};
      }
      const r=this.request(state,args.request,session),c=this.computation(state,r.computation,session);
      if(operation==='status')return this.view(r);
      if(operation==='cancel') {
        if(r.status==='accepted')fail('HANDOFF_ACCEPTED');
        const cancel=r=>{if(r.status==='cancelled')return;r.status='cancelled';r.events.push({kind:'cancelled',at:Date.now()});state.computations[r.computation].status='cancelled';for(const child of Object.values(state.computations).filter(x=>x.parentRequest===r.id)){if(child.status==='complete')continue;child.status='cancelled';if(child.request&&!terminal(state.requests[child.request]))cancel(state.requests[child.request]);}};
        cancel(r);return this.view(r);
      }
      if(operation==='dispatch') {
        if(r.status!=='prepared')fail('HANDOFF_DISPATCH_UNCERTAIN');
        if(r.createdEpoch===`${this.instance}:${owner.epoch}`&&r.createdEvaluation===owner.evaluation)fail('HANDOFF_EVALUATION_OPEN');
        r.status='dispatch-intent';r.dispatchInstance=this.instance;r.events.push({kind:'dispatch-intent-recorded',at:Date.now()});return this.view(r);
      }
      if(operation==='dispatched'||operation==='reconcile') {
        if(terminal(r)||r.status==='prepared')fail('HANDOFF_STATE');
        if(r.events.length>=64)fail('HANDOFF_BUDGET');
        if(operation==='reconcile'&&!['not-dispatched','child-reported'].includes(args.decision))fail('HANDOFF_RECONCILE');
        if(args.decision==='not-dispatched') {r.status='prepared';delete r.child;}
        else {name(args.child);r.status='dispatched';r.child={id:args.child,evidence:'caller-reported-unverified'};}
        r.dispatchInstance=this.instance;r.events.push({kind:operation==='reconcile'?'reconciliation-recorded':'child-report-recorded',at:Date.now()});return this.view(r);
      }
      if(operation==='accept') {
        if(r.status==='cancelled')fail('HANDOFF_CANCELLED');
        if(digest(args.inputs)!==digest(r.inputs))fail('HANDOFF_INPUT_VERSION');
        const result=jsonCopy(args.result,r.contract.maxBytes);validateContract(r.contract,result);
        const hash=digest(result);
        if(r.status==='accepted') {if(r.acceptance.resultDigest!==hash)fail('HANDOFF_CONFLICT');return r.acceptance;}
        if(!['dispatch-intent','dispatched'].includes(r.status))fail('HANDOFF_STATE');
        if(r.dispatchInstance!==this.instance)fail('HANDOFF_DISPATCH_UNCERTAIN');
        if(Object.values(state.computations).some(child=>child.parentRequest===r.id&&child.status!=='complete'))fail('HANDOFF_CHILD_PENDING');
        for(const ref of r.inputs)this.data(state,ref,session);
        if(c.status!=='waiting'||c.request!==r.id||c.revision!==r.revision)fail('HANDOFF_REVISION');
        c.result=result;c.status='ready';c.revision++;
        r.status='accepted';r.acceptance={id:randomUUID(),request:r.id,activity:r.activity,resultDigest:hash,continuationRevision:c.revision,acceptedAt:Date.now(),evidence:'host-committed-model-synthesis'};
        r.events.push({kind:'result-accepted',at:r.acceptance.acceptedAt});return r.acceptance;
      }
      fail('HANDOFF_OPERATION');
    });
  }
  close(){this.sessions.clear();this.registrations.clear();this.db.close();}
}
