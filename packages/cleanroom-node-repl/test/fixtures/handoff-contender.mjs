import { HandoffStore } from '../../src/handoff-store.mjs';
if(process.argv[2]) {
 const spec=JSON.parse(process.argv[2]);
 const store=new HandoffStore({root:spec.root}),owner={token:`contender-${process.pid}`,epoch:1,evaluation:1};
 const activity=store.call('open',{id:spec.activity},owner);
 store.call('reconcile',{activity,request:spec.request,decision:'child-reported',child:'same-externally-observed-child'},owner);
 process.on('message',message=>{
   if(message==='close'){store.close();process.disconnect();return;}
   try{const receipt=store.call('accept',{activity,request:spec.request,inputs:spec.inputs,result:spec.result},owner);process.send({receipt});}
   catch(error){process.send({error:error.code});}
 });
 process.send({ready:true});
}
