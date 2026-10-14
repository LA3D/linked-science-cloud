import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectTrajectory, trajectoryView, importTrajectory } from '../../lib/wiki-learning/trajectory-import.mjs';
import { inspectCorpusRecord } from '../../lib/wiki-learning/corpus.mjs';
import { sha256 } from '../../lib/wiki-learning/evidence.mjs';

const text = 'Consult the ontology at https://example.org/schema';
const row = payload => ({ type:'response_item',payload:{...payload,internal_chat_message_metadata_passthrough:{turn_id:'turn-1'}} });
const records = () => [
  {type:'session_meta',payload:{id:'task-1'}},
  row({type:'message',id:'user-1',role:'user',content:[{type:'input_text',text:`<realtime_delegation><input>${text}</input></realtime_delegation>`}]}),
  row({type:'reasoning',id:'private',encrypted_content:'not-for-capture'}),
  row({type:'custom_tool_call',id:'call-item',call_id:'call-1',name:'exec',input:'read("https://example.org/schema")'}),
  row({type:'custom_tool_call_output',id:'out-1',call_id:'call-1',output:[{type:'input_text',text:'{"result":"schema retrieved"}'}]}),
  row({type:'message',id:'agent-1',role:'assistant',content:[{type:'output_text',text:'I consulted the definition after your correction.'}]}),
];
const options = () => ({taskId:'task-1',selections:[{itemId:'user-1',excerpt:text},{callId:'call-1'},{itemId:'agent-1',excerpt:'I consulted the definition after your correction.'}]});

test('selected trajectory preserves guidance, call identity and reported outcomes without reasoning',()=>{
  const capture=projectTrajectory(records(),options());
  assert.deepEqual(capture.thread.turns[0].items.map(i=>i.evidenceClass),['quoted-transcript','observed-tool-exchange','reported-claim']);
  assert.doesNotMatch(JSON.stringify(capture),/not-for-capture|encrypted_content/);
  assert.deepEqual(trajectoryView(capture),capture.thread);
  assert.equal(capture.thread.turns[0].items[1].scientificCompletion,'not-inferred');
});

test('wrong task, fabricated excerpts, private selections, missing/duplicate outputs and secrets reject',()=>{
  assert.throws(()=>projectTrajectory(records(),{...options(),taskId:'other'}),/wrong task/);
  assert.throws(()=>projectTrajectory(records(),{...options(),selections:[{itemId:'private',excerpt:'x'}]}),/unsupported/);
  assert.throws(()=>projectTrajectory(records(),{...options(),selections:[{itemId:'user-1',excerpt:'invented'}]}),/excerpt/);
  assert.throws(()=>projectTrajectory(records().filter(r=>r.payload?.id!=='out-1'),options()),/call\/output/);
  const dup=records();dup.push(dup[4]);assert.throws(()=>projectTrajectory(dup,options()),/call\/output/);
  const privateMessage=records();privateMessage[5].payload.channel='analysis';assert.throws(()=>projectTrajectory(privateMessage,options()),/private reasoning/);
  const sensitive=records();sensitive[3].payload.input='password=veryprivate';assert.throws(()=>projectTrajectory(sensitive,options()),/secret/);
  const crossed=records();crossed[4].payload.internal_chat_message_metadata_passthrough.turn_id='other';assert.throws(()=>projectTrajectory(crossed,options()),/cross-turn/);
});

test('local importer refuses overwrite, symlink destinations and incomplete history',async t=>{
  const root=await mkdtemp(join(tmpdir(),'trajectory-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const sourcePath=join(root,'rollout.jsonl');await writeFile(sourcePath,records().map(r=>JSON.stringify(r)).join('\n')+'\n');
  const args={...options(),sourcePath,root,destination:'artifacts/wiki-learning/episodes/test'};
  assert.ok((await importTrajectory(args)).sha256);
  await assert.rejects(importTrajectory(args),/EEXIST/);
  await symlink(join(root,'artifacts/wiki-learning/episodes/test'),join(root,'artifacts/wiki-learning/episodes/link'));
  await assert.rejects(importTrajectory({...args,destination:'artifacts/wiki-learning/episodes/link'}),/unsafe/);
  await writeFile(sourcePath,'{"unfinished":');await assert.rejects(importTrajectory({...args,destination:'artifacts/wiki-learning/episodes/partial'}),SyntaxError);
});

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'trajectory-corpus-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const save=async(path,value)=>{const bytes=JSON.stringify(value,null,2)+'\n';await writeFile(join(root,path),bytes);return{path,sha256:sha256(bytes),hashDomain:'file-bytes',pointer:''};};
  const capture=projectTrajectory(records(),options());const ref=await save('trajectory.json',capture);
  const episode={schemaVersion:'1.2.0',id:'trajectory-test',host:{hostId:'local',taskId:'task-1',version:'selected-rollout',observableEvents:ref,memory:{use:'unknown',generation:'unknown',basis:'not inspected'}},capture:{kind:'selected-trajectory',completeness:'partial',gaps:['selected only']},runtime:{projectId:'@linked-science/runtime',version:'not-observed',sessionState:'not-observed'},skillBaseline:{manifestPath:'baseline.json',digest:'0'.repeat(64),discovery:'not-observed',loading:'not-observed'},events:capture.thread.turns[0].items.map((item,i)=>({id:`event-${i}`,turnId:'turn-1',itemId:item.id,kind:item.type,sequence:i,objectiveIds:['science']})),objectives:[{schemaVersion:'1.0.0',id:'science',previousId:null,eventId:'event-0',statement:'Interpret scientific source schema',acceptance:['Consult source definitions']}],evidence:[{schemaVersion:'1.0.0',id:'trajectory',kind:'durable-artifact',description:'Selected process evidence',artifact:ref,historicalHandle:null,source:{identity:'codex-task:task-1',revision:ref.sha256,representation:'selected trajectory'},completion:'partial',missingEvidence:['No scientific result proof']}],joins:[],outcomes:[{schemaVersion:'1.0.0',id:'outcome',objectiveId:'science',kind:'agent-judgment',status:'partial',claim:'User-guided process',evidenceIds:['trajectory'],missingEvidence:['No independent outcome verification']}]};
  const witness=(eventId,kind)=>({eventId,kind,exchange:ref,outputIndex:0,key:''});
  const corpus={schemaVersion:'1.1.0',id:'trajectory-corpus-test',episode:await save('episode.json',episode),review:{classification:'scientific',basis:'Scientific schema interpretation with user guidance',scientificObjectiveIds:['science'],excludedObjectiveIds:[]},units:[{id:'procedure',objectiveId:'science',anchors:['https://example.org/schema'],actionWitnesses:[witness('event-0','user-guidance'),witness('event-1','tool-exchange')],outcomeWitness:witness('event-2','agent-report'),outcome:'partial',lessonKind:'procedure',evidenceBasis:'trajectory-procedure',claim:'Consult source definitions after a correction',scope:'Observed process only',sourceEvidenceIds:['trajectory'],freshness:{asOf:'2026-09-23',revalidateWhen:'New source'},validation:'candidate-not-generalized',missingEvidence:['No causal benefit established']}]};
  return {root,save,episode,corpus,capture};
}

test('scientific conversation plus observed action qualifies a proposed procedure with explicit limitations',async t=>{
  const f=await fixture(t),result=await inspectCorpusRecord(f.corpus,{root:f.root});
  assert.equal(result.units[0].evidenceStatus,'observed-within-scope');assert.equal(result.units[0].scope,'observed-process-not-scientific-truth');
  assert.equal(result.units[0].outcome,'partial');assert.ok(result.units[0].limitations.length);
});

test('trajectory gate rejects scientific findings, guidance-as-tool, invented anchors and engineering scope',async t=>{
  const f=await fixture(t);
  for(const [change,pattern] of [
    [c=>{c.units[0].lessonKind='scientific-finding';},/scientific finding/],
    [c=>{c.units[0].actionWitnesses[0].kind='tool-exchange';},/laundering/],
    [c=>{c.units[0].anchors=['https://invented.org'];},/anchors/],
  ]) {const c=structuredClone(f.corpus);change(c);await assert.rejects(inspectCorpusRecord(c,{root:f.root}),pattern);}
  const engineering=structuredClone(f.corpus);engineering.review.classification='engineering';assert.equal((await inspectCorpusRecord(engineering,{root:f.root})).eligible,false);
});

test('rehashed altered projection and missing selected source cannot establish a trajectory',async t=>{
  const f=await fixture(t);f.capture.thread.turns[0].items[0].text='fabricated';
  f.episode.host.observableEvents=await f.save('trajectory.json',f.capture);f.corpus.episode=await f.save('episode.json',f.episode);
  await assert.rejects(inspectCorpusRecord(f.corpus,{root:f.root}),/altered trajectory/);
  await rm(join(f.root,'trajectory.json'));assert.equal((await inspectCorpusRecord(f.corpus,{root:f.root})).eligible,false);
});
