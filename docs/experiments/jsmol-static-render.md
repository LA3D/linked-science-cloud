# JSmol static-render spike

This first spike is intentionally limited to checking whether a future Codex/ChatGPT Desktop visualization surface can load JSmol, render argon atoms, rotate and zoom the view, and respond to one simple Jmol control. It does not add JSmol, a visualization skill, animation, or a molecular-dynamics runtime.

The fixture is [openmd-argon-8.xyz](../../fixtures/jsmol/openmd-argon-8.xyz): one valid XYZ frame containing eight argon atoms. It preserves, in order and without coordinate transformation, atoms 0 through 7 from the 108-atom initial snapshot in OpenMD's [`samples/argon/argonNVT.omd`](https://github.com/OpenMD/OpenMD/blob/main/samples/argon/argonNVT.omd). The coordinates are positions in angstroms; upstream velocities and the other 100 atoms are intentionally omitted.

This is a static visualization fixture, not a trajectory, simulation, integration, or claim about molecular dynamics. It requires no runtime network access or additional dependency.

The upstream OpenMD material is BSD-3-Clause licensed, copyright OpenMD. The retained license text is in [OPENMD-LICENSE.txt](../../fixtures/jsmol/OPENMD-LICENSE.txt); the upstream repository provides the OpenMD input snapshot, not this extracted XYZ file.

