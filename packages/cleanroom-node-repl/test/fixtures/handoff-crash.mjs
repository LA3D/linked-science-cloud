import { HandoffStore } from '../../src/handoff-store.mjs';
// Only local synthetic tests invoke this fixture. SIGKILL deliberately skips
// cleanup so reopen tests exercise SQLite's physical crash recovery.
if (process.argv[2]) {
const spec=JSON.parse(process.argv[2]);
const store=new HandoffStore({root:spec.root,fault:point=>{if(point===spec.crash)process.kill(process.pid,'SIGKILL');}});
const owner={token:'crash-fixture',epoch:1,evaluation:2};
const activity=store.call('open',{id:spec.activity},owner);
store.call('register',{step:spec.step},owner);
const result=store.call(spec.operation,{...spec.args,activity},owner);
process.stdout.write(JSON.stringify(result));store.close();

}
