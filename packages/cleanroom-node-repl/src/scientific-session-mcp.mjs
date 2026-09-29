import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { KernelBroker, runStdioServer } from './cleanroom-mcp.mjs';
import { connectScientificSession } from './scientific-session-client.mjs';
import { validSessionControl } from './scientific-session-recovery.mjs';

const fail = (code,message) => Object.assign(new Error(message),{code});
const lostConnection = new Set(['CONNECTION_CLOSED','ECONNRESET','EPIPE','ENOENT','ECONNREFUSED','CONNECT_TIMEOUT','REQUEST_TIMEOUT','UNAUTHORIZED','SESSION_CLOSED','SERVICE_CLOSED','EPOCH_LOST','GRANT_EXPIRED']);

// Session controls run in this host, outside the selected kernel's lifetime.
// Credentials stay in adapter memory. Bookmarks contain data references, never code.
export class ScientificSessionMcpAdapter {
  constructor({cwd=process.cwd(),connect=connectScientificSession}={}) {
    this.connect=connect;
    this.client=null;
    this.role=null;
    this.closed=false;
    this.attaching=false;
    this.pendingClient=null;
    this.resume=null;
    this.selection=null;
    this.lastFailure=null;
    this.restoreBinding=null;
    this.queue=Promise.resolve();
    this.scratch=new KernelBroker({cwd,sessionControl:request=>this.control(request)});
  }
  enqueue(operation) {
    const next=this.queue.then(()=>{
      if(this.closed)throw fail('SESSION_ADAPTER_CLOSED','Adapter closed');
      return operation();
    });
    this.queue=next.catch(()=>{});
    return next;
  }
  metadata() {
    const r=this.resume;
    return {
      state:this.client?'attached':r?'disconnected':'scratch',
      ...(r?{socketPath:r.socketPath,sessionId:r.sessionId,role:r.role,instanceId:r.instanceId,epoch:r.epoch,kernelAlive:r.kernelAlive}:{}),
      selection:this.selection?structuredClone(this.selection):null,
      bookmarkLifetime:'MCP-adapter-process; export nonsecret selection for desktop-process restart',
      lastFailure:this.lastFailure,
      restoreBinding:this.restoreBinding,
    };
  }
  async disconnect() {
    const client=this.client;
    this.client=null;
    this.role=null;
    if(client)await client.close();
  }
  async guarded(operation,outcome='unknown') {
    try{return await operation();}
    catch(error) {
      if(!lostConnection.has(error.code))throw error;
      this.lastFailure={code:error.code,outcome};
      await this.disconnect();
      if(error.code==='GRANT_EXPIRED')throw error; // Preserve the worker protocol's terminal grant error.
      throw Object.assign(fail('SESSION_RECOVERY_REQUIRED','Session connection unavailable. Use js with empty code and session.action reconnect; recover explicitly permits owner recreation. Interrupted code was not retried.'),{
        repair:{action:'session-control',outcome,originalCode:error.code,selection:this.selection},
      });
    }
  }
  async preflight() {
    if(!this.client)throw fail('SESSION_RECOVERY_REQUIRED','Reconnect or recover explicitly before executing scientific code. No code was executed.');
    const status=await this.guarded(()=>this.client.status(),'not-executed');
    if(this.resume)this.resume.kernelAlive=status.kernelAlive;
    if(status.kernelAlive===false) {this.restoreBinding=null;this.lastFailure={code:'SESSION_KERNEL_LOST',outcome:'not-executed'};throw fail('SESSION_KERNEL_LOST','Kernel is gone; recover explicitly before restoring selected snapshots. No code was executed.');}
    const changed=this.resume && (status.instanceId!==this.resume.instanceId || status.epoch!==this.resume.epoch);
    Object.assign(this.resume,{instanceId:status.instanceId,epoch:status.epoch});
    if(changed) {this.restoreBinding=null;this.lastFailure={code:'SESSION_EPOCH_CHANGED',outcome:'not-executed'};throw Object.assign(fail('SESSION_EPOCH_CHANGED','Kernel epoch changed. Reconcile pending work and restore selected snapshots before continuing; no code was executed.'),{repair:{outcome:'not-executed',selection:this.selection}});}
    return status;
  }
  async control({operation,args={}}) {
    if(this.closed)throw fail('SESSION_ADAPTER_CLOSED','Adapter closed');
    if(operation==='create'||operation==='attach') {
      if(this.client||this.attaching)throw fail('SESSION_ALREADY_ATTACHED','Already attached; detach through host session control first');
      this.attaching=true;
      let client;
      try {
        client=await this.connect({socketPath:args.socketPath});
        this.pendingClient=client;
        if(this.closed)throw fail('SESSION_ADAPTER_CLOSED','Adapter closed');
        const result=operation==='create'?await client.create({sessionId:args.sessionId}):await client.attach({sessionId:args.sessionId,capability:args.capability});
        if(this.closed)throw fail('SESSION_ADAPTER_CLOSED','Adapter closed');
        if(this.resume && (this.resume.sessionId!==result.sessionId || this.resume.socketPath!==args.socketPath || this.resume.role!==(result.role??(operation==='create'?'owner':'worker')))) {
          this.selection=null;this.restoreBinding=null;this.lastFailure=null;
        }
        if(this.resume && (this.resume.instanceId!==result.instanceId || this.resume.epoch!==result.epoch))this.restoreBinding=null;
        this.client=client;
        this.role=result.role??(operation==='create'?'owner':'worker');
        this.resume={socketPath:args.socketPath,sessionId:result.sessionId,capability:result.capability??args.capability,role:this.role,instanceId:result.instanceId,epoch:result.epoch,kernelAlive:result.kernelAlive};
        return result;
      } catch(error){if(client)await client.close();throw error;}
      finally{this.pendingClient=null;this.attaching=false;}
    }
    if(!this.client)throw fail('SESSION_UNAVAILABLE','Create, attach, or reconnect to a scientific session first');
    if(operation==='status')return this.guarded(()=>this.client.status(),'not-executed');
    if(operation==='grant')return this.guarded(()=>this.client.grant(args));
    if(operation==='revoke')return this.guarded(()=>this.client.revoke(args));
    if(operation==='request')return this.guarded(()=>this.client.request(args.operation,args.args));
    throw fail('SESSION_OPERATION','Unsupported session control');
  }
  sessionCommand(command) {
    return this.enqueue(async()=>{
      if(!validSessionControl(command))throw fail('INVALID_ARGUMENT','Invalid session control');
      const {action}=command;
      if(action==='status') {
        if(this.client) {
          try{await this.preflight();}catch(error){if(!['SESSION_RECOVERY_REQUIRED','SESSION_EPOCH_CHANGED','SESSION_KERNEL_LOST'].includes(error.code))throw error;}
        }
        return this.metadata();
      }
      if(action==='create'||action==='attach') {
        const {action:operation,...args}=command;
        await this.control({operation,args});
        return this.metadata(); // Never print the owner capability in host controls.
      }
      if(action==='detach') {await this.disconnect();return this.metadata();}
      if(action==='bookmark') {
        if(this.resume?.role!=='owner')throw fail('FORBIDDEN','Only an owner may select a recovery activity');
        this.selection=structuredClone(command.selection);
        return this.metadata();
      }
      if(action==='reconnect'||action==='recover') {
        if(!this.resume)throw fail('SESSION_UNAVAILABLE','No previous session connection to recover');
        if(action==='recover' && this.resume.role!=='owner')throw fail('FORBIDDEN','Worker authority cannot recreate a session; request a fresh grant');
        const previous={...this.resume};
        await this.disconnect();
        let recreated=false;
        try {
          await this.control({operation:'attach',args:{socketPath:previous.socketPath,sessionId:previous.sessionId,capability:previous.capability}});
        } catch(error) {
          if(action!=='recover'||error.code!=='UNAUTHORIZED')throw error;
          // create fails if that ID is occupied: never replace a surviving session.
          await this.control({operation:'create',args:{socketPath:previous.socketPath,sessionId:previous.sessionId}});
          recreated=true;
        }
        if(action==='recover' && this.resume.kernelAlive===false) {
          await this.guarded(()=>this.client.reset());
          Object.assign(this.resume,await this.client.status());
        }
        const preserved=this.resume.kernelAlive!==false && !recreated && previous.instanceId===this.resume.instanceId && previous.epoch===this.resume.epoch;
        if(!preserved)this.restoreBinding=null;
        return {...this.metadata(),recreated,bindings:preserved?'preserved':'lost',workerGrants:preserved?'existing-expiry-still-applies':'not-restored',interruptedCode:'not-replayed',next:preserved?'inspect outcome of interrupted work':'restore selected snapshots and reconcile pending requests'};
      }
      if(action==='restore') {
        if(this.resume?.role!=='owner')throw fail('FORBIDDEN','Only an owner may restore snapshots');
        if(!this.selection)throw fail('SESSION_SELECTION_REQUIRED','Bookmark one activity and exact snapshot versions first');
        await this.preflight();
        const binding='sessionRecovery_'+randomUUID().replaceAll('-','');
        this.restoreBinding=binding;
        // Only a fixed trusted loader executes. Saved values are JSON data, never code.
        const selection=JSON.stringify(JSON.stringify(this.selection));
        const code=`var ${binding}={selection:JSON.parse(${selection}),handles:Object.create(null)};\n`+
          `${binding}.activity=await nodeRepl.rlm.handoff.open({id:${binding}.selection.activityId});\n`+
          `${binding}.workspace=linkedScience.open({contextKey:${JSON.stringify(binding.toLowerCase().replaceAll('_','-'))}});\n`+
          `for(const item of ${binding}.selection.snapshots){${binding}.handles[item.name]=await nodeRepl.rlm.handoff.load(${binding}.activity,item.ref,${binding}.workspace);}\n`+
          `nodeRepl.write(JSON.stringify({binding:${JSON.stringify(binding)},activityId:${binding}.activity.id,loaded:Object.keys(${binding}.handles),pending:await nodeRepl.rlm.handoff.pending(${binding}.activity).then(p=>({...p,items:p.items.map(r=>({id:r.id,status:r.status,computation:r.computation}))})),computations:await nodeRepl.rlm.handoff.computations(${binding}.activity)}));`;
        const result=await this.guarded(()=>this.client.execute(code,{maxOutputBytes:32768}));
        if(result.isError)return {restored:false,binding,result};
        return {restored:true,binding,result};
      }
    });
  }
  execute(code,options) {
    return this.enqueue(async()=>{
      if(this.resume && !this.client)throw fail('SESSION_RECOVERY_REQUIRED','Session is disconnected; use host session controls. No code was executed in scratch.');
      if(this.client&&this.role==='owner') {
        await this.preflight();
        return this.guarded(()=>this.client.execute(code,{timeoutMs:options?.timeoutMs,maxOutputBytes:options?.maxOutputBytes,requestMeta:options?.requestMeta}));
      }
      return this.scratch.execute(code,options);
    });
  }
  reset() {
    return this.enqueue(async()=>{
      if(this.resume&&!this.client)throw fail('SESSION_RECOVERY_REQUIRED','Reconnect before reset');
      if(this.role==='owner') {await this.preflight();const result=await this.guarded(()=>this.client.reset());this.resume.epoch=result.epoch;this.restoreBinding=null;return result;}
      return this.scratch.reset();
    });
  }
  addModuleDir(path) {
    return this.enqueue(async()=>{
      if(this.resume&&!this.client)throw fail('SESSION_RECOVERY_REQUIRED','Reconnect before adding a module directory');
      if(this.role==='owner') {await this.preflight();return this.guarded(()=>this.client.addModuleDir(path));}
      return this.scratch.addModuleDir(path);
    });
  }
  async close() {
    this.closed=true;
    try {if(this.pendingClient)await this.pendingClient.close();await this.disconnect();}finally{await this.scratch.close();}
  }
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)runStdioServer({broker:new ScientificSessionMcpAdapter()});
