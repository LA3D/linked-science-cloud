import { fileURLToPath } from 'node:url';
import { readConfinedFile } from '../../lib/wiki-learning/evidence.mjs';
import { readWiki, inspectProposal, applyProposal, buildIndex } from '../../lib/wiki-learning/wiki-revisions.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const [command,path,...rest]=process.argv.slice(2);
try {
  if(command==='validate'||command==='index') {
    if(path||rest.length)throw Error('validate/index take no arguments');
    const state=await readWiki({root});
    console.log(command==='index'?buildIndex(state.patterns):JSON.stringify({status:'passed',revision:state.revision,patterns:state.patterns.length,scope:'citation-integrity-and-scientific-eligibility',scientificTruth:'not-established'},null,2));
  }else if(command==='inspect'||command==='apply') {
    if(!path||![0,2].includes(rest.length)||(rest.length&&rest[0]!=='--review-file'))throw Error('Usage: wiki.mjs inspect|apply proposal.json [--review-file review.json]');
    const proposal=JSON.parse(await readConfinedFile(root,path,512*1024));
    const review=rest.length?JSON.parse(await readConfinedFile(root,rest[1],4096)):null;
    if(command==='apply') console.log(JSON.stringify(await applyProposal(proposal,{root,review}),null,2));
    else {const result=await inspectProposal(proposal,{root,review});console.log(JSON.stringify({status:'valid-proposal',baseRevision:result.current.revision,changes:result.proposal.changes.map(p=>({id:p.id,status:p.status})),observations:result.observations,scientificTruth:'not-established'},null,2));}
  }else throw Error('Usage: wiki.mjs validate|index|inspect|apply');
}catch(error){console.error(error.message);process.exitCode=1;}
