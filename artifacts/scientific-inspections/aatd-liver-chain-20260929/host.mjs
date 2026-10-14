// Local project-broker host: no direct scientific network reads and no model callback.
import {KernelBroker} from '../../../packages/cleanroom-node-repl/src/cleanroom-mcp.mjs';
import {createInterface} from 'node:readline';
import {appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../../../',import.meta.url));
if(!process.env.AATD_HANDOFF_ROOT)throw Error('Set AATD_HANDOFF_ROOT to a private durable directory outside the checkout');
const broker=new KernelBroker({cwd,handoffRoot:process.env.AATD_HANDOFF_ROOT});
const log=fileURLToPath(new URL('operations.jsonl',import.meta.url));
console.log('READY');
for await(const line of createInterface({input:process.stdin})){
 if(!line.trim())continue;
 const request=JSON.parse(line);
 if(request.close){await broker.close();break;}
 let record;
 try{record={at:new Date().toISOString(),label:request.label,code:request.code,result:await broker.execute(request.code,{timeoutMs:60000,maxOutputBytes:request.maxOutputBytes??24000})};}
 catch(e){record={at:new Date().toISOString(),label:request.label,error:{code:e.code,message:e.message,receipt:e.receipt}};}
 await appendFile(log,JSON.stringify(record)+'\n');
 console.log(JSON.stringify(record.error?{error:record.error}:record.result));
}
await broker.close();
