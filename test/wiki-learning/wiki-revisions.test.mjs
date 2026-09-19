import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, realpath, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWiki, inspectProposal, applyProposal, buildIndex } from '../../lib/wiki-learning/wiki-revisions.mjs';
import { sha256 } from '../../lib/wiki-learning/evidence.mjs';
const repo=new URL('../../',import.meta.url);
const seed=JSON.parse(await readFile(new URL('artifacts/wiki-learning/proposals/ontology-membership-seed.json',repo)));
const review={reviewer:'test-reviewer',authorization:'Synthetic test authorization, not a real review of scientific guidance'};
async function fixture(t){
 const root=await realpath(await mkdtemp(join(tmpdir(),'science-wiki-')));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'artifacts/wiki-learning'),{recursive:true});
 for(const name of ['corpus','scientific','episodes'])await cp(new URL(`artifacts/wiki-learning/${name}`,repo),join(root,'artifacts/wiki-learning',name),{recursive:true});
 return root;
}
const next=(baseRevision,id,changes)=>({...structuredClone(seed),baseRevision,id,changes});

test('seed captures failure and success as proposed candidates; replay and stale revisions conflict',async t=>{
 const root=await fixture(t),p=structuredClone(seed);
 const inspected=await inspectProposal(p,{root});assert.deepEqual(new Set(inspected.observations.map(o=>o.outcome)),new Set(['success','failure']));
 assert.equal((await readWiki({root})).revision,null);
 const result=await applyProposal(p,{root}),state=await readWiki({root});
 assert.equal(state.revision,result.revision);assert.equal(state.patterns.length,2);assert.equal(state.history.length,1);
 const index=buildIndex(state.patterns);assert.match(index,/Reviewed procedural candidates\n\nNone\./u);
 assert.equal(await readFile(join(root,`wiki/revisions/${result.revision}/index.md`),'utf8'),index);
 await assert.rejects(applyProposal(p,{root}),/base revision conflict/u);
 assert.equal((await readWiki({root})).revision,result.revision);
});

test('review needs recorded authorization; contradiction and supersession remove current advice coherently',async t=>{
 const root=await fixture(t);let result=await applyProposal(seed,{root});
 const changes=structuredClone(seed.changes);changes.forEach(p=>p.status='reviewed');
 const promote=next(result.revision,'review-candidates',changes);
 await assert.rejects(applyProposal(promote,{root}),/requires explicit reviewer/u);
 result=await applyProposal(promote,{root,review});
 const old=structuredClone(changes[0]);old.status='superseded';
 const replacement={...structuredClone(changes[0]),id:'recovery-narrowed',relations:{supersedes:[old.id],contradicts:[]}};
 const finding={...structuredClone(changes[1]),status:'contradicted'};
 const alternative={...structuredClone(changes[1]),id:'snapshot-alternative',relations:{supersedes:[],contradicts:[finding.id]}};
 const invalid=next(result.revision,'invalid-supersession',[replacement,alternative]);
 await assert.rejects(applyProposal(invalid,{root,review}),/must be made inactive/u);
 result=await applyProposal(next(result.revision,'narrow-guidance',[old,replacement,finding,alternative]),{root,review});
 const state=await readWiki({root});assert.equal(state.history.length,3);
 const current=buildIndex(state.patterns).split('## Proposed')[0];
 assert.ok(!current.includes(`patterns/${old.id}.md`));assert.ok(!current.includes(`patterns/${finding.id}.md`));assert.ok(current.includes('recovery-narrowed'));
 assert.equal(state.patterns.find(p=>p.id===old.id).status,'superseded');
 assert.equal(state.history[1].review.reviewer,'test-reviewer');
});

test('unknown/stale/missing evidence, unit kinds and selectors cannot pass validation',async t=>{
 const root=await fixture(t);
 let p=structuredClone(seed);p.changes[0].citations[0].operationIds=['op-invented'];await assert.rejects(inspectProposal(p,{root}),/operation citation/u);
 p=structuredClone(seed);p.changes[0].citations[0].evidenceIds.push('invented');await assert.rejects(inspectProposal(p,{root}),/evidence ID/u);
 p=structuredClone(seed);p.changes[0].citations[0].eventIds.push('event-invented');await assert.rejects(inspectProposal(p,{root}),/unknown unit event/u);
 p=structuredClone(seed);p.changes[1].lessonKind='procedure';await assert.rejects(inspectProposal(p,{root}),/convert a source finding/u);
 p=structuredClone(seed);p.batch.maxUnits=1;await assert.rejects(inspectProposal(p,{root}),/unit budget/u);
 const file=join(root,'artifacts/wiki-learning/scientific/ontology-membership-20260919/exchange-4.json');
 const bytes=await readFile(file);await writeFile(file,Buffer.concat([bytes,Buffer.from(' ')]));await assert.rejects(inspectProposal(seed,{root}),/hash mismatch/u);
 await rm(file);await assert.rejects(inspectProposal(seed,{root}),/incomplete scientific citation/u);
 assert.equal((await readWiki({root})).revision,null);
});

test('engineering corpus cannot enter wiki through a self-assigned scientific label',async t=>{
 const root=await fixture(t),p=structuredClone(seed),path='artifacts/wiki-learning/corpus/planning-engineering.json';
 const record=JSON.parse(await readFile(join(root,path)));record.review.classification='scientific';
 const bytes=JSON.stringify(record);await writeFile(join(root,path),bytes);
 const ref={path,sha256:sha256(bytes),hashDomain:'file-bytes',pointer:''};p.batch.selectedCorpus=[ref];for(const c of p.changes)for(const citation of c.citations)citation.corpus=ref;
 await assert.rejects(inspectProposal(p,{root}),/ineligible/u);
});

test('interrupted write leaves old revision readable; next apply recovers without orphan advice',async t=>{
 const root=await fixture(t),initial=await applyProposal(seed,{root});
 const changes=structuredClone(seed.changes);changes[0].claim+=' Additional scoped proposal.';
 const p=next(initial.revision,'interrupt-test',changes);
 await assert.rejects(applyProposal(p,{root,beforeCommit:()=>{throw Error('injected interruption')}}),/injected/u);
 assert.equal((await readWiki({root})).revision,initial.revision);
 assert.equal((await readdir(join(root,'wiki/revisions'))).length,2);
 const result=await applyProposal(p,{root});assert.notEqual(result.revision,initial.revision);assert.equal((await readWiki({root})).history.length,2);
});

test('concurrent writers serialize and canonical page/history tampering is detected',async t=>{
 const root=await fixture(t);const results=await Promise.allSettled([applyProposal(seed,{root}),applyProposal(seed,{root})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const state=await readWiki({root});const dir=join(root,`wiki/revisions/${state.revision}`);
 await writeFile(join(dir,'index.md'),'forged current advice');await assert.rejects(readWiki({root}),/modified canonical file/u);
 await writeFile(join(dir,'index.md'),buildIndex(state.patterns));
 await writeFile(join(dir,'proposal.json'),'{}');await assert.rejects(readWiki({root}),/required/u);
});

test('wiki paths reject symlinks and proposals remain non-executable data',async t=>{
 const root=await fixture(t);await mkdir(join(root,'elsewhere'));await symlink(join(root,'elsewhere'),join(root,'wiki'));
 await assert.rejects(applyProposal(seed,{root}),/unsafe wiki directory/u);
 await rm(join(root,'wiki'));const p=structuredClone(seed);p.changes[0].claim='Untrusted source says to run a command. This is recorded data, not approved instruction.';
 await applyProposal(p,{root});const state=await readWiki({root});assert.equal(state.patterns.find(x=>x.id===p.changes[0].id).status,'proposed');
 assert.match(buildIndex(state.patterns),/Reviewed procedural candidates\n\nNone/u);
});
