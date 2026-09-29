import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoffRuntime } from '../src/handoff-runtime.mjs';
import { registerRecoveryAdapter } from '../src/private-linked-science-recovery.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture({deferGrant=false,releaseFailure=false,revokeFailure=false}={}) {
  const ready=deferred(),gate=deferred(),revoked=[],unpublished=[],released=[],grants=[];
  const states=new Map([['r-a','dispatch-intent'],['r-b','dispatch-intent']]);
  const activities={idA:{id:'a',epoch:'e-a'},idB:{id:'b',epoch:'e-b'}};
  let seq=0,failed=false;
  const workspace={release:async handle=>{
    if(releaseFailure&&handle===2&&!failed){failed=true;throw Error('one transient release failure');}
    if(released.includes(handle))throw Object.assign(Error(),{code:'LS_RELEASED_HANDLE'});
    released.push(handle);
  }};
  registerRecoveryAdapter(workspace,{restore:()=>++seq});
  const refs=[{id:'one',version:'1'},{id:'two',version:'2'}];
  const call=async(operation,args)=>{
    const request=args.request;
    if(request&&((request==='r-a'&&args.activity.id!=='a')||(request==='r-b'&&args.activity.id!=='b')))throw Object.assign(Error(),{code:'HANDOFF_SCOPE'});
    if(operation==='status')return {id:request,status:states.get(request),inputs:refs};
    if(operation==='load')return {kind:'rdf',items:[]};
    if(operation==='accept') {states.set(request,'accepted');return {id:`receipt-${request}`};}
    if(operation==='cancel') {states.set(request,'cancelled');return {id:request,status:'cancelled'};}
    throw Error(operation);
  };
  const api=createHandoffRuntime({call,scientificSession:{
    publish:(_ws,handle)=>({object:`o-${handle}`}),
    unpublish:ref=>unpublished.push(ref.object),
    grant:async()=>{ready.resolve();if(deferGrant)await gate.promise;const grant={capability:`g-${grants.length}`};grants.push(grant);return grant;},
    revoke:async({capability})=>{if(revokeFailure&&!failed){failed=true;throw Error('one transient revocation failure');}revoked.push(capability);},
  }});
  return {api,workspace,ready,gate,revoked,unpublished,released,grants,refs,...activities};
}
for(const terminal of ['accept','cancel'])test(`${terminal} fences a pending grant and revokes late allocation`,async()=>{
  const f=fixture({deferGrant:true});
  const grant=f.api.grant(f.idA,'r-a',f.workspace);await f.ready.promise;
  const receipt=terminal==='accept'?await f.api.accept(f.idA,'r-a',f.refs,{}):await f.api.cancel(f.idA,'r-a');
  assert.equal(receipt.cleanup,'pending','must not claim pending allocation has already been revoked');
  f.gate.resolve();await assert.rejects(grant,{code:'HANDOFF_STATE'});
  assert.deepEqual(f.revoked,['g-0']);assert.deepEqual(f.released,[1,2]);
  await f.api.cleanup('r-a');
});
test('partial cleanup retries only unreleased resources and concurrent retries serialize',async()=>{
  const f=fixture({releaseFailure:true});await f.api.grant(f.idA,'r-a',f.workspace);
  const receipt=await f.api.accept(f.idA,'r-a',f.refs,{});assert.equal(receipt.cleanup,'pending');
  assert.deepEqual(f.released,[1]);
  await Promise.all([f.api.cleanup('r-a'),f.api.cleanup('r-a')]);
  assert.deepEqual(f.released,[1,2]);assert.deepEqual(f.revoked,['g-0']);assert.deepEqual(f.unpublished,['o-1','o-2']);
});
test('cancelling one activity does not inspect or revoke another activity lease',async()=>{
  const f=fixture();await f.api.grant(f.idA,'r-a',f.workspace);await f.api.grant(f.idB,'r-b',f.workspace);
  const receipt=await f.api.cancel(f.idB,'r-b');assert.equal(receipt.cleanup,'complete');
  assert.deepEqual(f.revoked,['g-1']);assert.deepEqual(f.released,[3,4]);
  await f.api.cleanup('r-a');assert.deepEqual(f.revoked,['g-1','g-0']);
});

test('late grant with failed revocation stays discoverable for cleanup retry',async()=>{
 const f=fixture({deferGrant:true,revokeFailure:true});const grant=f.api.grant(f.idA,'r-a',f.workspace);await f.ready.promise;
 assert.equal((await f.api.accept(f.idA,'r-a',f.refs,{})).cleanup,'pending');f.gate.resolve();
 await assert.rejects(grant,error=>error.code==='HANDOFF_STATE'&&error.cleanup==='pending');
 await f.api.cleanup('r-a');assert.deepEqual(f.revoked,['g-0']);assert.deepEqual(f.released,[1,2]);
});
