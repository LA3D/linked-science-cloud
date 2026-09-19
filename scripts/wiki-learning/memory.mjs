import { fileURLToPath } from 'node:url';
import { searchMemory,readMemory,recordFeedback } from '../../lib/wiki-learning/retrieval.mjs';
import { readConfinedFile } from '../../lib/wiki-learning/evidence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const [command,a,b,...rest]=process.argv.slice(2);
try {
  if(rest.length)throw Error('Too many arguments');
  let result;
  if(command==='search'&&a&&(!b||b==='off'))result=await searchMemory({root,query:a,mode:b??'on'});
  else if(command==='read'&&a&&b)result=await readMemory({root,receiptPath:a,patternId:b});
  else if(command==='feedback'&&a&&b)result=await recordFeedback({root,receiptPath:a,feedback:JSON.parse(await readConfinedFile(root,b,8192))});
  else throw Error('Usage: memory.mjs search "short task or error terms" [off] | read <search-receipt> <pattern-id> | feedback <search-receipt> <feedback-json-path>');
  console.log(JSON.stringify(result));
} catch(e) {console.error(e.message);process.exitCode=1;}
