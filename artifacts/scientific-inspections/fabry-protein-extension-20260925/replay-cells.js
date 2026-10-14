// Execute cells in the project cleanroom_node_repl, not as a shell script.
// Replay creates fresh workspaces; it does not reset earlier sessions.
var fgWs=linkedScience.open({contextKey:'fabry-protein-replay-source'});
var fxFs=await import('node:fs/promises');
var fgGraphs={disease:await fgWs.graphs.load({name:'fabry-replay-source',kind:'instance-data',text:await fxFs.readFile('/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/scientific-inspections/fabry-full-graph-20260925/fabry-generated.ttl','utf8')})};
var fxWs=linkedScience.open({contextKey:'fabry-protein-replay-extension'});
var fxStartQuery="PREFIX dm: <https://w3id.org/monarch-initiative/dismech/> SELECT DISTINCT ?id ?type ?label WHERE { ?id a ?type . FILTER(isIRI(?id) && (CONTAINS(STR(?id),\"HGNC\") || CONTAINS(STR(?id),\"uniprot\") || CONTAINS(STR(?id),\"CHEBI_\") || CONTAINS(STR(?id),\"GO_\"))) OPTIONAL { ?id dm:label ?label } }";
var fxStart=await fgWs.query.run({sources:[fgGraphs.disease],sparql:fxStartQuery});
var fxStartPage=await fgWs.results.page(fxStart,{limit:10});

// CELL 1
var fxRows=[];for(var off=0;off<fxStartPage.total;off+=10)fxRows.push(...(await fgWs.results.page(fxStart,{offset:off,limit:10})).rows);nodeRepl.write(fxRows.map(x=>({id:x.id.value,label:x.label?.value})));var fxGeneRows=fxRows.filter(x=>/hgnc/i.test(x.id.value));var fxRelationshipQuery='PREFIX dm: <https://w3id.org/monarch-initiative/dismech/> SELECT ?owner ?slot ?descriptor ?gene WHERE { ?owner ?slot ?descriptor . ?descriptor dm:term ?gene . FILTER(CONTAINS(LCASE(STR(?gene)),"hgnc")) }';var fxRel=await fgWs.query.run({sources:[fgGraphs.disease],sparql:fxRelationshipQuery});var fxRelPage=await fgWs.results.page(fxRel,{limit:10});nodeRepl.write({relationships:fxRelPage.rows});var fxResources={},fxArtifacts={},fxData={},fxOps=[];var fxGet=async function(k,url,accept='application/json'){var op={key:k,url,accept,kind:'API/resource GET'};fxOps.push(op);try{var r=await fxWs.resources.get(url,{storage:'disk',headers:{accept},maxBytes:2000000,timeoutMs:20000});fxResources[k]=r;fxArtifacts[k]=await r.materialize({name:k+'.txt',authorized:true});op.status='success';return r;}catch(e){op.status='failed';op.error={code:e.code,message:e.message,receipt:e.receipt};throw e}};

// RECONSTRUCTED REPLAY RECIPE from durable queries/operation records; not a verbatim transcript.
var fxReplayCheckpoint="/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/scientific-inspections/fabry-protein-extension-20260925/checkpoint.json";
var fxSaved=JSON.parse(await fxFs.readFile(fxReplayCheckpoint,'utf8'));
var fxReplayOps=JSON.parse(await fxFs.readFile(new URL('./operations.json','file://'+fxReplayCheckpoint),'utf8'));
// Live API replay: each failed route is recorded and the next operation continues.
for(var op of fxReplayOps){try{await fxGet(op.key,op.url,op.accept);}catch(e){nodeRepl.write({key:op.key,error:e.code});}}
// Source service documentation has been retrieved by the preceding operations.
var fxRemote=await fxWs.traversal.query({sources:[{type:'sparql',value:'https://sparql.uniprot.org/sparql'}],sparql:fxSaved.remote.query});
// Local replay uses the captured protein RDF for stable join inputs.
var fxLocalProtein=await fgWs.graphs.load({name:'fabry-replay-protein',kind:'instance-data',text:await fxFs.readFile(fxSaved.artifacts.proteinRdf.path,'utf8')});
var fxJoin=await fgWs.query.run({sources:[fgGraphs.disease,fxLocalProtein],sparql:fxSaved.localJoin.query});
var fxShared=await fgWs.query.run({sources:[fgGraphs.disease,fxLocalProtein],sparql:fxSaved.sharedGO.query});
