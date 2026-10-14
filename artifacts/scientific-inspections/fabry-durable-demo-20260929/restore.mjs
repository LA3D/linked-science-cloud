import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function restoreFabry(linkedScience,nodeRepl){
  const manifest=JSON.parse(await readFile(new URL('./restore-manifest.json',import.meta.url),'utf8'));
  const session=await nodeRepl.scientificSession.status();
  if(session.role!=='owner'||session.sessionId!==manifest.sessionId)throw new Error('Attach as owner to the recorded scientific session first; session identity selects the durable store.');
  const h=nodeRepl.rlm.handoff;
  if(!(await h.capabilities()).available)throw new Error('Durable storage unavailable');
  const activity=await h.open({id:manifest.activityId});
  const workspace=linkedScience.open({contextKey:'fabry-restored-'+randomUUID()});
  const handles={};
  for(const [key,ref] of Object.entries(manifest.snapshots))handles[key]=await h.load(activity,ref,workspace);
  const chemistry=await workspace.results.page(handles.chemistry,{limit:10});
  const chain=await workspace.results.page(handles.chain,{limit:10});
  return {activity,workspace,handles,check:{chemistryRows:chemistry.total,chainRows:chain.total},map:await h.map(activity,{limit:32}),computations:await h.computations(activity)};
}
