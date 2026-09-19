// Run-specific stdio client for the repository-owned MCP, not a network client.
// Each bounded tool response is saved immediately; no graph export is performed.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const child = spawn(process.execPath, ['packages/cleanroom-node-repl/src/cleanroom-mcp.mjs'], { cwd: root, stdio: ['pipe','pipe','pipe'] });
const pending = new Map(); let id = 0, event = 0;
createInterface({input:child.stdout}).on('line', line => { const value=JSON.parse(line); pending.get(value.id)?.(value); pending.delete(value.id); });
child.stderr.on('data', bytes => process.stderr.write(bytes));
const request = (method, params) => new Promise(resolve => { const next=++id; pending.set(next,resolve); child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:next,method,params})+'\n'); });
await request('initialize',{protocolVersion:'2024-11-05'});
const tools=await request('tools/list',{});
await writeFile(new URL('tools.json',import.meta.url),JSON.stringify({names:tools.result.tools.map(t=>t.name)},null,2)+'\n',{flag:'wx'});
console.log('READY');
for await (const line of createInterface({input:process.stdin})) {
  if(line==='CLOSE'){child.stdin.end();break;}
  const args=JSON.parse(line);
  const response=await request('tools/call',{name:'js',arguments:{max_output_bytes:16000,timeout_ms:60000,...args}});
  const record={format:'linked-science-observed-mcp-exchange/v1',eventId:`exchange-${++event}`,observedAt:new Date().toISOString(),server:'repository-stdio-cleanroom_node_repl',tool:'js',arguments:args,response};
  await writeFile(new URL(`exchange-${event}.json`,import.meta.url),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(record));
}
