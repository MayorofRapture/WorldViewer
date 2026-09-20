# Reuse & Dependency Register Design

## Draft v0.4

# Document Status

Draft version: 0.4  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Reuse & Dependency Register Design  
Planned repository artifact: docs/reuse-register.md  
Primary related artifacts:  
• Technical Design Specification, Draft v0.18  
• Milestone Roadmap, Draft v0.15  
• Testing Strategy, Draft v0.15  
• Task Specification & Definition of Done Template, Draft v0.4  
This fourth draft standardizes the register on the canonical “Reuse Mode” and “Prohibited Reinvention” terminology and removes handoff notes from the set of valid Approval Sources. Handoffs may cite an approved REUSE entry and its authoritative source, but approval itself must originate from an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision.

# 1\. Purpose

The Reuse & Dependency Register gives an implementation agent a compact answer to the questions that matter before coding starts:  
• What capability is being implemented?  
• Which Reuse Mode A/B/C/D applies?  
• Which component, algorithm, sample, standard, or reference implementation is approved?  
• What is the current status of that choice?  
• What license/provenance constraints apply?  
• What project-specific code is still permitted?  
• What mature behavior is explicitly prohibited from being reinvented?  
Its primary goal is to reduce model reasoning and context requirements by turning dependency/reuse choices into fixed task inputs.

# 2\. Scope and Non-Goals

The register covers material implementation-path choices that a future agent might otherwise have to rediscover or reinterpret.  
It should include:  
• approved runtime/framework dependencies  
• vetted algorithms and official/reference implementations that World Viewer adapts  
• composed primitive sets used to implement a project capability  
• explicitly approved project-specific custom implementations when reuse is not a good fit  
• still-evaluating choices when downstream tasks depend on knowing that no implementation decision has yet been approved  
The register should not become:  
• a duplicate package-lock file or dependency inventory  
• a general software bill of materials  
• a replacement for Accepted ADRs, the TDS, licenses, package metadata, or upstream documentation  
• a place to approve architecture informally  
• a catalog of every transitive dependency

# 3\. Authority Model

The register records approved choices; it does not create architecture authority by itself.  
Approval authority remains with the relevant Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision. A subsystem handoff may reference and summarize that approval, but it is never itself the Approval Source.  
If a register entry conflicts with an authoritative source, the register is stale. The implementation agent must stop and escalate rather than choosing the register over the governing source.

# 4\. Planned Repository Location

Canonical path: docs/reuse-register.md  
Placement rationale:  
• the register is cross-cutting across runtime, host, world, tooling, testing, and packaging concerns, so it lives at docs/reuse-register.md rather than under a single subsystem folder  
• subsystem handoff notes under docs/handoff/ cite REUSE IDs rather than duplicating dependency/reuse decisions  
• package manifests/lockfiles remain the source of truth for the actual dependency/version installed; the register explains why/how that dependency is approved and what custom code is permitted  
Ownership:  
• the TDS Mandatory Reuse Gate owns reuse categories, readiness criteria, custom-code-boundary rules, and ordinary-agent authority  
• Accepted ADRs and authoritative TDS/interface/conformance decisions own architecture-significant choices  
• accepted experiment results may own evidence-gated component/reference selection when the governing architecture delegates that choice  
• repository dependency manifests/lockfiles own the exact installed package/version  
• the Reuse Register owns only stable REUSE IDs, links, approval/status metadata, Reuse Mode, implementation boundary, Prohibited Reinvention, and compact navigation  
Source-of-truth rule:  
• if the register conflicts with an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or dependency manifest/lockfile, the register is stale and the authoritative source wins; if the register conflicts with a handoff summary, dependent work is blocked until both are reconciled against the governing authoritative source  
• a stale/conflicting record blocks dependent implementation until reconciled; an implementation agent may not choose a replacement library, widen custom code, or change status merely to make a task Ready  
Permitted maintenance:  
• non-semantic path/name/reference corrections may be made inside bounded work  
• dependency version/source metadata may be updated without a new ADR when the architecture and public/cross-subsystem boundaries remain unchanged and required compatibility/verification passes  
Semantic changes:  
• changing Reuse Mode A/B/C/D, approved component/reference, Approval Source, permitted custom-code boundary, Prohibited Reinvention, or another field that materially expands implementation authority is a semantic reuse change  
• semantic reuse changes must pass the Reuse Gate and required review; architecture-significant changes require a new/superseding ADR, while ordinary library substitutions may be approved without an ADR when they stay inside the accepted architecture  
Anti-duplication:  
• do not copy upstream documentation, license text, ADR rationale, long compatibility procedures, or evidence interpretation into the register  
• point to exact authoritative source/version/license/verification references instead  
Lifecycle:  
• M0A creates the file and initializes known approved/pending entries  
• M0B–M0G populate/update entries as reuse choices become real  
• M0H consumes the Reuse Register through the Reuse Readiness procedure defined by the Testing Strategy  
• M1A revalidates required REUSE IDs against the actual M1 starting commit  
Planning-document transition:  
• until the repository exists, this Google Doc is the planning source  
• after M0A creates docs/reuse-register.md, the repo file becomes the active execution/navigation artifact and this design remains planning/history only  
No JSON/YAML mirror is required initially. Add machine-readable structure only if real automation or drift problems justify it.

# 5\. Entry ID Convention

Each material reuse decision should receive a stable ID so task specifications and handoff notes can reference the choice without depending on file paths.  
Recommended form:  
REUSE-\<DOMAIN\>-\<NNN\>  
Examples:  
• REUSE-RENDER-001  
• REUSE-TRACK-001  
• REUSE-SCHEMA-001  
• REUSE-FILTER-001  
Do not encode package version, milestone number, model name, or implementation path in the ID. Version/source changes belong in fields.  
When a decision is materially superseded, retain the old entry as superseded and create a new entry unless the change is a non-semantic metadata correction.

# 6\. Reuse Modes A/B/C/D

The register uses the same categories defined by the TDS Mandatory Reuse Gate.  
A — Adopt directly  
Use a mature component substantially as provided, with only configuration and a narrow project adapter where needed.  
B — Adapt approved reference  
Use a vetted algorithm, official sample, paper/standard, or licensed implementation as the basis for a small World Viewer-owned adaptation.  
C — Compose approved primitives  
Combine mature lower-level APIs/components into a small project-specific integration layer.  
D — Project-specific custom implementation  
Implement the capability ourselves only when reuse is unsuitable or the behavior is genuinely World Viewer-specific. Category D requires explicit authorization and is never an ordinary implementation-agent convenience choice.

# 7\. Required Register Fields

Each entry must contain the following fields.  
Entry ID  
Stable REUSE-\<DOMAIN\>-\<NNN\> identifier.  
Capability  
The concrete capability being satisfied, expressed in product/architecture terms rather than package names.  
Reuse Mode  
A | B | C | D.  
Approved component / reference  
The approved library, package, algorithm, official sample, paper/specification, standards reference, upstream implementation, primitive set, or explicit project-owned implementation.  
Status  
Current lifecycle state defined in Section 8\.  
Approval Source  
Exact Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision that approves the choice.  
Version / source constraint  
Pinned or allowed package version, upstream tag/commit, model/WASM version, specification revision, asset hash, or other reproducibility constraint where needed.  
License / provenance  
SPDX/license name when known plus the upstream source/provenance needed to determine whether code can be copied, adapted, linked, bundled, or used only as a conceptual reference.  
Offline-runtime requirement  
State whether the dependency/reference must function fully offline and any local asset/model requirement.  
Packaged-runtime requirement  
State whether packaged Tauri/WebView2/WASM/worker compatibility must be proven and where that proof lives or will live.  
Permitted custom code  
The exact World Viewer-owned wrapper, adapter, glue, orchestration, error mapping, type conversion, configuration, or project-specific logic that may be written around the approved reuse path.  
Prohibited Reinvention  
The behavior that ordinary agents must not replace, bypass, duplicate, or reimplement with bespoke code.  
Verification  
Exact tests, conformance checks, packaged smoke, experiment, or acceptance procedure that proves the approved reuse path satisfies the project contract.  
Milestone / handoff applicability  
Which milestone slices and docs/handoff/\<subsystem\>.md packages consume the entry.  
Notes / limitations  
Short implementation constraints only; do not duplicate upstream documentation.

# 8\. Status Semantics

Use one of these lifecycle states:  
candidate  
A possible option identified for evaluation. Not authorized for normal implementation.  
evaluating  
A bounded evaluation/spike is in progress or required. Dependent implementation remains blocked.  
approved  
The choice has passed the required Reuse Gate and may be consumed within its recorded custom-code boundary.  
blocked  
The candidate/choice cannot currently satisfy a required constraint or lacks required evidence/provenance.  
superseded  
Historical choice retained for traceability; a replacement entry is authoritative.  
retired  
No longer used and no active replacement requirement exists.  
Ordinary implementation tasks may consume only approved entries unless their explicit task is evaluation/remediation.

# 9\. License and Provenance Rules

The register must distinguish conceptual/reference reuse from source-code reuse.  
For direct/adapted code reuse, record:  
• upstream project/source  
• license identifier/name  
• relevant copyright/notice obligations when known  
• exact tag/commit/version where practical  
• whether source may be copied/adapted, merely linked as a dependency, or used only as a conceptual reference  
If license/provenance is unclear, status cannot be approved for copied/adapted source. A task may still use the source as a conceptual reference only when doing so is legally/architecturally appropriate and explicitly documented.

# 10\. Permitted Custom Code Boundary

This field is the most important control for low-cost implementation models after the approved component/reference itself.  
It should describe exactly what World Viewer still owns.  
Good examples:  
• “Thin adapter converting MediaPipe output into TrackingObservation; no face-detection/tracking implementation.”  
• “Ajv schema-loader/error-mapping wrapper; no JSON Schema validator implementation.”  
• “Three.js projection-camera integration and World Viewer coordinate conversion; no renderer implementation.”  
Bad examples:  
• “Glue code as needed.”  
• “Anything not provided by the dependency.”  
• “Implement supporting utilities.”  
The field should be narrow enough that an agent can decide whether a proposed new module is inside or outside authority.

# 11\. Prohibited Reinvention Field

Every approved A/B/C entry must state the mature behavior that may not be rebuilt by ordinary implementation tasks.  
This entry-level field remains the canonical restriction for a specific capability. Section 12 adds a compact cross-cutting “Do Not Build” summary so agents can quickly recognize mature capabilities that should never be reinvented during ordinary implementation.  
Examples of wording:  
• “Do not implement a custom JSON Schema validator.”  
• “Do not implement face landmark detection/tracking.”  
• “Do not implement a second renderer or rendering abstraction that bypasses Three.js.”  
• “Do not substitute new smoothing mathematics for the approved One Euro implementation/reference.”  
If an approved path proves insufficient, the agent stops and escalates rather than violating this field.

# 12\. Do Not Build

This section is the compact cross-cutting guardrail for mature capabilities that ordinary World Viewer implementation tasks must not reinvent. It exists so an agent can recognize obvious prohibited directions without first reading every REUSE entry.  
The per-entry Prohibited Reinvention field remains canonical for a specific capability. If this summary and an approved REUSE entry ever differ, stop and reconcile the stale documentation before implementation.  
Ordinary implementation agents must not build:  
• Rendering engine / scene graph / general asset pipeline — Do not implement a custom renderer, scene graph, or parallel general-purpose rendering abstraction in place of Three.js/WebGLRenderer and the approved Three.js asset ecosystem. World Viewer may write thin projection/camera integration, coordinate conversion, resource ownership, and world-host glue inside the recorded custom-code boundary.  
• Face detection / landmark tracking — Do not implement custom face detection, landmark extraction, or face-tracking mathematics in place of MediaPipe Face Landmarker / Tasks Vision. Project-owned code may normalize MediaPipe output, perform approved pose estimation from its outputs, manage worker transport/backpressure, and integrate tracking state.  
• JSON Schema validation — Do not implement a general-purpose JSON Schema Draft 2020-12 validator. Use Ajv through the approved wrapper/configuration boundary. Project-owned code may load schemas, configure Ajv, map errors, validate project contracts, and integrate schema results with settings/persistence.  
• Semantic-version parsing and range compatibility — Do not hand-write a general semver parser, comparator, or range evaluator. The semver utility/library remains evaluation-gated until selected; dependent implementation should remain blocked/evaluation-scoped rather than filling the gap with bespoke parsing.  
• Motion-filter mathematics — Do not invent or substitute new smoothing/filter mathematics for the approved One Euro approach during ordinary implementation. Project-owned code may adapt the approved implementation/reference, tune permitted parameters from evidence, and integrate filtering with World Viewer state. A different filter family or novel mathematics requires explicit architecture/evidence review.  
These prohibitions do not ban project-specific adapters or orchestration. They prohibit recreating the mature capability itself. When the approved component/reference cannot satisfy a frozen requirement inside the permitted custom-code boundary, the task stops and escalates rather than widening the boundary or creating a replacement.  
Future additions to this summary should be limited to cross-cutting mature capabilities where accidental reinvention is a realistic agent failure mode. Capability-specific restrictions belong only in their REUSE entries.

# 13\. Recommended Markdown Structure

The repo file should start with a compact summary table so an implementation agent can find the relevant decision quickly.  
Recommended summary columns:  
ID | Capability | Mode | Approved Component / Reference | Status | License | Permitted Custom Code | Prohibited Reinvention  
Additional details that do not fit cleanly in the table—Approval Source, version/source constraint, packaged/offline requirements, verification, handoffs, limitations—should appear in short detail blocks keyed by Entry ID.  
The table is a navigation aid. Detail blocks and authoritative sources remain the source for nuanced constraints.

# 14\. Canonical Entry Template

Use this template for each material reuse decision:  
Entry ID: REUSE-\<DOMAIN\>-\<NNN\>  
Capability: \<what requirement/capability is being satisfied\>  
Reuse Mode: A | B | C | D  
Approved component / reference: \<name \+ upstream/source\>  
Status: candidate | evaluating | approved | blocked | superseded | retired  
Approval Source: \<Accepted ADR | authoritative TDS/interface/conformance decision | accepted experiment result | explicitly authorized non-architectural task decision\>  
Version / source constraint: \<version/tag/commit/spec revision/hash or not-applicable\>  
License / provenance: \<license \+ source/provenance or unresolved\>  
Offline-runtime requirement: \<explicit requirement/evidence\>  
Packaged-runtime requirement: \<explicit requirement/evidence\>  
Permitted custom code: \<exact adapter/wrapper/glue/project-specific logic\>  
Prohibited Reinvention: \<exact mature behavior not to rebuild\>  
Verification: \<tests/procedure/evidence\>  
Milestone / handoff applicability: \<M0/M1 slice \+ handoff paths\>  
Notes / limitations: \<short text or none\>

# 15\. Lifecycle

1\. Identify — A capability requires a material implementation-path choice.  
2\. Search/research — Prefer mature/open-source/official/reference options before considering custom code.  
3\. Classify — Choose A/B/C/D provisionally.  
4\. Evaluate — Resolve licensing, provenance, offline/package compatibility, maintenance, integration cost, and testability as required by the TDS Reuse Gate.  
5\. Approve — Record the Approval Source and mark the entry approved.  
6\. Bound — Record permitted custom code and Prohibited Reinvention before dependent implementation begins.  
7\. Consume — Bounded tasks cite the REUSE ID and implement only inside the recorded boundary.  
8\. Verify — Run the entry’s required tests/procedures.  
9\. Change — If the approved component, category, or custom-code boundary must materially change, obtain the required review before updating implementation.  
10\. Supersede/retire — Preserve old entries for evidence/task/ADR traceability.

# 16\. Task-Specification Integration

When the register exists, the Task Specification & Definition of Done Template should cite REUSE IDs in the Approved Reuse / Dependency Plan.  
A normal implementation task should state:  
• REUSE ID(s)  
• approved component/reference  
• Reuse Mode  
• current approved status  
• permitted custom-code boundary  
• Prohibited Reinvention  
• exact verification to run  
If the entry is candidate/evaluating/blocked, an implementation-only task is not Ready.  
If the task discovers that an approved component cannot satisfy a frozen requirement within the recorded boundary, it stops and reports the evidence rather than choosing a replacement or custom rewrite.

# 17\. Handoff and M1 Reuse-Readiness Integration

Each M0 subsystem handoff that M1 consumes should cite the relevant REUSE IDs.  
Reuse Readiness support:  
The Reuse Register must expose the records and metadata required by the Testing Strategy’s Reuse Readiness procedure. M0H applies the Testing Strategy; this design does not define a separate pass/fail checklist.  
M1A revalidates the M1-required REUSE records against the actual starting commit and reports drift rather than silently changing approval status, Reuse Mode, or the permitted custom-code boundary.

# 18\. Initial Population Guidance

The actual repo register should be populated from approved project sources rather than from memory or this design document.  
Initial sources include:  
• TDS Section 41 Approved Mature Reuse Baseline  
• TDS Section 41 Reuse Choices Still Requiring Evaluation  
• accepted/superseding ADRs that select architecture-significant dependencies/reference implementations  
• evidence-gated selections from M0D/M0E/M0F  
• subsystem handoff packages created during M0  
Candidate entries should not be marked approved merely because a library appears in the baseline stack; the actual register should preserve whatever approval/evidence level the governing source provides.

# 19\. Illustrative Entry

The following is illustrative only and must not be treated as the real repo register entry until the repository exists and its authoritative source/version is confirmed.  
Entry ID: REUSE-SCHEMA-001  
Capability: Validate world settings against JSON Schema Draft 2020-12.  
Reuse Mode: A  
Approved component / reference: Ajv  
Status: approved in current TDS baseline, subject to repo version pinning during implementation  
Approval Source: TDS world-settings decision / Section 41 reuse baseline  
Version / source constraint: to be fixed by repository dependency selection  
License / provenance: MIT; exact package metadata to be confirmed/preserved in repo dependency records  
Offline-runtime requirement: must execute fully offline  
Packaged-runtime requirement: must operate in packaged World Viewer runtime where validation occurs  
Permitted custom code: schema loading, Ajv configuration, typed validation wrapper, project-specific error mapping  
Prohibited Reinvention: no custom general-purpose JSON Schema validator

Verification: schema validation/conformance tests defined by implementation task and world-settings contracts  
Milestone / handoff applicability: M0G/M1 world-settings and persistence work  
Notes / limitations: illustrative entry; final package version/path/test IDs belong in the repo register.

# 20\. Maintenance Rules

• Keep one active current entry per approved canonical implementation path.  
• Do not silently change category A/B/C/D during ordinary implementation.  
• Do not mark an entry approved while required licensing/provenance/package evidence is unresolved.  
• Dependency version bumps that do not change architecture may update an approved entry after required verification; architecture-significant substitutions require explicit review.  
• Changes to permitted custom code or Prohibited Reinvention are substantive when they expand implementation authority and must receive the review required by the governing architecture.  
• Superseded entries remain visible and point to their replacement ID.  
• Keep the register concise; link upstream docs and evidence rather than copying them.

# 21\. Repository Creation Timing

Because the World Viewer repository is not yet available/connected, this Google Doc is the planning source for the future repo artifact.  
When M0A creates the repository foundation, create docs/reuse-register.md from this design and initialize it from the then-current authoritative TDS/ADR/experiment sources.  
The first version should remain hand-maintained Markdown. Automated consistency checks can be added later only if drift becomes a real problem.

# 22\. Design Decision

D-REUSE-01 — Lightweight Reuse & Dependency Register: World Viewer will maintain docs/reuse-register.md as a compact repo-local index of material reuse/dependency decisions. Each entry uses a stable REUSE ID and records capability, A/B/C/D Reuse Mode, approved component/reference, status, Approval Source, version/source constraint where relevant, license/provenance, permitted custom code, Prohibited Reinvention, verification, and milestone/handoff applicability. The register reflects authoritative architecture decisions rather than replacing them. Ordinary implementation tasks consume approved entries and may not switch Reuse Mode, substitute approved components, or expand the custom-code boundary without explicit authority.  
D-REUSE-02 — Global Do Not Build guardrail: docs/reuse-register.md will contain a compact cross-cutting summary of mature capabilities ordinary implementation agents must not reinvent. The initial set covers the rendering engine/scene graph/general asset pipeline, face detection/landmark tracking, JSON Schema validation, semantic-version parsing/range evaluation, and motion-filter mathematics. The summary does not ban thin project-specific adapters inside an approved custom-code boundary and does not replace per-entry Prohibited Reinvention fields; when an approved reuse path cannot satisfy a frozen requirement, implementation stops and escalates rather than creating a bespoke substitute.  
D-REUSE-03 — Repository placement, ownership, and ADR threshold: docs/reuse-register.md is the cross-cutting repo-local execution/navigation index for material reuse decisions. TDS reuse policy owns A/B/C/D Reuse Modes, readiness, and custom-code rules; Accepted ADRs and authoritative TDS/interface/conformance decisions own architecture-significant choices; accepted experiment results may own delegated evidence-gated selections; dependency manifests/lockfiles own the exact installed dependency/version. The register owns only stable IDs, links, status/approval metadata, Reuse Mode, permitted custom code, and Prohibited Reinvention. Registry/source conflicts make the register stale and block dependent work. Ordinary version/path metadata updates do not require ADRs when architecture is unchanged; semantic reuse changes require the Reuse Gate, and only architecture-significant changes require new/superseding ADRs. After M0A creates the repo file, it becomes the active execution/navigation artifact and this design becomes planning/history only.  
D-REUSE-04 — Canonical reuse terminology and approval authority: “Reuse Mode” is the project-wide field name for A/B/C/D, and “Prohibited Reinvention” is the canonical field for mature behavior ordinary implementation may not replace, bypass, duplicate, or rebuild. Valid Approval Sources are Accepted ADRs, authoritative TDS/interface/conformance decisions, accepted experiment results, and explicitly authorized non-architectural task decisions. Handoff notes may reference/summarize an approval but are not approval authority.

