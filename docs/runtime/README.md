# Linked Science runtime machine documentation

The [runtime API schema](linked-science-api.schema.json) is the machine-readable surface for the clean-room MCP and explicit roots, bootstrap, stable bindings, discovery, workspace groups, broker-owned PEEK orientation, and compatibility adapters. The [route index](routes.json) lists exact conditional-documentation names and lookup aliases.

The bootstrap also registers this bounded discovery material in the kernel-resident RLM context `linked-science:runtime`. The runtime generates human-sized documentation from the same public method model through `linkedScience.documentation()` and `linkedScience.documentation.get(name)`. Checked-in JSON and RLM context are discovery views; neither is runtime evidence, an ontology, a PEEK map, or a result artifact.

See [runtime discovery](../agent/runtime-discovery.md) for the exact bootstrap and [the runtime architecture](../architecture/codeact-linked-science-runtime.md) for trust and lifecycle boundaries.
