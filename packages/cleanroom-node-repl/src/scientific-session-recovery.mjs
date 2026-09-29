// Control requests are handled by the MCP host, never by an unavailable kernel.
export const sessionControlSchema = {
  type: 'object', required: ['action'], additionalProperties: false,
  properties: {
    action: {type:'string', enum:['status','create','attach','detach','reconnect','recover','bookmark','restore']},
    socketPath: {type:'string', maxLength:1024},
    sessionId: {type:'string', maxLength:128},
    capability: {type:'string', maxLength:256},
    selection: {type:'object', required:['activityId','snapshots'], additionalProperties:false, properties:{
      activityId:{type:'string',maxLength:128},
      snapshots:{type:'array',maxItems:32,items:{type:'object',required:['name','ref'],additionalProperties:false,properties:{
        name:{type:'string',maxLength:128},
        ref:{type:'object',required:['id','version'],additionalProperties:false,properties:{id:{type:'string',maxLength:128},version:{type:'string',pattern:'^[a-f0-9]{64}$'}}},
      }}},
    }},
  },
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const name = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value);
export function validSessionControl(value) {
  if (!only(value,['action','socketPath','sessionId','capability','selection'])) return false;
  if(!sessionControlSchema.properties.action.enum.includes(value.action))return false;
  const allowed = {status:[],create:['socketPath','sessionId'],attach:['socketPath','sessionId','capability'],detach:[],reconnect:[],recover:[],bookmark:['selection'],restore:[]}[value.action];
  if (!allowed || Object.keys(value).some(k => k !== 'action' && !allowed.includes(k))) return false;
  if (['create','attach'].includes(value.action)) {
    if(typeof value.socketPath !== 'string' || !value.socketPath.startsWith('/') || value.socketPath.length > 1024 || value.socketPath.includes('\0')) return false;
    if(value.sessionId !== undefined && !name(value.sessionId)) return false;
    if(value.action === 'attach' && (!name(value.sessionId) || typeof value.capability !== 'string' || !/^[a-f0-9]{64}$/.test(value.capability))) return false;
  }
  if(value.action === 'bookmark') {
    const s=value.selection;
    if(!only(s,['activityId','snapshots']) || !name(s.activityId) || !Array.isArray(s.snapshots) || s.snapshots.length>32) return false;
    const names=new Set();
    for(const entry of s.snapshots) {
      if(!only(entry,['name','ref']) || !name(entry.name) || names.has(entry.name) || !only(entry.ref,['id','version']) || !name(entry.ref.id) || typeof entry.ref.version !== 'string' || !/^[a-f0-9]{64}$/.test(entry.ref.version)) return false;
      names.add(entry.name);
    }
  }
  return true;
}
