// Correct only private reconnect descriptors; preserve the originally frozen harness.
import {readFile,writeFile} from 'node:fs/promises';
const run=process.argv[2];
if(!/^[ABC][123]$/.test(run??''))throw Error('Expected E4 run A1..C3');
const path=`/private/tmp/linked-science-e4-20260909/${run}.json`;
const value=JSON.parse(await readFile(path,'utf8'));
await writeFile(path,JSON.stringify({sessionId:value.sessionId,capability:value.capability}),{mode:0o600});
console.log(JSON.stringify({run,reconnectDescriptorNormalized:true}));
