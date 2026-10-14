// Run this single cell in the project cleanroom_node_repl.
// It executes real server-side federation; failures explicitly switch to the saved fallback.
var demo49 = linkedScience.open({contextKey:'opening-demo-cholesterol'});
var demo49fs = await import('node:fs/promises');
var demo49base = "/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/scientific-inspections/uniprot-example49-20260927/opening-demo";
var demo49query = await demo49fs.readFile(demo49base+'/query.rq','utf8');
var demo49start = Date.now();
var demo49mode, demo49result, demo49error;
try {
  var demo49resource = await demo49.resources.get(
    'https://sparql.uniprot.org/sparql?query='+encodeURIComponent(demo49query.trimEnd())+'&format=json',
    {storage:'disk',headers:{accept:'application/sparql-results+json'},timeoutMs:45000,maxBytes:10000000}
  );
  demo49result = await demo49resource.json();
  demo49mode = 'LIVE FEDERATION';
} catch(e) {
  demo49error = {code:e.code,message:e.message,receipt:e.receipt};
  demo49result = JSON.parse(await demo49fs.readFile(demo49base+'/saved-result.json','utf8'));
  demo49mode = 'SAVED RESULT — captured 2026-09-27; live attempt failed';
}
var demo49rows = demo49result.results.bindings;
var demo49selected = demo49rows.filter(r=>['P22680','P35610','Q9Y6A2'].includes(r.protein.value.split('/').pop())).slice(0,3);
nodeRepl.write({mode:demo49mode,elapsedMs:Date.now()-demo49start,
  liveError:demo49error?{code:demo49error.code,message:demo49error.message}:undefined,
  completeRowCount:demo49rows.length,uniqueProteins:new Set(demo49rows.map(r=>r.protein.value)).size,
  examples:demo49selected.map(r=>({protein:r.protein.value,reaction:r.reaction.value,gene:r.ensemblGene.value}))
});
// Complete live/saved bindings stay in demo49result; only three rows are displayed.
