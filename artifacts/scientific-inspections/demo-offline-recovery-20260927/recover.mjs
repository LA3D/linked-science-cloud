// Offline only. Pass the already mounted facade and its verified project root.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export async function recover(linkedScience,root) {
 const runId='demo-offline-'+randomUUID();
 const inputs=[];
 async function read(path,expected) {
  const bytes=await readFile(join(root,path));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(expected&&sha256!==expected)throw new Error('Saved input hash mismatch: '+path);
  inputs.push({path,bytes:bytes.length,sha256,priorHashVerified:!!expected});
  return bytes.toString('utf8');
 }
 const base='artifacts/scientific-inspections/';
 const gsdReceipt=JSON.parse(await read(base+'sai-gsd3-20260925/receipt.json'));
 const gsdBytes={};
 for(const [key,a] of Object.entries(gsdReceipt.artifacts)) {
  const path='artifacts/'+a.path.split('/artifacts/')[1];
  gsdBytes[key]=await read(path,a.sha256);
 }
 const gsdWs=linkedScience.open({contextKey:runId+'-gsd3'});
 const gsdGraph=await gsdWs.graphs.load({name:'recovered-p35573',kind:'instance-data',text:gsdBytes.uniprotRdf});
 const gsdQuery=gsdReceipt.queries.find(q=>q.name==='local-crossrefs').sparql;
 const gsdResult=await gsdWs.query.run({sources:[gsdGraph],sparql:gsdQuery});
 const gsdPage=await gsdWs.results.page(gsdResult,{limit:10});
 if(gsdPage.total!==7)throw new Error('Unexpected GSD cross-reference count');
 const fb=base+'fabry-full-graph-20260925/';
 const manifest=JSON.parse(await read(fb+'file-manifest.json'));
 const fabryWs=linkedScience.open({contextKey:runId+'-fabry'});
 const fabryGraphs={};
 for(const [key,file,kind] of [['disease','fabry-generated.ttl','instance-data'],['links','application-links.ttl','instance-data'],['cl','cl-excerpt.ttl','ontology'],['uberon','uberon-excerpt.ttl','ontology']]) {
  fabryGraphs[key]=await fabryWs.graphs.load({name:'recovered-'+key,kind,text:await read(fb+file,manifest[file]?.sha256)});
 }
 const fabryQueries={},fabryResults={},fabryPages={};
 for(const [key,expected] of [['anchor',1],['chain',5],['ontology',4]]) {
  fabryQueries[key]=await read(base+'fabry-renal-literature-20260927/'+key+'.rq');
  fabryResults[key]=await fabryWs.query.run({sources:Object.values(fabryGraphs),sparql:fabryQueries[key]});
  fabryPages[key]=await fabryWs.results.page(fabryResults[key],{limit:10});
  if(fabryPages[key].total!==expected)throw new Error('Unexpected Fabry '+key+' count');
 }
 const federation=JSON.parse(await read(base+'fabry-gla-federation-20260927/saved-result.json'));
 if(federation.results.bindings.length!==8)throw new Error('Unexpected saved federation count');
 const receipt={format:'linked-science-offline-demo-recovery/v1',recordedAt:new Date().toISOString(),runId,mode:'fresh local execution over saved historical source bytes; no remote requests',identity:linkedScience.capabilities().environment,inputs,gsd:{inventory:gsdWs.inventory(),graphProfile:gsdWs.results.profile(gsdGraph),query:gsdQuery,result:gsdPage},fabry:{inventory:fabryWs.inventory(),graphs:Object.fromEntries(Object.entries(fabryGraphs).map(([k,h])=>[k,fabryWs.results.profile(h)])),queries:fabryQueries,results:fabryPages},savedFederation:{count:8,status:'historical saved response; not rerun',rows:federation.results.bindings},limitations:['New workspace epochs and handles, not original kernel restoration.','Saved source dates remain September 25–27, 2026; no current remote freshness claim.','EYE reasoning/proof remain saved historical evidence; not rerun.','Disease causal assertions and model/clinical evidence retain the original handoff qualifications.']};
 return {runId,gsdWs,gsdGraph,gsdResult,gsdPage,gsdBytes,fabryWs,fabryGraphs,fabryQueries,fabryResults,fabryPages,federation,receipt};
}
