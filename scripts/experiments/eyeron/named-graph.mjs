import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const [source,out]=process.argv.slice(2);
const wasm=await import(pathToFileURL(resolve(source,'pkg/eyeron.js')));wasm.initSync({module:await readFile(resolve(source,'pkg/eyeron_bg.wasm'))});
const rules='@prefix : <urn:bio:> . @prefix log: <http://www.w3.org/2000/10/swap/log#> . { ?g log:nameOf ?f . ?f log:includes { ?s a :Neuron } } => { ?s a :Cell } .';
const s=new wasm.EyeronSession(rules,false);const report=JSON.parse(s.reasonReport(await readFile(resolve(out,'run-01/named-input.nq'),'utf8'),true,'nquads'));
await writeFile(resolve(out,'named-corrected.json'),JSON.stringify({rules,report,correction:'Named RDF graphs are represented by graph log:nameOf formula; the earlier direct log:includes attempt was inappropriate.',scope:'Explicit extraction from named formula into default graph; no implicit union'},null,2)+'\n',{flag:'wx'});s.free();console.log(JSON.stringify(report));
