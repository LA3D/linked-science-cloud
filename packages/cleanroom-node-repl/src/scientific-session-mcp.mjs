import { pathToFileURL } from 'node:url';
import { KernelBroker, runStdioServer } from './cleanroom-mcp.mjs';
import { connectScientificSession } from './scientific-session-client.mjs';

// Every MCP connection starts with an independent scratch kernel. An explicit
// create/attach operation chooses the shared session, never the repository path.
export class ScientificSessionMcpAdapter {
  constructor({cwd=process.cwd(),connect=connectScientificSession}={}) {
    this.connect=connect;this.client=null;this.role=null;this.closed=false;this.attaching=false;this.pendingClient=null;
    this.scratch=new KernelBroker({cwd,sessionControl:request=>this.control(request)});
  }
  async control({operation,args={}}) {
    if(this.closed)throw Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'});
    if(operation==='create'||operation==='attach') {
      if(this.client||this.attaching)throw Object.assign(new Error('Already attached; use a fresh connection'),{code:'SESSION_ALREADY_ATTACHED'});
      this.attaching=true;
      let client;
      try {
        client=await this.connect({socketPath:args.socketPath});
        this.pendingClient=client;
        if(this.closed)throw Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'});
        const result=operation==='create'?await client.create({sessionId:args.sessionId}):await client.attach({sessionId:args.sessionId,capability:args.capability});
        if(this.closed)throw Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'});
        this.client=client;this.role=result.role??(operation==='create'?'owner':'worker');
        return result;
      } catch(error){if(client)await client.close();throw error;}
      finally{this.pendingClient=null;this.attaching=false;}
    }
    if(!this.client)throw Object.assign(new Error('Create or attach to a scientific session first'),{code:'SESSION_UNAVAILABLE'});
    if(operation==='status')return this.client.status();
    if(operation==='grant')return this.client.grant(args);
    if(operation==='request')return this.client.request(args.operation,args.args);
    throw Object.assign(new Error('Unsupported session control'),{code:'SESSION_OPERATION'});
  }
  execute(code,options) {
    if(this.closed)return Promise.reject(Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'}));
    return this.client&&this.role==='owner'?this.client.execute(code,{timeoutMs:options?.timeoutMs,maxOutputBytes:options?.maxOutputBytes,requestMeta:options?.requestMeta}):this.scratch.execute(code,options);
  }
  reset() {if(this.closed)return Promise.reject(Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'}));return this.client&&this.role==='owner'?this.client.reset():this.scratch.reset();}
  addModuleDir(path) {if(this.closed)return Promise.reject(Object.assign(new Error('Adapter closed'),{code:'SESSION_ADAPTER_CLOSED'}));return this.client&&this.role==='owner'?this.client.addModuleDir(path):this.scratch.addModuleDir(path);}
  async close() {
    this.closed=true;
    try {if(this.pendingClient)await this.pendingClient.close();if(this.client)await this.client.close();}finally{await this.scratch.close();}
  }
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)runStdioServer({broker:new ScientificSessionMcpAdapter()});
