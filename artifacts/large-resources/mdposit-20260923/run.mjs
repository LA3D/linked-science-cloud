// Explicitly authorized acceptance run. Fresh broker, never ambient shell Fetch.
import { KernelBroker, createRequestHandler } from '../../../packages/cleanroom-node-repl/src/cleanroom-mcp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.argv.includes('--authorized-live-mdposit')) throw new Error('This live acceptance run requires its explicit authorization flag');
const out = resolve('artifacts/large-resources/mdposit-20260923', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(out, { recursive: true });
const broker = new KernelBroker({cwd:process.cwd()});
const handler = createRequestHandler({broker});
let sequence = 0;
const log = [];
async function run(code) {
  const response = await handler({jsonrpc:'2.0',id:++sequence,method:'tools/call',params:{name:'js',arguments:{code,timeout_ms:120000,max_output_bytes:16000}}});
  const text = response.result.content.find(x=>x.type==='text')?.text;
  if (response.result.isError) throw new Error(text);
  const value = JSON.parse(text);
  log.push({sequence,at:new Date().toISOString(),value});
  await writeFile(resolve(out, `operation-${sequence}.json`),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  return value;
}
let result;
try {
  console.log('Fresh local project broker:', out);
  await run(`var ws=linkedScience.open({contextKey:'mdposit-default-pair'}); nodeRepl.write(JSON.stringify({cwd:nodeRepl.cwd,project:linkedScience.capabilities().environment.project,storage:linkedScience.capabilities().traversal?.resourceStorage,capacity:await ws.resources.capacity()}));`);
  const metadata=await run(`var metadataResource=await ws.resources.get('https://mdposit.mddbr.eu/api/rest/current/projects/MD-A007YH'); var md=await metadataResource.json(); nodeRepl.write(JSON.stringify({keys:Object.keys(md),summary:Object.fromEntries(Object.entries(md).filter(([k,v])=>v===null||['string','number','boolean'].includes(typeof v))),sha256:(await metadataResource.inspect()).sha256}));`);
  console.log('Metadata:', JSON.stringify(metadata));
  for (const [variable,filename] of [['pdb','structure.pdb'],['xtc','trajectory.xtc']]) {
    await run(`var transfer=ws.resources.start('https://mdposit.mddbr.eu/api/rest/current/projects/MD-A007YH/files/${filename}',{maxBytes:Math.min(1024**3,(await ws.resources.capacity()).availableBytes),timeoutMs:3600000}); var transferState='running'; var ${variable}; var transferError; transfer.done.then(r=>{${variable}=r;transferState='complete'},e=>{transferError=e;transferState='failed'}); nodeRepl.write(JSON.stringify({started:'${filename}'}));`);
    while (true) {
      await new Promise(resolve=>setTimeout(resolve,1000));
      const state=await run(`nodeRepl.write(JSON.stringify({state:transferState,status:await transfer.status()}));`);
      console.log(filename, state.state, state.status.progress?.bytes ?? state.status.bytes ?? 'pending');
      if(state.state==='failed') throw new Error(JSON.stringify(state));
      if(state.state==='complete') break;
    }
  }
  const inspection=await run(`
    var pdbText=await pdb.text(); var atomLines=pdbText.split(/\\r?\\n/).filter(s=>s.startsWith('ATOM  ')||s.startsWith('HETATM'));
    var residueCount=new Set(atomLines.map(s=>s.slice(21,27))).size;
    var xtcBytes=(await xtc.inspect()).bytes; var pos=0; var frames=0; var first; var last; var indexReadBytes=0;
    while(pos<xtcBytes){
      var h=await xtc.read({offset:pos,length:Math.min(92,xtcBytes-pos)}); indexReadBytes+=h.length;
      if(h.length<56||h.readInt32BE(0)!==1995) throw Error('Invalid XTC frame header at '+pos);
      var atoms=h.readInt32BE(4); if(atoms!==atomLines.length||h.readInt32BE(52)!==atoms)throw Error('Topology/trajectory atom count mismatch');
      var frame={index:frames,offset:pos,atoms,step:h.readInt32BE(8),timePs:h.readFloatBE(12)};
      if(!Number.isFinite(frame.timePs))throw Error('Invalid frame time');
      var span;
      if(atoms<=9)span=56+12*atoms;else{
        if(h.length<92||h.readInt32BE(84)<9||h.readInt32BE(84)>72||h.readInt32BE(88)<1)throw Error('Invalid XTC compression header');
        span=92+Math.ceil(h.readInt32BE(88)/4)*4;
      }
      if(pos+span>xtcBytes)throw Error('Truncated XTC frame');
      first??=frame;last=frame;frames++;pos+=span;
    }
    var scanBytes=0;var scanChunks=0;var largestChunk=0;
    for await(var chunk of xtc.chunks({chunkBytes:65536})){scanBytes+=chunk.length;scanChunks++;largestChunk=Math.max(largestChunk,chunk.length);}
    nodeRepl.write(JSON.stringify({pdb:{atoms:atomLines.length,residues:residueCount,metadata:await pdb.inspect()},xtc:{metadata:await xtc.inspect(),frames,first,last,indexReadBytes,exactEnd:pos===xtcBytes,scanBytes,scanChunks,largestChunk},limitations:['Frame headers and atom counts verified; compressed coordinate values and atom ordering not independently validated','Viewer playback belongs to originating task']}));
  `);
  if(inspection.pdb.atoms!==2138||inspection.pdb.residues!==141||inspection.xtc.frames!==450)throw new Error('Acceptance counts differ: '+JSON.stringify(inspection));
  if(inspection.pdb.metadata.sha256!=='00a81322dcb7be6c5392c1f2f5091f0ce82d8b78af837680c8f4484e955b619d')throw new Error('PDB differs from prior acquisition');
  const artifacts=await run(`var pdbArtifact=await pdb.materialize({name:'structure.pdb',authorized:true});var xtcArtifact=await xtc.materialize({name:'trajectory.xtc',authorized:true});nodeRepl.write(JSON.stringify({pdb:pdbArtifact,xtc:xtcArtifact}));`);
  result={kind:'linked-science-large-resource-acceptance',status:'passed',broker:'fresh-local-project-process',desktopMcpReloaded:false,metadata,inspection,artifacts,operations:sequence};
  // Capture resident evidence before lifecycle teardown.
  await writeFile(resolve(out,'receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  await run(`await ws.dispose();nodeRepl.write(JSON.stringify({disposed:true}));`);
  await broker.reset();
  const {stat}=await import('node:fs/promises');
  const durability={pdbBytes:(await stat(artifacts.pdb.path)).size,xtcBytes:(await stat(artifacts.xtc.path)).size,after:'workspace-disposal-and-kernel-reset'};
  await writeFile(resolve(out,'durability.json'),JSON.stringify(durability,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({receipt:resolve(out,'receipt.json'),artifacts,inspection,durability},null,2));
} catch(error) {
  await writeFile(resolve(out,'failure.json'),JSON.stringify({status:'failed',message:error.message,operations:log},null,2)+'\n',{flag:'wx'});
  console.error(error);process.exitCode=1;
} finally { await broker.close(); }
