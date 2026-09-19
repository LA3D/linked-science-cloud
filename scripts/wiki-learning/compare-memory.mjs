// Offline mechanical comparison of known seed relevance, not a model benefit trial.
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {searchMemory,readMemory,recordFeedback} from '../../lib/wiki-learning/retrieval.mjs';
import {sha256} from '../../lib/wiki-learning/evidence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const cases=[
 {query:'completed query display limit',expected:'retained-query-after-display-limit'},
 {query:'asserted GO overlap UniProt',expected:'hemoglobin-go-overlap-20260919'},
 {query:'lung fibrosis imaging',expected:null},
];
const results=[];
for(const item of cases) {
 const on=await searchMemory({root,query:item.query});
 const off=await searchMemory({root,query:item.query,mode:'off'});
 let read=null,feedback=null;
 if(on.candidates[0]) {
   read=await readMemory({root,receiptPath:on.receiptPath,patternId:on.candidates[0].id});
   feedback=await recordFeedback({root,receiptPath:on.receiptPath,feedback:{assessment:'unknown',note:'Offline retrieval mechanics only; no scientific benefit measured.',evidence:[]}});
 }
 results.push({query:item.query,expected:item.expected,on,off,readReceipt:read?.receiptPath??null,
   readSha256:read?sha256(JSON.stringify(read.pattern)):null,feedbackReceipt:feedback?.receiptPath??null,
   pass:on.status==='available'&&(on.candidates[0]?.id??null)===item.expected&&off.status==='disabled'&&off.candidates.length===0&&Buffer.byteLength(JSON.stringify(on))<=4096});
}
const id=`memory-retrieval-${randomUUID()}`;
const record={format:'linked-science-memory-retrieval-comparison/v1',id,recordedAt:new Date().toISOString(),
 outcome:results.every(r=>r.pass)?'passed':'failed',scope:'offline-known-seed-relevance-and-delivery-only',
 method:'Three fixed term queries; paired on/off retrieval, selected reads, explicit unknown feedback. Same assistant, no independent scientific tasks.',
 modelBenefit:'not-measured',results};
const directory=`artifacts/wiki-learning/retrieval-evaluation/${id}`;
await mkdir(root+directory,{recursive:true});
await writeFile(root+directory+'/results.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({id,path:directory+'/results.json',outcome:record.outcome,cases:results.length,modelBenefit:record.modelBenefit}));
if(record.outcome!=='passed')process.exitCode=1;
