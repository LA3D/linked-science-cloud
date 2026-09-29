# Laptop sleep and session recovery

The shared service retains a scientific kernel while at least one owner connection is open. Ordinary inactivity, including laptop sleep, no longer expires that session. Once the last owner disconnects, idle grace defaults to 24 hours, measured from disconnection or subsequent authorized session activity. A worker connection alone does not pin a session. Configure grace with launcher option `--idle-ttl-ms`. Existing session, connection and kernel resource bounds remain; capacity errors do not silently evict attached owners. Worker grants expire independently: 60 seconds by default, maximum five minutes, including across sleep.

Sleep during an in-flight request may still produce a timeout and kernel loss. A service crash, reset or restart can also lose live state. Arbitrary JavaScript is not serialized; explicit durable snapshots and handoff receipts are the recovery boundary.

## Host controls

The existing `js` MCP tool accepts a `session` field alongside empty `code`. Controls execute in the adapter host before kernel routing, even when the kernel is gone. No fourth MCP tool or in-kernel callback is added. Existing `nodeRepl.scientificSession.create/attach` calls remain supported.

```json
{"code":"","session":{"action":"status"}}
{"code":"","session":{"action":"reconnect"}}
```

`status` reports attachment, session instance ID, kernel epoch, selected bookmark and last connection failure without exposing capabilities. `reconnect` reauthenticates with credentials retained privately in adapter memory and reports whether bindings survived. It never replays application code. `detach` drops only this connection and retains recovery metadata. `create` accepts absolute `socketPath` and optional `sessionId`; `attach` requires both plus `capability`. Host create/attach responses omit the capability; the existing owner REPL create interface remains available when a separate protected owner capability copy is needed.

If the session is gone, an owner can explicitly request:

```json
{"code":"","session":{"action":"recover"}}
```

This first attempts attachment, then attempts to create the same session ID only after authorization failure. Creation fails if that ID is occupied; a surviving session is never replaced. A confirmed dead kernel in a surviving session may be reset by this explicit recovery action. Workers cannot recreate sessions or upgrade expired grants. New kernels have fresh handles and no restored grants. Numeric kernel epochs can repeat across service instances; a random session instance ID distinguishes them.

Before owner evaluation, the adapter checks liveness and epoch. Lost connections return `SESSION_RECOVERY_REQUIRED`; changed epochs and dead kernels are reported before application code executes. Disconnected evaluations never silently become scratch evaluations. Transport loss during execution leaves an unknown outcome. Reconnection is separate from retrying that evaluation.

## Selected activity bookmark

After saving data, retain exact references in the host:

```json
{
  "code":"",
  "session":{
    "action":"bookmark",
    "selection":{
      "activityId":"ACTIVITY_ID_FROM_HANDOFF_OPEN",
      "snapshots":[
        {"name":"chemistry","ref":{"id":"SAVED_ID","version":"SAVED_64_CHARACTER_SHA256"}}
      ]
    }
  }
}
```

Replace placeholders with actual returned values. A bookmark accepts at most 32 named versions. It does not save data itself, pin extra versions, copy graphs, select historical activities, or store executable code. The bookmark and private credentials survive sleep and service restart while the MCP adapter process survives. They are **not automatically persisted across Desktop/MCP-process restart**. For that case, keep a nonsecret selection manifest in the authorized project artifact area, as the Fabry demo does, and establish owner authority again. No credential file or startup daemon is introduced.

After reconnect/recover, use `{"code":"","session":{"action":"restore"}}`. A fixed loader opens only the bookmarked activity and loads its exact versions into a fresh workspace. The response includes a unique `sessionRecovery_...` binding, loaded names, pending requests and computation inventory. Subsequent code can inspect that binding's `.workspace`, `.handles` and `.activity`. Restore errors expose the binding for inspection and partial-cleanup decisions; they are never silently retried. Restored JSON remains behind handles. Cross-activity dependencies are not inferred or automatically authorized.

Compatible continuation functions must be registered again from trusted source. Inspect durable receipts and reconcile uncertain dispatches before repeating work: a lost reply does not prove an operation failed. Restore does not execute continuations, launch agents, replay external actions or revive grants.

## Verification and deployment

Tests cover idle owner retention, detached expiry, one MCP adapter across service restart, selected snapshot isolation, completed-computation recovery, lost replies without repeated execution, dead kernels, expired grants, occupied session IDs and malformed controls. Existing service tests cover timeouts before and during worker dispatch. These are controlled local tests, not OS power-management tests on every platform.

Running processes must load this change once: restart the independently launched service against the same private durable directory, then reload the project MCP connection. Preserve needed unsaved data first. Repository edits do not patch running processes. Subsequent ordinary sleep/wake cycles use the new retention and host recovery controls without a Desktop restart; reconnect/restore remain explicit agent actions with visible outcomes.
