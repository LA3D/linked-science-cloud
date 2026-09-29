import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { HandoffStore } from '../src/handoff-store.mjs';
import { jsonCopy } from '../src/handoff-values.mjs';
const step={name:'test',version:'1',digest:'a'.repeat(64)};
const contract={type:'object',required:['text'],properties:{text:'string'},maxBytes:1024};
const outcome={type:'yield',continuation:step,state:{phase:1},request:{context:{question:'synthesize'},contract}};
const snapshot={format:1,kind:'json',semantics:'json',items:{values:[1,2,2]},metadata:{evidence:'synthetic'}};
function fixture(t,options={}) {
 const root=mkdtempSync(join(tmpdir(),'handoff-test-'));let store=new HandoffStore({root,...options});
 t.after(()=>{try{store.close();}catch{}rmSync(root,{recursive:true,force:true});});
 const owner={token:'private-owner-secret',epoch:1,evaluation:1};
 const call=(op,args={})=>store.call(op,args,owner);
 const activity=call('open',{label:'synthetic'});call('register',{step});
 const ref=call('save',{activity,snapshot});
 const start=(options={})=>call('start',{activity,step,state:{},inputs:[ref],...options});
 const prepare=()=>{const c=start();return call('advance',{activity,computation:c.id,revision:0,outcome});};
 return {root,owner,call,activity,ref,start,prepare,get store(){return store;},restart(){store.close();store=new HandoffStore({root,...options});owner.epoch++;owner.token+='new';return store;}};
}
const throws=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('durable acceptance, revision CAS, retries, nested identities and uncertain dispatch',t=>{
 const f=fixture(t);const p=f.prepare();
 throws(()=>f.call('dispatch',{activity:f.activity,request:p.request}),'HANDOFF_EVALUATION_OPEN');
 f.owner.evaluation++;f.call('dispatch',{activity:f.activity,request:p.request});
 const child=f.start({parentRequest:p.request});
 throws(()=>f.call('accept',{activity:f.activity,request:p.request,inputs:[f.ref],result:{text:'ok'}}),'HANDOFF_CHILD_PENDING');
 f.call('advance',{activity:f.activity,computation:child.id,revision:0,outcome:{type:'done',value:{text:'child synthesis'}}});
 f.restart();
 throws(()=>f.call('pending',{activity:f.activity}),'HANDOFF_EPOCH');
 const a=f.call('open',{id:f.activity.id});
 assert.equal(f.call('status',{activity:a,request:p.request}).status,'dispatch-uncertain');
 throws(()=>f.call('read',{activity:a,computation:p.computation}),'HANDOFF_CODE_MISMATCH');
 f.call('register',{step});
 throws(()=>f.call('accept',{activity:a,request:p.request,inputs:[f.ref],result:{text:'ok'}}),'HANDOFF_DISPATCH_UNCERTAIN');
 f.call('reconcile',{activity:a,request:p.request,decision:'child-reported',child:'codex-child-observed'});
 const args={activity:a,request:p.request,inputs:[f.ref],result:{text:'ok'}};
 const accepted=f.call('accept',args);assert.deepEqual(f.call('accept',args),accepted);
 throws(()=>f.call('accept',{...args,result:{text:'different'}}),'HANDOFF_CONFLICT');
 throws(()=>f.call('accept',{...args,inputs:[{...f.ref,version:'wrong'}]}),'HANDOFF_INPUT_VERSION');
 throws(()=>f.call('accept',{...args,result:{wrong:'bad'}}),'HANDOFF_FIELDS');
 throws(()=>f.call('accept',{...args,result:{text:'a'.repeat(2000)}}),'HANDOFF_BYTES');
 const c=f.call('read',{activity:a,computation:p.computation});assert.equal(c.revision,2);assert.deepEqual(c.result,{text:'ok'});
 f.call('advance',{activity:a,computation:c.id,revision:2,outcome:{type:'done',value:c.result}});
 throws(()=>f.call('advance',{activity:a,computation:c.id,revision:2,outcome:{type:'done',value:c.result}}),'HANDOFF_REVISION');
 assert.deepEqual(f.call('accept',args),accepted);
 assert.equal(readFileSync(join(f.root,'handoff.sqlite')).includes(Buffer.from('private-owner-secret')),false);
});

test('transaction crash injection before/after prepare, dispatch, accept and advance commit',t=>{
 let crash;
 const f=fixture(t,{fault:point=>{if(point===crash)throw Error(point);}});
 const c=f.start();const advance={activity:f.activity,computation:c.id,revision:0,outcome};
 crash='advance:before-commit';assert.throws(()=>f.call('advance',advance));crash=null;assert.equal(f.call('pending',{activity:f.activity}).total,0);
 crash='advance:after-commit';assert.throws(()=>f.call('advance',advance));crash=null;
 const p=f.call('pending',{activity:f.activity}).items[0];f.owner.evaluation++;
 crash='dispatch:before-commit';assert.throws(()=>f.call('dispatch',{activity:f.activity,request:p.id}));crash=null;assert.equal(f.call('status',{activity:f.activity,request:p.id}).status,'prepared');
 crash='dispatch:after-commit';assert.throws(()=>f.call('dispatch',{activity:f.activity,request:p.id}));crash=null;
 const a={activity:f.activity,request:p.id,inputs:[f.ref],result:{text:'synthesis'}};
 crash='accept:before-commit';assert.throws(()=>f.call('accept',a));crash=null;assert.equal(f.call('read',{activity:f.activity,computation:c.id}).revision,1);
 crash='accept:after-commit';assert.throws(()=>f.call('accept',a));crash=null;const accepted=f.call('accept',a);assert.equal(accepted.continuationRevision,2);
 const done={activity:f.activity,computation:c.id,revision:2,outcome:{type:'done',value:'complete'}};
 crash='advance:before-commit';assert.throws(()=>f.call('advance',done));crash=null;assert.equal(f.call('read',{activity:f.activity,computation:c.id}).status,'ready');
 crash='advance:after-commit';assert.throws(()=>f.call('advance',done));crash=null;assert.equal(f.call('read',{activity:f.activity,computation:c.id}).status,'complete');
});

test('scope isolation, explicitly selected shared references, pins, removal and cancellation',t=>{
 const f=fixture(t),other=f.call('open',{label:'history'});
 assert.equal(f.call('list',{activity:other}).total,0);
 throws(()=>f.call('load',{activity:other,ref:f.ref}),'HANDOFF_INPUT_SCOPE');
 const shared=f.call('open',{id:other.id,shared:[f.ref]});assert.deepEqual(f.call('load',{activity:shared,ref:f.ref}),snapshot);
 const p=f.prepare(),child=f.start({parentRequest:p.request});
 throws(()=>f.call('status',{activity:other,request:p.request}),'HANDOFF_SCOPE');
 throws(()=>f.call('remove',{activity:f.activity,ref:f.ref}),'HANDOFF_INPUT_PINNED');
 throws(()=>f.call('removeActivity',{activity:f.activity}),'HANDOFF_PENDING');
 f.call('cancel',{activity:f.activity,request:p.request});assert.equal(f.call('read',{activity:f.activity,computation:child.id}).status,'cancelled');
 throws(()=>f.call('accept',{activity:f.activity,request:p.request,inputs:[f.ref],result:{text:'late'}}),'HANDOFF_CANCELLED');
 f.call('removeActivity',{activity:f.activity});assert.equal(f.call('activities').total,1);
 throws(()=>f.call('open',{id:'__proto__'}),'HANDOFF_SCOPE');
});

test('bounds, code mismatches, retention and protocol depth derived from parent identity',t=>{
 const f=fixture(t),a=f.call('open',{label:'bounded',budgets:{maxDepth:0,maxCalls:1,maxPending:1}});
 const c=f.call('start',{activity:a,step,state:{},inputs:[]});
 const p=f.call('advance',{activity:a,computation:c.id,revision:0,outcome});
 throws(()=>f.call('start',{activity:a,step,state:{},inputs:[],parentRequest:p.request}),'HANDOFF_BUDGET');
 throws(()=>f.call('start',{activity:a,step,state:{},inputs:[],depth:0}),'HANDOFF_FIELDS');
 const c2=f.call('start',{activity:a,step,state:{},inputs:[]});
 throws(()=>f.call('advance',{activity:a,computation:c2.id,revision:0,outcome}),'HANDOFF_BUDGET');
 throws(()=>f.call('register',{step:{...step,digest:'b'.repeat(64)}}),'HANDOFF_CODE_MISMATCH');
 throws(()=>f.call('save',{activity:a,snapshot:{...snapshot,items:'a'.repeat(150000)}}),'HANDOFF_BYTES');
 throws(()=>f.call('pending',{activity:a,limit:100}),'HANDOFF_BOUNDS');
 f.store.dropOwner(f.owner);throws(()=>f.call('list',{activity:a}),'HANDOFF_EPOCH');
});

test('JSON and RDF validation reject coercion, getters, malformed terms and format corruption',t=>{
 const f=fixture(t);let touched=false;
 throws(()=>jsonCopy({get bad(){touched=true;return 1;}}),'HANDOFF_JSON');assert.equal(touched,false);
 for(const v of [undefined,NaN,()=>{},new Date(),[,1]])throws(()=>jsonCopy(v),'HANDOFF_JSON');
 const n=value=>({termType:'NamedNode',value});const q=[n('urn:s'),n('urn:p'),{termType:'Literal',value:'bonjour',language:'fr',datatype:'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'},n('urn:g')];
 const rdf={format:1,kind:'rdf',semantics:'sequence',items:[q,q],metadata:{kind:'instance-data'}};
 const r=f.call('save',{activity:f.activity,snapshot:rdf});assert.deepEqual(f.call('load',{activity:f.activity,ref:r}),rdf);
 throws(()=>f.call('save',{activity:f.activity,snapshot:{...rdf,semantics:'set'}}),'HANDOFF_RDF_SET');
 throws(()=>f.call('save',{activity:f.activity,snapshot:{...rdf,items:[[q[0],q[2],q[1],q[3]]]}}),'HANDOFF_RDF');
 throws(()=>f.call('save',{activity:f.activity,snapshot:{...snapshot,format:2}}),'HANDOFF_FORMAT');
 const db=new DatabaseSync(join(f.root,'handoff.sqlite'));db.exec("UPDATE ledger SET sha='corrupt'");db.close();
 throws(()=>f.call('list',{activity:f.activity}),'HANDOFF_INTEGRITY');
});

test('root confinement, quotas and concurrent independent connections accept only once',async t=>{
 const root=mkdtempSync(join(tmpdir(),'handoff-root-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const link=join(root,'link');mkdirSync(join(root,'real'),{mode:0o700});symlinkSync(join(root,'real'),link);
 throws(()=>new HandoffStore({root:link}),'HANDOFF_ROOT');
 throws(()=>new HandoffStore({root:join(root,'real'),deniedRoots:[root]}),'HANDOFF_ROOT_READABLE_BY_CHILD');
 const f=fixture(t,{maxBytes:4096});throws(()=>f.call('save',{activity:f.activity,snapshot:{...snapshot,items:'x'.repeat(5000)}}),'HANDOFF_QUOTA');assert.equal(f.call('list',{activity:f.activity}).total,1);
 const g=fixture(t);const p=g.prepare();g.owner.evaluation++;g.call('dispatch',{activity:g.activity,request:p.request});
 const second=new HandoffStore({root:g.root});t.after(()=>second.close());const owner={token:'second',epoch:1,evaluation:1};const a=second.call('open',{id:g.activity.id},owner);
 // Dispatch remains owned by its originating host; reconcile on the other connection.
 second.call('reconcile',{activity:a,request:p.request,decision:'child-reported',child:'child-1'},owner);
 const args={request:p.request,inputs:[g.ref],result:{text:'same'}};
 const result=second.call('accept',{activity:a,...args},owner);
 const results=await Promise.all(Array.from({length:12},()=>Promise.resolve().then(()=>g.call('accept',{activity:g.activity,...args}))));
 assert.ok(results.every(r=>r.id===result.id));
});

test('real host SIGKILL around prepare/dispatch/accept/advance recovers atomic durable state',async t=>{
 const {spawnSync}=await import('node:child_process');
 const fixturePath=new URL('./fixtures/handoff-crash.mjs',import.meta.url);
 const f=fixture(t),c=f.start();
 const launch=(operation,args,crash)=>spawnSync(process.execPath,[fixturePath.pathname,JSON.stringify({root:f.root,activity:f.activity.id,step,operation,args,crash})],{encoding:'utf8'});
 const advance={computation:c.id,revision:0,outcome};
 assert.equal(launch('advance',advance,'advance:before-commit').signal,'SIGKILL');assert.equal(f.call('pending',{activity:f.activity}).total,0);
 assert.equal(launch('advance',advance,'advance:after-commit').signal,'SIGKILL');const request=f.call('pending',{activity:f.activity}).items[0].id;
 assert.equal(launch('dispatch',{request},'dispatch:before-commit').signal,'SIGKILL');assert.equal(f.call('status',{activity:f.activity,request}).status,'prepared');
 assert.equal(launch('dispatch',{request},'dispatch:after-commit').signal,'SIGKILL');assert.equal(f.call('status',{activity:f.activity,request}).status,'dispatch-uncertain');
 f.call('reconcile',{activity:f.activity,request,decision:'child-reported',child:'known-child'});
 // Each crashed process explicitly reconciles before accepting, never respawns.
 const runAccept=crash=>{
   const code=`import {HandoffStore} from ${JSON.stringify(new URL('../src/handoff-store.mjs',import.meta.url).href)};
   const s=new HandoffStore({root:${JSON.stringify(f.root)},fault:p=>{if(p===${JSON.stringify(crash)})process.kill(process.pid,'SIGKILL')}}),o={token:'physical',epoch:1,evaluation:1};
   const a=s.call('open',{id:${JSON.stringify(f.activity.id)}},o);
   s.call('reconcile',{activity:a,request:${JSON.stringify(request)},decision:'child-reported',child:'known-child'},o);
   s.call('accept',{activity:a,request:${JSON.stringify(request)},inputs:${JSON.stringify([f.ref])},result:{text:'recovered'}},o);s.close();`;
   return spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
 };
 assert.equal(runAccept('accept:before-commit').signal,'SIGKILL');assert.equal(f.call('read',{activity:f.activity,computation:c.id}).revision,1);
 assert.equal(runAccept('accept:after-commit').signal,'SIGKILL');assert.equal(f.call('read',{activity:f.activity,computation:c.id}).revision,2);
 const done={computation:c.id,revision:2,outcome:{type:'done',value:{answer:'recovered'}}};
 assert.equal(launch('advance',done,'advance:before-commit').signal,'SIGKILL');assert.equal(f.call('read',{activity:f.activity,computation:c.id}).status,'ready');
 assert.equal(launch('advance',done,'advance:after-commit').signal,'SIGKILL');assert.equal(f.call('read',{activity:f.activity,computation:c.id}).status,'complete');
});

test('cancelling an ancestor preserves already accepted descendant receipts',t=>{
 const f=fixture(t),p=f.prepare();
 const child=f.start({parentRequest:p.request});const y=f.call('advance',{activity:f.activity,computation:child.id,revision:0,outcome});
 f.owner.evaluation++;f.call('dispatch',{activity:f.activity,request:y.request});
 const args={activity:f.activity,request:y.request,inputs:[f.ref],result:{text:'accepted child'}};
 const receipt=f.call('accept',args);
 f.call('cancel',{activity:f.activity,request:p.request});
 assert.deepEqual(f.call('accept',args),receipt);
 assert.equal(f.call('read',{activity:f.activity,computation:child.id}).status,'cancelled');
});

test('reopening an activity excludes previously selected historical shared versions',t=>{
 const f=fixture(t),other=f.call('open',{label:'other',shared:[f.ref]});
 const c=f.call('start',{activity:other,step,state:{},inputs:[f.ref]});
 const reopened=f.call('open',{id:other.id});
 throws(()=>f.call('read',{activity:reopened,computation:c.id}),'HANDOFF_INPUT_SCOPE');
 throws(()=>f.call('removeActivity',{activity:f.activity}),'HANDOFF_INPUT_PINNED');
 f.call('removeActivity',{activity:other});f.call('removeActivity',{activity:f.activity});
 assert.equal(f.call('activities').total,0);
});

test('true multiprocess first-accept contention commits one receipt and every identical retry recovers it',async t=>{
 const {fork}=await import('node:child_process');const {once}=await import('node:events');
 const f=fixture(t),p=f.prepare();f.owner.evaluation++;f.call('dispatch',{activity:f.activity,request:p.request});
 const children=[];
 t.after(async()=>{for(const child of children)if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}});
 for(let i=0;i<4;i++) {
   const child=fork(new URL('./fixtures/handoff-contender.mjs',import.meta.url),[JSON.stringify({root:f.root,activity:f.activity.id,request:p.request,inputs:[f.ref],result:{text:'concurrent identical synthesis'}})],{stdio:['ignore','ignore','pipe','ipc']});
   children.push(child);assert.equal((await once(child,'message'))[0].ready,true);
 }
 const first=children.map(child=>once(child,'message'));for(const child of children)child.send('accept');
 const firstResults=(await Promise.all(first)).map(([r])=>r);
 const accepted=firstResults.find(r=>r.receipt)?.receipt;assert.ok(accepted);
 assert.ok(firstResults.every(r=>r.receipt?.id===accepted.id||r.error==='HANDOFF_DISPATCH_UNCERTAIN'));
 const retry=children.map(child=>once(child,'message'));for(const child of children)child.send('retry');
 assert.ok((await Promise.all(retry)).every(([r])=>r.receipt?.id===accepted.id));
 assert.equal(f.call('read',{activity:f.activity,computation:p.computation}).revision,2);
 for(const child of children){const exited=once(child,'exit');child.send('close');await exited;}
});

test('storage preflights roots/sidecars/physical size and rejects corrupt envelopes before loading',async t=>{
 const {existsSync,writeFileSync}=await import('node:fs');const {digest}=await import('../src/handoff-values.mjs');
 const root=mkdtempSync(join(tmpdir(),'handoff-hostile-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 throws(()=>new HandoffStore({root:join(root,'new'),deniedRoots:[root]}),'HANDOFF_ROOT_READABLE_BY_CHILD');assert.equal(existsSync(join(root,'new')),false);
 const target=join(root,'outside');writeFileSync(target,'unchanged');symlinkSync(target,join(root,'handoff.sqlite-journal'));
 throws(()=>new HandoffStore({root}),'HANDOFF_ROOT');assert.equal(readFileSync(target,'utf8'),'unchanged');rmSync(join(root,'handoff.sqlite-journal'));
 writeFileSync(join(root,'handoff.sqlite'),Buffer.alloc(300000));throws(()=>new HandoffStore({root,maxBytes:4096}),'HANDOFF_QUOTA');
 const f=fixture(t);const db=new DatabaseSync(join(f.root,'handoff.sqlite'));
 const malformed=JSON.stringify({format:1,activities:[],data:{},computations:{},requests:{}});db.prepare('UPDATE ledger SET payload=?,sha=?').run(malformed,digest(malformed));db.close();
 throws(()=>f.call('activities'),'HANDOFF_FORMAT');
});

test('pending request reserves terminal commit space against later data saves',t=>{
 for(const finish of ['accept','cancel']) {
   const f=fixture(t,{maxBytes:8192}),p=f.prepare();f.owner.evaluation++;f.call('dispatch',{activity:f.activity,request:p.request});
   let exhausted=false;
   for(let i=0;i<20;i++) {try{f.call('save',{activity:f.activity,snapshot:{...snapshot,items:'x'.repeat(800)}});}catch(error){assert.equal(error.code,'HANDOFF_QUOTA');exhausted=true;break;}}
   assert.equal(exhausted,true);
   if(finish==='accept')assert.equal(f.call('accept',{activity:f.activity,request:p.request,inputs:[f.ref],result:{text:'x'.repeat(900)}}).continuationRevision,2);
   else assert.equal(f.call('cancel',{activity:f.activity,request:p.request}).status,'cancelled');
 }
});

test('startup waits for a bounded existing SQLite exclusive writer before querying schema',async t=>{
 const {fork}=await import('node:child_process');const {once}=await import('node:events');
 const f=fixture(t);f.store.db.exec('BEGIN EXCLUSIVE');
 const child=fork(new URL('./fixtures/handoff-open.mjs',import.meta.url),[f.root],{stdio:['ignore','ignore','pipe','ipc']});
 const exited=once(child,'exit');
 t.after(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill();});
 assert.equal((await once(child,'message'))[0].starting,true);
 const opened=once(child,'message');
 await new Promise(resolve=>setTimeout(resolve,150));f.store.db.exec('COMMIT');
 assert.deepEqual((await opened)[0],{opened:true});await exited;
});
