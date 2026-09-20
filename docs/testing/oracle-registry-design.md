# Oracle Registry Design

## Draft v0.2

# Document Status

Draft version: 0.2  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Oracle Registry Design  
Planned repository artifact: docs/testing/oracle-registry.md  
Primary related artifacts:  
• Testing Strategy, Draft v0.15  
• Technical Design Specification, Draft v0.18  
• Milestone Roadmap, Draft v0.15  
• Task Specification & Definition of Done Template, Draft v0.4  
This second draft adds explicit repository placement, source-of-truth ownership, semantic-change, drift-handling, and lifecycle rules so the future repo-local Oracle Registry remains a compact execution/navigation aid rather than becoming a duplicate testing or architecture specification.

# 1\. Purpose

The Oracle Registry gives an implementation agent a cheap, deterministic answer to four questions:  
• What accepted oracle defines correctness for this behavior?  
• Where is the authoritative executable/procedural check?  
• Is that oracle reviewed and frozen for ordinary implementation use?  
• Who, if anyone, has authority to change it?  
Its primary purpose is to reduce context and reasoning requirements for Milestone 1 and later bounded tasks. A task should be able to cite one or more stable Oracle IDs instead of loading broad testing/architecture documents simply to discover which tests are authoritative.

# 2\. Scope and Non-Goals

The registry contains named oracles that are stable enough to be reused across tasks, subsystems, milestones, or acceptance reviews.  
The registry should include:  
• all Class C architecture-critical oracles once they are defined/reviewed  
• accepted Class B integration/conformance oracles that govern reusable subsystem boundaries  
• selected Class A deterministic oracles when they are canonical/shared across many tasks or handoff packages  
The registry should not include every unit test. Routine local tests that do not act as a reusable source of accepted correctness remain discoverable through source/test structure and task specifications.  
The registry does not:  
• duplicate test logic, formulas, or long acceptance procedures  
• override the Testing Strategy’s Class A/B/C definitions  
• replace governing requirements, ADRs, experiment specifications, or conformance specifications  
• create a new permission system  
• make a failing implementation acceptable by changing an oracle’s status  
• become a machine-readable database in the first version

# 3\. Authority Model

The registry is an index of authority, not authority by itself.  
Authority remains with the source identified by each registry record, such as an accepted ADR, interface/contract requirement, experiment specification, conformance requirement, test/procedure, or approved acceptance criterion.  
If the registry disagrees with an authoritative source, the registry is stale and must be corrected. The implementation agent must not choose the registry over the governing source.  
A registry record may summarize status, but it must link/point to the exact authoritative source rather than reproduce normative behavior in parallel prose.

# 4\. Planned Repository Location

Canonical path: docs/testing/oracle-registry.md  
Placement rationale:  
• the registry belongs under docs/testing/ because it is a verification-governance/navigation artifact, not a general architecture specification  
• subsystem handoff notes under docs/handoff/ cite Oracle IDs rather than duplicating registry status  
• evidence/ stores execution/readiness results; it does not own oracle definitions  
Ownership:  
• the Testing Strategy owns oracle classification/review/freeze rules  
• the governing requirement/contract/ADR/experiment specification owns intended behavior  
• the authoritative test/procedure owns the executable/procedural check  
• the Oracle Registry owns only stable IDs, links, status metadata, change authority, and compact navigation  
Source-of-truth rule:  
• when the registry conflicts with a governing requirement, ADR, test/procedure, or reviewed experiment source, the registry is stale and the authoritative source wins  
• a stale/conflicting record blocks dependent implementation until reconciled; an implementation agent may not guess which version is intended or change status simply to make a task Ready  
Permitted maintenance:  
• non-semantic path/name/reference corrections may be updated inside bounded implementation work when the authoritative oracle semantics are unchanged  
• frozen-baseline pointers may be advanced only when the underlying oracle semantics remain unchanged and required verification passes  
Semantic changes:  
• changing expected behavior, classification, threshold, tolerance, formula, interpretation, review status, freeze status, or change authority is a semantic oracle change  
• semantic changes require the recorded oracle-change authority/review and must update the governing source/test first, then the registry and affected handoff references in the same reviewed change  
Anti-duplication:  
• do not copy long formulas, procedures, contract text, evidence interpretation, or ADR rationale into the registry  
• point to exact source/test/procedure/evidence locations instead  
Lifecycle:  
• M0A creates the file and header/template  
• M0B–M0G populate entries as reusable oracles become real  
• M0H consumes the Oracle Registry through the Verification Readiness procedure defined by the Testing Strategy  
• M1A revalidates required Oracle IDs against the actual M1 starting commit  
Planning-document transition:  
• until the repository exists, this Google Doc is the planning source  
• after M0A creates docs/testing/oracle-registry.md, the repo file becomes the active execution/navigation artifact and this design remains planning/history only  
No separate JSON/YAML registry is required initially. Add machine-readable structure only if real automation/drift problems justify it.

# 5\. Oracle ID Convention

Oracle IDs must be stable, human-readable, and independent of file paths so tests can move without changing task references.  
Recommended form:  
ORC-\<SUBSYSTEM\>-\<NNN\>  
Examples:  
• ORC-PROJ-001 — off-axis projection screen-corner mapping  
• ORC-VIEW-001 — viewer-state loss/reacquisition timing  
• ORC-WORLD-001 — world lifecycle conformance  
• ORC-POSE-001 — pose-estimator comparison procedure  
Subsystem abbreviations should be short and stable. Do not encode milestone numbers, model names, file names, or implementation versions in the Oracle ID.  
If an oracle is superseded, retain the old ID as a superseded record and create a new ID unless the change is purely editorial/non-semantic.

# 6\. Required Registry Fields

Each registry record must contain the following fields.  
Oracle ID  
Stable identifier used by tasks, handoff notes, reviews, and completion reports.  
Subsystem  
Owning subsystem or cross-cutting area, for example projection, viewer-state, tracking/pose, calibration/filter, world packages, persistence, or packaged runtime.  
Governed behavior  
One concise sentence describing the behavior/decision whose correctness the oracle governs.  
Classification  
Class A routine deterministic | Class B integration/conformance | Class C architecture-critical, using the Testing Strategy definitions.  
Governing authority  
Exact requirement ID, contract section, Accepted ADR, experiment specification section, conformance requirement, or other authoritative source that defines the intended behavior.  
Authoritative test / procedure  
Exact test path/suite, script, named manual/hardware procedure, or evidence-collection procedure that implements the oracle. If several checks jointly form one oracle, list all required checks rather than a convenient subset.  
Supporting fixtures / evidence  
Optional exact fixture, trace, golden case, schema, evidence path, or reference used to execute or validate the oracle.  
Review status  
One of: not-required | pending | approved | rejected. Class C cannot be frozen while review status is pending/rejected.  
Review owner / result  
Who/what performed the required review and where the review result is recorded. For Class C, this identifies the stronger-reasoning review or equivalent direct review.  
Freeze status  
One of: draft | frozen | superseded | retired.  
Frozen baseline  
When practical, identify the commit/build/spec revision at which the oracle became frozen. This avoids a registry entry referring ambiguously to a later-edited test.  
Change authority  
State the minimum authority required to change expected behavior, thresholds, formulas, tolerances, classification, or interpretation. Ordinary implementation tasks should usually say: “None — contract/architecture review required,” or another precise equivalent.  
M1 / milestone applicability  
State whether the oracle is required by M1, a later milestone only, or not applicable to the current milestone.  
Handoff references  
List docs/handoff/\<subsystem\>.md packages that consume this oracle when applicable.  
Notes / limitations  
Keep short. Record only information necessary to prevent misuse, such as environment limits or what the oracle does not prove.

# 7\. Status Semantics

Review status:  
• not-required — Class A/B expectation is mechanically derived from an already-frozen authority and no stronger review is required  
• pending — required review has not completed; dependent implementation must not treat the oracle as frozen  
• approved — required review completed and accepted the oracle definition  
• rejected — review found the proposed oracle invalid/incomplete; dependent work is blocked  
Freeze status:  
• draft — may still change; not an accepted implementation gate  
• frozen — accepted source of correctness for its stated scope  
• superseded — retained for history; a replacement Oracle ID is authoritative  
• retired — no longer governs active behavior and has no replacement requirement  
A registry row is M1-ready only when its governing authority is stable, its required review is complete, and freeze status is frozen.

# 8\. Recommended Markdown Structure

The repo file should use a compact summary table first, followed by optional detail blocks only for complex oracles.  
Recommended summary columns:  
Oracle ID | Class | Subsystem / Governed Behavior | Governing Authority | Authoritative Test / Procedure | Review | Freeze | Change Authority  
Keep paths and requirement IDs concise. Use relative repo paths where possible.  
For a complex Class C oracle, add a short detail section below the table only when the table cannot safely express invalid-run rules, multi-part procedure references, or review/supersession context. The detail block still points to—not copies—the full experiment/test specification.

# 9\. Canonical Record Template

Use this template when adding a new oracle:  
Oracle ID: ORC-\<SUBSYSTEM\>-\<NNN\>  
Subsystem: \<name\>  
Governed behavior: \<one sentence\>  
Classification: Class A | Class B | Class C  
Governing authority: \<requirement / ADR / spec / conformance ID\>  
Authoritative test / procedure: \<repo-relative path / suite / named procedure\>  
Supporting fixtures / evidence: \<paths or none\>  
Review status: not-required | pending | approved | rejected  
Review owner / result: \<reference or not-required\>  
Freeze status: draft | frozen | superseded | retired  
Frozen baseline: \<commit/build/spec revision or not-yet-frozen\>  
Change authority: \<explicit authority required\>  
Milestone applicability: \<M0/M1/M2/etc.\>  
Handoff references: \<paths or none\>  
Notes / limitations: \<short text or none\>

# 10\. Lifecycle

1\. Propose — A requirement/contract/experiment identifies a reusable correctness question.  
2\. Classify — Mark the oracle A/B/C under the Testing Strategy.  
3\. Implement draft oracle — Create the test/procedure/harness and link its governing authority.  
4\. Review — Obtain stronger review for Class C or any lower-class oracle whose expectation actually resolves architecture ambiguity.  
5\. Freeze — Mark frozen only when the governing authority, test/procedure, relevant fixtures, review outcome, and change authority are unambiguous.  
6\. Register — Add/update the Oracle Registry row and relevant subsystem handoff reference.  
7\. Consume — Bounded tasks cite Oracle ID(s), run the authoritative verification, and normally receive no oracle-change authority.  
8\. Change — If accepted semantics must change, obtain the required review first, update the authoritative source/test, then update the registry and handoff in the same reviewed change.  
9\. Supersede/retire — Preserve history; do not delete an oracle that appears in old evidence/ADRs/task records.

# 11\. Task-Specification Integration

When the registry exists, the Task Specification & Definition of Done Template should cite Oracle IDs in addition to exact test/procedure paths.  
A normal implementation task should state:  
• Oracle Registry ID(s)  
• exact authoritative test/procedure to run  
• current review/freeze status  
• oracle change authority, normally none  
The task may load the compact registry row instead of broad testing/architecture documentation when the row and handoff package provide sufficient context.  
If the task discovers that the registry row is stale, ambiguous, not frozen, or inconsistent with its governing authority, the task stops rather than repairing the expectation opportunistically.

# 12\. Handoff and M1 Readiness Integration

Each M0 subsystem handoff that M1 consumes should list the relevant Oracle IDs and identify which are frozen for M1.  
Verification Readiness support:  
The Oracle Registry must expose the records and metadata required by the Testing Strategy’s Verification Readiness procedure. M0H applies the Testing Strategy; this design does not define a separate pass/fail checklist.  
M1A revalidates the M1-required Oracle Registry references against the actual starting commit and reports drift rather than silently repairing or reinterpreting authority.

# 13\. Initial Planned Oracle Categories

The registry should be populated incrementally as implementation produces real executable/procedural oracles. Likely early categories include:  
• projection geometry and off-axis screen-corner/NDC invariants  
• perspective-strength transform behavior  
• ViewerStateController loss, neutral-return, and reacquisition timing  
• packaged synthetic smoke behavior  
• pose-estimator experiment metrics/procedure and production-selection evidence  
• calibration model acceptance  
• filter replay/tuning acceptance  
• world manifest/discovery conformance  
• world lifecycle/settings/assets/isolation conformance  
• public world SDK API-surface and static world/host boundary checks  
• packaged local ESM loader behavior  
• persistence atomic-write/recovery behavior  
This list is planning guidance, not a declaration that these oracles already exist or are frozen.

# 14\. Illustrative Registry Row

The following is illustrative only and must not be treated as an implemented/frozen oracle before the repository test exists and required review completes.  
Oracle ID: ORC-PROJ-001  
Subsystem: Projection  
Governed behavior: Physical display corners project to the expected NDC boundaries under the accepted off-axis projection model.  
Classification: Class C  
Governing authority: TDS projection section \+ ADR-008 (exact repo/spec references to be linked when instantiated)  
Authoritative test / procedure: tests/.../off-axis-projection.test.ts (planned path; final path recorded at implementation)  
Supporting fixtures / evidence: deterministic centered/off-axis ScreenGeometry \+ ViewerPose fixtures  
Review status: pending until implementation/review  
Review owner / result: stronger-reasoning review required  
Freeze status: draft  
Frozen baseline: not-yet-frozen  
Change authority: none for ordinary implementation; architecture/oracle review required  
Milestone applicability: M0B and required by M1

Handoff references: docs/handoff/projection.md (planned)  
Notes / limitations: numerical oracle only; does not by itself prove perceptual illusion quality.

# 15\. Maintenance Rules

• Keep one current row per active Oracle ID.  
• Do not silently edit a frozen oracle’s meaning in the registry; update the authoritative source and required review first.  
• Path-only changes that do not alter semantics may update the registry without creating a new Oracle ID, but the handoff/task references should be updated in the same change.  
• Semantic changes to a frozen oracle must follow its recorded change authority.  
• Superseded rows remain visible and point to their replacement Oracle ID.  
• Do not use the registry to bless implementation-specific snapshots that lack an external requirement/contract basis.  
• Prefer stable requirement IDs and Oracle IDs over duplicated prose.

# 16\. Repository Creation Timing

Because the World Viewer repository is not yet available/connected, this Google Doc is the planning source for the future repo artifact.  
When M0A creates the repository foundation, create docs/testing/oracle-registry.md from this design and begin it with the header/legend/template even if only a few oracle records exist initially.  
The first repo version should remain hand-maintained Markdown. Automated validation can be added later if registry drift becomes a measured problem.

# 17\. Design Decision

D-ORACLE-01 — Lightweight Oracle Registry: World Viewer will maintain docs/testing/oracle-registry.md as a compact repo-local index of reusable accepted correctness oracles. Records use stable Oracle IDs and identify governed behavior, A/B/C classification, governing authority, authoritative test/procedure, review status/result, freeze status/baseline, change authority, milestone applicability, and relevant handoff references. The registry is navigational metadata, not a duplicate normative specification. All Class C and reusable frozen Class B oracles should be registered; routine Class A tests are registered only when they become shared/canonical. Ordinary implementation tasks cite frozen Oracle IDs and normally have no authority to change them.  
D-ORACLE-02 — Repository placement and ownership: docs/testing/oracle-registry.md is owned as a verification-governance navigation artifact. The Testing Strategy owns classification/review/freeze rules; governing requirements/contracts/ADRs/experiment specs own intended behavior; authoritative tests/procedures own executable checks; the registry owns only stable IDs, links, status/freeze metadata, and change authority. Registry/source conflicts make the registry stale and block dependent work. Non-semantic pointer/path updates may occur inside bounded work; semantic oracle changes require the recorded review authority and authoritative-source/test changes first. After M0A creates the repo file, it becomes the active execution/navigation artifact and this design document becomes planning/history only.  
