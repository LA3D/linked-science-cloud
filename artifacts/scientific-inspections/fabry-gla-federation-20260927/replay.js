// Execute as one cell in the actual project cleanroom_node_repl.
var fabryDemoWs=linkedScience.open({contextKey:'fabry-gla-opening-demo'});
var fabryDemoFs=await import('node:fs/promises');
var fabryDemoBase="/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/scientific-inspections/fabry-gla-federation-20260927";
var fabryDemoQuery=(await fabryDemoFs.readFile(fabryDemoBase+'/query.rq','utf8')).trimEnd();
var fabryDemoStart=Date.now();
var fabryDemoData, fabryDemoMode, fabryDemoFailure;
try {
  var fabryDemoResource=await fabryDemoWs.resources.get(
    'https://sparql.uniprot.org/sparql?query='+encodeURIComponent(fabryDemoQuery)+'&format=json',
    {storage:'disk',headers:{accept:'application/sparql-results+json'},timeoutMs:45000,maxBytes:10000000});
  fabryDemoData=await fabryDemoResource.json();fabryDemoMode='LIVE UNIPROT–RHEA FEDERATION';
} catch(e) {
  fabryDemoFailure={code:e.code,message:e.message,receipt:e.receipt};
  fabryDemoData=JSON.parse(await fabryDemoFs.readFile(fabryDemoBase+'/saved-result.json','utf8'));
  fabryDemoMode='SAVED FALLBACK — 2026-09-27; live attempt failed';
}
var fabryDemoRows=fabryDemoData.results.bindings;
nodeRepl.write({mode:fabryDemoMode,elapsedMs:Date.now()-fabryDemoStart,count:fabryDemoRows.length,
  error:fabryDemoFailure?{code:fabryDemoFailure.code,message:fabryDemoFailure.message}:undefined,
  rows:fabryDemoRows.map(r=>({reaction:r.reaction.value.split('/').pop(),direction:r.physiologicalReaction.value.split('/').pop(),role:r.role.value.split('/').pop(),chebi:r.chebi.value.split('/').pop(),name:r.chemicalName?.value}))});
// Full raw resource/result remains retained; failure receipts remain in fabryDemoFailure.
