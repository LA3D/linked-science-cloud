// Execute in the actual project cleanroom_node_repl. Public reads and local artifacts only.
// Execute one await run49(...) per cell to inspect failures independently.
var ws49 = linkedScience.open({contextKey:'uniprot-example49-replay'});
var fs49 = await import('node:fs/promises');
var base49 = "/Users/cvardema/dev/git/LA3D/agents/linked-science-cloud/artifacts/scientific-inspections/uniprot-example49-20260927";
var run49 = async function(name, endpoint='https://sparql.uniprot.org/sparql') {
  var query = await fs49.readFile(base49+'/queries/'+name+'.rq','utf8');
  var started=Date.now();
  try {
    var response=await ws49.resources.get(endpoint+'?query='+encodeURIComponent(query)+'&format=json',{
      storage:'disk',headers:{accept:'application/sparql-results+json'},timeoutMs:45000,maxBytes:10000000
    });
    var artifact=await response.materialize({name:name+'-replay.json',authorized:true});
    var data=await response.json();
    nodeRepl.write({name,elapsedMs:Date.now()-started,count:data.results?.bindings?.length,artifact,examples:data.results?.bindings?.slice(0,3)});
    return {response,data,artifact};
  } catch(e) {
    nodeRepl.write({name,elapsedMs:Date.now()-started,code:e.code,message:e.message});
    return {error:e,receipt:e.receipt};
  }
};
// var original49 = await run49('published-original-canonical');
// var revised49 = await run49('cholesterol-normalized-federation');
// These are separate components, not a successful replacement full federation:
// var two49 = await run49('cholesterol-rhea-uniprot');
// var expression49 = await run49('cholesterol-bgee-component','https://www.bgee.org/sparql/');
