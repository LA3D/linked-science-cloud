# Linked Science runtime machine documentation

The [runtime API schema](linked-science-api.schema.json) is the machine-readable surface for bootstrap, stable bindings, discovery, workspace groups, and compatibility adapters. The [route index](routes.json) lists exact conditional-documentation names and lookup aliases.

The runtime generates human-sized documentation from the same public method model through `linkedScience.documentation()` and `linkedScience.documentation.get(name)`. The checked-in JSON is versioned discovery material for fresh agents and validation; it is not runtime state, an ontology, or a result artifact.

See [runtime discovery](../agent/runtime-discovery.md) for the exact bootstrap and [the runtime architecture](../architecture/codeact-linked-science-runtime.md) for trust and lifecycle boundaries.
