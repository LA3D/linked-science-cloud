import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,writeFile,rm,realpath,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {searchMemory,readMemory,recordFeedback,rankPatterns} from '../../lib/wiki-learning/retrieval.mjs';
const repo=new URL('../../',import.meta.url);
async function fixture(t) {
 const root=await realpath(await mkdtemp(join(tmpdir(),'wiki-retrieval-')));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'artifacts/wiki-learning'),{recursive:true});
 for(const dir of ['corpus','scientific','episodes'])await cp(new URL(`artifacts/wiki-learning/${dir}`,repo),join(root,'artifacts/wiki-learning',dir),{recursive:true});
 await cp(new URL('wiki',repo),join(root,'wiki'),{recursive:true});return root;
}

test('selective retrieval gives bounded metadata then cited hypothesis; no unrelated finding body',async t=>{
 const root=await fixture(t);const s=await searchMemory({root,query:'completed query display limit'});
 assert.equal(s.candidates[0].id,'retained-query-after-display-limit');
 assert.ok(Buffer.byteLength(JSON.stringify(s))<=4096);assert.equal(s.candidates[0].claim,undefined);
 const r=await readMemory({root,receiptPath:s.receiptPath,patternId:s.candidates[0].id});
 assert.equal(r.interpretation,'hypothesis-only');assert.equal(r.pattern.status,'proposed');assert.ok(r.pattern.citations.length);
 assert.equal(r.helpfulness,'unknown');assert.ok(!JSON.stringify(r).includes('20 asserted GO identifiers'));
 const feedback=await recordFeedback({root,receiptPath:s.receiptPath,feedback:{assessment:'unknown',note:'Mechanism test only',evidence:[]}});
 assert.deepEqual(feedback.consultedPatternIds,['retained-query-after-display-limit']);
});

test('retrieval-off and unrelated queries expose no advice; off does not require a readable wiki',async t=>{
 const root=await fixture(t);
 assert.deepEqual((await searchMemory({root,query:'lung fibrosis imaging'})).candidates,[]);
 await writeFile(join(root,'wiki/HEAD'),'corrupt');
 const off=await searchMemory({root,query:'completed query display limit',mode:'off'});
 assert.equal(off.status,'disabled');assert.equal(off.revision,null);assert.deepEqual(off.candidates,[]);
 await assert.rejects(readMemory({root,receiptPath:off.receiptPath,patternId:'retained-query-after-display-limit'}),/not selected/);
 assert.equal((await searchMemory({root,query:'display limit'})).status,'unavailable');
});

test('corrupt citations prevent reading selected memory; changed HEAD requires another search',async t=>{
 const root=await fixture(t),s=await searchMemory({root,query:'display limit query'});
 const corpus=join(root,'artifacts/wiki-learning/corpus/ontology-membership.json');const original=await readFile(corpus);
 await writeFile(corpus,Buffer.concat([original,Buffer.from(' ')]));
 await assert.rejects(readMemory({root,receiptPath:s.receiptPath,patternId:s.candidates[0].id}),/hash mismatch/);
 assert.equal((await searchMemory({root,query:'display limit'})).status,'unavailable');
 await writeFile(corpus,original);await rm(join(root,'wiki/HEAD'));
 await assert.rejects(readMemory({root,receiptPath:s.receiptPath,patternId:s.candidates[0].id}),/wiki changed/);
});

test('inactive patterns excluded and ranking is stable; scientific snapshots retain their kind',async t=>{
 const root=await fixture(t),s=await searchMemory({root,query:'asserted GO overlap UniProt'});
 assert.equal(s.candidates[0].lessonKind,'scientific-finding');
 const r=await readMemory({root,receiptPath:s.receiptPath,patternId:s.candidates[0].id});
 const p=r.pattern;
 assert.deepEqual(rankPatterns([{...p,status:'superseded'},{...p,id:'withdrawn',status:'withdrawn'}],'asserted GO overlap'),[]);
 assert.deepEqual(rankPatterns([p],'asserted GO overlap'),rankPatterns([p],'asserted GO overlap'));
});

test('outcome claims require observed read and hashed evidence; feedback never promotes wiki',async t=>{
 const root=await fixture(t),s=await searchMemory({root,query:'display limit query'});
 const before=await readFile(join(root,'wiki/HEAD'),'utf8');
 const f={assessment:'helped',note:'Agent assessment, not measured causality',evidence:[]};
 await assert.rejects(recordFeedback({root,receiptPath:s.receiptPath,feedback:f}),/requires a read/);
 const r=await readMemory({root,receiptPath:s.receiptPath,patternId:s.candidates[0].id});
 f.evidence=[r.pattern.citations[0].corpus];
 assert.equal((await recordFeedback({root,receiptPath:s.receiptPath,feedback:f})).scope,'agent-reported-assessment-not-causal-benefit');
 f.evidence[0]={...f.evidence[0],sha256:'0'.repeat(64)};
 await assert.rejects(recordFeedback({root,receiptPath:s.receiptPath,feedback:f}),/hash mismatch/);
 assert.equal(await readFile(join(root,'wiki/HEAD'),'utf8'),before);
});

test('input bounds, unselected IDs and symlink receipt storage fail closed',async t=>{
 const root=await fixture(t);
 await assert.rejects(searchMemory({root,query:'x'.repeat(1025)}),/1024/);
 await assert.rejects(searchMemory({root,query:'query display',maxItems:6}),/maxItems/);
 const s=await searchMemory({root,query:'query display limit'});
 await assert.rejects(readMemory({root,receiptPath:s.receiptPath,patternId:'invented'}),/not selected/);
 await rm(join(root,'artifacts/wiki-learning/consultations'),{recursive:true});
 await symlink(join(root,'wiki'),join(root,'artifacts/wiki-learning/consultations'));
 await assert.rejects(searchMemory({root,query:'query display'}),/unsafe consultation/);
});

test('retrieval skill has its own complete baseline while the historical baseline stays intact',async()=>{
 const {describeSkillBaseline,verifySkillBaseline}=await import('../../lib/wiki-learning/baseline.mjs');
 const {fileURLToPath}=await import('node:url');const root=fileURLToPath(repo);
 const current=await describeSkillBaseline(root);
 const saved=await verifySkillBaseline({root,destination:'artifacts/wiki-learning/baselines/repl-20260919-retrieval'});
 assert.equal(current.digest,saved.digest);
 assert.ok(current.files.some(f=>f.path.endsWith('references/scientific-memory.md')));
 const old=await verifySkillBaseline({root,destination:'artifacts/wiki-learning/baselines/repl-20260919-phase0'});
 assert.notEqual(old.digest,current.digest);
});
