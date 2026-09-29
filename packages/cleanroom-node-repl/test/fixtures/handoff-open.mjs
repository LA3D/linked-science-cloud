import { HandoffStore } from '../../src/handoff-store.mjs';
if(process.argv[2]) {
 process.send({starting:true});
 try {const store=new HandoffStore({root:process.argv[2]});store.close();process.send({opened:true});}
 catch(error){process.send({error:error.code,message:error.message});}
 process.disconnect();
}
