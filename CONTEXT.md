# BOX Local Engine

BOX Local Engine hosts editable and playable worlds while preserving the core
Boxes project model without depending on the retired cloud platform.

## Language

**Map Group**:
A collection containing exactly one main map and zero or more submaps that share one authoritative resource library and group data space.
_Avoid_: Project folder, extension project, map collection

**Main Map**:
The required primary member of a map group. Deleting it means deleting the whole map group.
_Avoid_: Parent project, root world

**Submap**:
An independently editable and playable map that belongs to a map group and consumes its shared resource library.
_Avoid_: Child project, copy, extension map

**Map Resource**:
Terrain, placed entities, environment, spawn settings, and other state owned by one map only.
_Avoid_: Private resource

**Shared Resource Library**:
The single authoritative collection of project models, skins and characters, shared scripts, UI, audio, and pictures owned by a map group.
_Avoid_: Global library, copied resources

**Shared Resource Snapshot**:
An immutable version of a map group's shared resource library, selected by one authoritative group-level root pointer. Maps consume the latest snapshot when opened; the snapshot is not a second map project.
_Avoid_: Shared folder, synchronized copy

**Local Model Library**:
Models owned by the server-wide VOXA workspace and not by any map group until placed or explicitly imported into one.
_Avoid_: Shared model library

**Project Data Space**:
The data storage namespace accessible only to one map.
_Avoid_: Local database

**Group Data Space**:
The data storage namespace accessible to every map in the same map group and inaccessible to other groups.
_Avoid_: Global database, common database

**Permanent Map ID**:
The immutable 20-character lowercase hexadecimal identity of one map. It remains unchanged when its name, player-facing route, local directory key, or release version changes.
_Avoid_: Project ID, route ID

**Access ID**:
The unique, editable, human-readable slug used in player-facing map links.
_Avoid_: Permanent Map ID, internal ID

**Local Project Key**:
The local directory and runtime routing key of an editable project. It is an implementation locator, not a persistent game-data identity.
_Avoid_: Permanent Map ID, Access ID

## Architecture Decisions

- Map groups preserve Boxes' project and group schemas. Local metadata only owns membership and the authoritative shared root pointer.
- Exporting any map-group member exports the complete group and records the member that initiated the export. Independent import assigns new local IDs while preserving main/submap roles and one shared root; submap import attaches only that initiating member to a selected existing main map and adopts the target group's shared library.
- Publishing any map-group member publishes every member under one version and exports one `.boxplay`; each immutable world records the map group ID, main map ID, role, and shared resource revision used to build it.
- Importing a multi-map `.boxplay` is atomic: all member IDs and relationships are validated before any world becomes visible, and any conflict rejects the complete bundle.
- Local Engine does not set a non-zero cloud `GROUP_ID`; doing so would activate cloud backend and shared-script routes.
- Cross-editor live action broadcast is intentionally not claimed. Members synchronize from the shared snapshot when opened.
