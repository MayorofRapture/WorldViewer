# Task Specification & Definition of Done Template

## Draft v0.4

# Document Status

Draft version: 0.4  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Task Specification & Definition of Done Template

Primary related artifacts:  
• Milestone Roadmap, Draft v0.15  
• Technical Design Specification, Draft v0.18  
• Testing Strategy, Draft v0.15  
• World Package Conformance Specification, Draft v0.4  
• Interface & Contract Specification, Draft v0.6

This artifact defines the standard execution wrapper for bounded implementation tasks. It is intentionally compact and operational. It does not replace the authoritative product, architecture, interface, conformance, testing, ADR, registry, or subsystem-handoff sources that a task references. Draft v0.4 standardizes reuse language and approval authority: tasks use the canonical “Reuse Mode” and “Prohibited Reinvention” fields, and a subsystem handoff may reference an approval but can never be named as the reuse Approval Source.

# 1\. Purpose

The purpose of this template is to let an implementation agent work from a small, explicit context set without being asked to reconstruct architecture from the full project documentation.

A well-formed task specification must tell the agent:

• exactly what outcome to produce  
• exactly which implementation model/reasoning level should execute the task  
• exactly which context is required  
• exactly what files/areas it may change  
• exactly what it must not redesign  
• exactly how correctness will be verified  
• exactly which test/oracle source defines correctness, its Class A/B/C classification, review/freeze status, and change authority  
• exactly which approved dependency/reference should be reused and the permitted custom-code boundary  
• exactly when it must stop and escalate

The template is designed to make Luna-Medium the default for routine implementation after contracts are frozen, with Terra or stronger reasoning reserved for genuine cross-boundary integration or architecture review.

# 2\. Authority and Source-of-Truth Rule

A task specification is a derived execution artifact, not a new source of architectural truth.

Authority order for task execution:

1\. latest explicit task instruction  
2\. accepted/frozen ADRs and authoritative interface/contract specifications relevant to the task  
3\. subsystem-specific normative specifications such as the World Package Conformance Specification  
4\. authoritative source code/interfaces/configuration and approved schemas  
5\. executable tests/oracles/fixtures that implement the accepted contract  
6\. relevant docs/handoff/ subsystem note  
7\. this task specification

The handoff note and task specification should point to authoritative material rather than copying it.

If two authoritative sources materially conflict, the implementation task stops. The agent must not choose one silently, broaden context until it can invent a reconciliation, or change tests/contracts to make the task convenient.

# 3\. Task Granularity Standard

One task specification should represent one bounded implementation outcome.

Prefer tasks that can be described as:

“Implement or modify this behavior inside this frozen boundary, using these references, and make these exact checks pass.”

Avoid tasks that amount to:

• design a subsystem  
• improve the architecture  
• make the codebase cleaner  
• implement an entire milestone  
• change whatever is necessary  
• investigate and fix anything related

A task may cross more than one file or module when those files form one clear implementation boundary. If the task requires independent architectural decisions in multiple subsystems, split it before implementation.

# 4\. Required Task Template

The following sections are mandatory for ordinary implementation tasks unless explicitly marked optional below.

## 4.1 Task Metadata

Task ID:  
Milestone / slice:  
Task title:  
Task type: implementation | refactor-without-behavior-change | test | evidence | integration | documentation  
Implementation model:  
Implementation reasoning level:  
Target repository:  
Baseline branch/commit:  
Status: proposed | ready | blocked | complete

The implementation model/reasoning fields identify the intended execution model, not the owner of architecture or oracle decisions. They do not grant permission to broaden scope, change accepted correctness criteria, select a new dependency, or make architecture decisions.

## 4.2 Objective

State one observable outcome.

Required form:

“Change \<bounded component/behavior\> so that \<observable result\>, while preserving \<relevant frozen behavior/boundary\>.”

The objective should be understandable without reading the entire roadmap.

## 4.3 Preconditions / Entry Conditions

List only conditions that must already be true before the task can safely begin.

Examples:  
• required M0 handoff package is marked ready  
• relevant ADR is Accepted  
• referenced test fixture exists  
• upstream task/commit is present  
• working tree is clean or contains only explicitly expected changes  
• packaged smoke harness is already available

If a required precondition is false, the task is blocked rather than partially implemented.

## 4.4 Required Context

Provide the smallest context set that is sufficient to execute the task correctly.

Use these subgroups:

Authoritative contract/specification  
• exact section, requirement ID, ADR, or schema relevant to this task

Subsystem handoff  
• relevant docs/handoff/\<subsystem\>.md when consuming a handoff-ready subsystem

Source files  
• exact source files/directories the agent should inspect

Oracle Registry / tests / fixtures  
• Oracle ID: \<ORC-\* | none\>  
• Governing authority: \<exact requirement ID, contract section, Accepted ADR, experiment specification, conformance requirement, or other authoritative source\>  
• Authoritative test / procedure: \<exact test path/suite, script, named procedure, schema, trace, or golden case\>  
• Supporting fixtures/evidence: \<exact paths/IDs or “none”\>  
• Classification: Class A routine deterministic | Class B integration/conformance | Class C architecture-critical | not applicable  
• Review status: not-required | pending | approved | rejected  
• Review owner/result: \<model/person/review reference or “not-required”\>  
• Freeze status: draft | frozen | superseded | retired  
• Frozen baseline: \<commit/build/spec revision or “not-yet-frozen”\>  
• Oracle change authority: \<none | exact authorized semantic changes \+ required reviewer\>  
When consuming a handoff-ready subsystem, the Oracle ID and statuses must match docs/testing/oracle-registry.md and the subsystem handoff. If no reusable registered oracle applies, write Oracle ID “none”; do not invent an ORC-\* record solely to satisfy the template.

Reuse & Dependency Register / approved plan  
• REUSE ID: \<REUSE-\* | none\>  
• Reuse-entry status: candidate | evaluating | approved | blocked | superseded | retired | not applicable  
• Approved component/reference: \<library/package/algorithm/reference implementation/path or “none”\>  
• Approval source: \<Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, explicitly authorized non-architectural task decision, or “not applicable”\>  
• Handoff reference: \<optional docs/handoff/\<subsystem\>.md that cites this approval; informational only, never the Approval Source\>  
• Reuse Mode: adopt directly | adapt approved reference | compose approved primitives | project-specific custom implementation | not applicable  
• Version/source constraint: \<pinned/allowed version, source commit, spec revision, or “not applicable”\>  
• Permitted custom-code boundary: \<exact adapter/wrapper/project-specific logic that may be written\>  
• Prohibited Reinvention: \<mature behavior the task must not replace, bypass, duplicate, or rebuild\>  
When consuming an approved registered reuse choice, the REUSE ID, status, component/reference, and boundaries must match docs/reuse-register.md and the subsystem handoff. If no material registered reuse decision applies, write REUSE ID “none” and status “not applicable.”  
Reference implementation  
• known-good implementation/example when one exists; this is execution context, not authority to override the approved reuse/dependency plan

Evidence  
• exact evidence/ path only when measurements or prior experiment results materially affect implementation

Optional context  
• material that may be opened only if a named condition occurs

Do not load by default  
• explicitly list broad artifacts that are unnecessary for ordinary execution when useful, for example the full PRD, full TDS, unrelated ADRs, or unrelated evidence trees

The context list should use paths/links/IDs, not reproduced copies of large source material.

## 4.5 Allowed Scope

Define exactly what the task may change.

Include:

Files/directories allowed to modify:  
• \<paths\>

Behavior allowed to change:  
• \<specific behavior\>

Tests allowed to add/modify:  
• \<paths and purpose\>

Dependencies/configuration allowed to change:  
• \<explicitly allowed items or “none”\>  
Permitted custom-code boundary:  
• \<exact project-specific logic the task may add/change; state “none beyond approved adapter/wrapper” when appropriate\>

Documentation/handoff updates allowed:  
• \<specific files or “none unless required by Definition of Done”\>

Ordinary implementation should not use “and anything else needed” as a scope statement.

## 4.6 Prohibited / Out-of-Scope Changes

State the boundaries that must remain untouched.

Unless the task explicitly grants reviewed authority, ordinary implementation must not:

• change a frozen public interface or capability boundary  
• change or supersede an Accepted ADR  
• change a test/oracle classification, review status, freeze status, expected result, threshold, tolerance, metric formula, or acceptance interpretation outside explicit oracle-change authority  
• weaken/delete/replace an established test oracle merely to make new code pass  
• broaden world access to host-private modules or capabilities  
• add remote runtime dependencies to an offline path  
• introduce an alternative implementation beside the canonical reference implementation when the architecture requires one shared implementation  
• replace an approved mature dependency/reference implementation with bespoke code unless the task explicitly authorizes that decision  
• write project-specific code outside the stated permitted custom-code boundary  
• add speculative abstractions/frameworks/generalization unrelated to the objective  
• refactor unrelated subsystems  
• modify package/dependency architecture without explicit scope  
• change evidence procedures or metric formulas during evidence-collection tasks

Task-specific exclusions should be added below these defaults.

## 4.7 Deliverables

List concrete outputs.

Examples:  
• implementation files  
• tests/fixtures  
• schema/config changes  
• generated package or build script  
• evidence artifact  
• handoff-note update  
• completion summary

Deliverables should be inspectable. Avoid vague outputs such as “improve robustness.”

## 4.8 Verification

Provide exact verification commands and acceptance conditions.

Required categories where applicable:

Static verification  
• typecheck  
• lint/format  
• architecture-boundary/API-surface checks

Deterministic tests  
• exact test command/suite  
• expected pass criteria

Build/package verification  
• exact build/package command

Packaged/runtime verification  
• exact packaged smoke mode or integration command

Manual/hardware verification  
• named procedure and expected result when automation cannot prove the requirement

Evidence output  
• exact evidence/ destination and schema/format when applicable  
Test / oracle authority  
• Oracle ID: \<ORC-\* | none\>  
• Governing authority: \<exact authoritative requirement/contract/ADR/experiment/conformance source\>  
• Authoritative test / procedure: \<exact executable/procedural oracle\>  
• Classification: Class A | Class B | Class C | not applicable  
• Review status: not-required | pending | approved | rejected  
• Review owner/result: \<model/person/reference or “not-required”\>  
• Freeze status: draft | frozen | superseded | retired  
• Frozen baseline: \<commit/build/spec revision or “not-yet-frozen”\>  
• Oracle change authority: \<none | exact authorized semantic changes \+ required reviewer\>

A task is not complete because code compiles if an executable behavioral oracle exists.

An implementation agent must not edit the expected result, test oracle, fixture, or acceptance threshold unless the task explicitly grants that authority.

## 4.9 Escalation / Stop Conditions

The task must stop rather than improvise when any of the following occurs:

• completing the objective appears to require changing a frozen interface or public capability  
• an Accepted ADR conflicts with the required implementation  
• two authoritative sources materially disagree  
• an established test/oracle appears incorrect and changing it is outside task authority  
• a required Oracle ID is missing, stale, superseded/retired when a current oracle is required, or disagrees with docs/testing/oracle-registry.md or the subsystem handoff  
• a required Class C oracle is not yet approved/frozen, or its review/freeze status is unclear  
• completing the task appears to require changing oracle classification, threshold, tolerance, formula, or interpretation beyond stated oracle change authority  
• a required REUSE ID is missing, not approved for implementation, stale, superseded/retired when a current reuse entry is required, or disagrees with docs/reuse-register.md or the subsystem handoff  
• the approved component/reference cannot satisfy the frozen requirement within the permitted custom-code boundary  
• completing the task would require adding, replacing, or bypassing a dependency/reference not authorized by the approved reuse/dependency plan  
• a new cross-subsystem dependency is required  
• the task would need files/directories outside Allowed Scope for a substantive change  
• a security/offline/package-isolation boundary would need to be relaxed  
• a required architecture choice is still experimental, provisional, or undocumented  
• packaged Tauri/WebView2 behavior contradicts the frozen design in a way that cannot be resolved inside the task boundary  
• measurement/evidence procedures would need to be changed to obtain a passing result

When blocked, report:

1\. the exact stop condition  
2\. the smallest reproduction/evidence  
3\. the authoritative sources involved  
4\. what change appears necessary  
5\. why that change exceeds task authority  
6\. the recommended review owner/model level if known

Do not implement a workaround that silently changes architecture.

## 4.10 Definition of Done

Unless the task provides a stricter Definition of Done, all applicable items below are required:

• objective is satisfied  
• all listed deliverables exist  
• code typechecks  
• relevant deterministic tests pass  
• no unrelated tests regress  
• applicable architecture-boundary/API-surface checks pass  
• packaged verification passes when the task touches Tauri/WebView2/worker/CSP/local module loading/package assets  
• required manual/hardware verification is completed when applicable  
• required evidence artifacts are written and validate  
• no temporary debug bypass/mock remains in production paths  
• no unrelated files were changed  
• Oracle ID (when applicable), governing authority, authoritative test/procedure, classification, review status, freeze status, frozen baseline, and oracle change authority are explicit for every materially relevant registered oracle  
• any required Class C oracle was reviewed/frozen before implementation acceptance  
• no frozen contract/ADR/test oracle was changed without explicit task authority  
• REUSE ID (when applicable), reuse-entry status, approved component/reference, permitted custom-code boundary, and Prohibited Reinvention are explicit and the approved reuse/dependency plan was followed  
• implementation stayed inside the permitted custom-code boundary  
• no approved mature component/reference was replaced or bypassed without explicit task authority  
• relevant docs/handoff/ note remains accurate when governed implementation/tests/evidence/limitations/commands changed  
• documentation/ADR updates explicitly required by the task are complete  
• completion report identifies everything run and anything not run

A task that triggers an escalation condition is not failed work. Its correct outcome is Blocked with an escalation report, not an unauthorized architectural change.

## 4.11 Completion Report

The implementation agent should return a compact completion report using this structure:

Outcome:  
• Complete | Blocked | Partially complete by explicit authorization

Baseline:  
• branch/commit  
• starting working-tree condition

Changed:  
• files/components changed  
• one-line purpose for each logical group

Verification:  
• commands run  
• pass/fail counts/results  
• packaged/manual checks  
• evidence artifact paths  
• Oracle ID \+ governing authority \+ authoritative test/procedure \+ Class A/B/C classification  
• oracle review status, freeze status, frozen baseline, and whether any accepted expectation changed  
• oracle change authority used, if any  
Reuse/dependency:  
• REUSE ID \+ reuse-entry status  
• approved component/reference used  
• confirmation that the permitted custom-code boundary and prohibited-reinvention rule were respected  
• any explicitly authorized dependency/reference deviation

Scope:  
• confirmation that changes stayed within Allowed Scope  
• any explicitly authorized deviation

Architecture:  
• confirmation that no frozen contract/ADR/oracle was changed  
• or reference to the approved architecture/oracle change  
• confirmation that approved reuse/dependency constraints were preserved, or reference to the authorized change

Handoff/documentation:  
• files updated, if applicable

Remaining:  
• known limitations  
• deferred items  
• escalation details if blocked

Final repository state:  
• branch/commit if committed  
• working-tree status

# 5\. Context-Minimization Rules

The Required Context section is the main mechanism for controlling model/token usage.

Rules:

• Start with the task specification itself.  
• Load only the named contract sections, source files, tests/fixtures/oracle source, approved reuse/dependency plan, reference implementation, handoff note, and evidence required by the task.  
• Prefer requirement IDs and file paths over entire documents.  
• Do not attach the full project specification set “just in case.”  
• Do not load unrelated ADRs.  
• Do not recursively load every document referenced by a handoff note unless the task actually needs it.  
• A reference implementation helps execution but does not outrank the written contract or approved reuse/dependency plan.  
• When a task names an oracle registry entry or reuse/dependency register entry, load that compact entry rather than broad project documentation unless escalation requires more context.  
• If the bounded context reveals a true architecture conflict, escalate. Do not solve architecture ambiguity by simply expanding context until a plausible answer appears.

The goal is sufficient context, not maximum context.

# 6\. Scope-Control Rules for AI Agents

An agent executing an ordinary implementation task should treat Allowed Scope as a hard boundary.

Minor incidental edits may be acceptable only when they are mechanically required by an authorized change, such as an import update caused by moving a file that the task explicitly moves. They should be reported.

The following are not minor incidental edits:

• adding a new public capability  
• moving ownership between subsystems  
• introducing a new framework/dependency  
• replacing an accepted algorithm  
• changing persistence format  
• changing package-loading strategy  
• changing an established test oracle, its Class A/B/C classification, review/freeze status, threshold, tolerance, formula, or interpretation outside explicit oracle-change authority  
• replacing/bypassing an approved dependency/reference implementation  
• writing custom code beyond the permitted custom-code boundary  
• creating a second source of truth

These require explicit authority or escalation.

# 7\. Verification-First Authoring Rule

Whenever practical, the person/model authoring a task specification should identify both the verification oracle and the approved reuse/dependency plan before assigning implementation.  
A strong low-cost-model task usually has this shape:  
1\. frozen contract  
2\. explicit implementation model and reasoning level  
3\. named test/oracle source and Class A/B/C classification  
4\. required oracle review/freeze state already satisfied, especially for Class C  
5\. explicit oracle change authority, normally none for implementation-only work  
6\. approved mature dependency/reference implementation where applicable  
7\. permitted custom-code boundary  
8\. bounded source scope  
9\. exact verification commands  
10\. explicit stop conditions  
When those ingredients are missing, the task may still be valid, but the implementation model/reasoning level should increase until ambiguity is removed or the task should remain Blocked.  
Stronger reasoning should be spent defining or reviewing architecture-critical correctness, not on routine harness or implementation boilerplate after the oracle is frozen.

# 8\. Task Authoring Checklist

Before marking a task Ready, verify:

• Is there one clear objective?  
• Are entry conditions satisfied or explicitly checkable?  
• Is the minimum required context named?  
• Are authoritative sources distinguished from examples/handoff notes?  
• Are allowed files/behaviors explicit?  
• Are prohibited changes explicit?  
• Are deliverables inspectable?  
• Is the implementation model/reasoning level explicit and based on the remaining ambiguity/integration risk?  
• Is the Oracle ID named when a registered oracle applies, and does it match the handoff/Oracle Registry?  
• Are the governing authority and authoritative test/procedure named?  
• Is every materially relevant test expectation classified as Class A, B, or C?  
• Are Review status and Freeze status explicit using the Oracle Registry vocabulary, and has required Class C review completed?  
• Is oracle change authority explicit, normally “none” for implementation-only tasks?  
• Is the REUSE ID named when a registered reuse decision applies, and does its status match the handoff/Reuse Register?  
• Is the approved component/reference explicit when mature components or reference implementations apply?  
• Are the permitted custom-code boundary and Prohibited Reinvention explicit?  
• Are verification commands exact?  
• Are packaged/manual checks included when relevant?  
• Are escalation conditions explicit?  
• Does the Definition of Done match the Testing Strategy?  
• Can an agent tell when to stop rather than redesign?  
• Can the task normally be completed without loading the entire project documentation?  
• Is the implementation model level based on remaining ambiguity/integration risk rather than task size alone?

If several answers are no, the task is not ready for low-cost implementation.

# 9\. World-Package Task Specialization

For ordinary world-package tasks after the relevant contract is frozen, Required Context should normally be limited to:

• this bounded task specification  
• relevant World Package Conformance Specification requirement IDs/sections  
• relevant src/world-sdk public contract files  
• relevant reusable conformance tests/fixture worlds, including their Class B Oracle ID/source/authority when registered  
• relevant ORC-\* entries from docs/testing/oracle-registry.md when the task consumes registered world-package oracles  
• relevant REUSE-\* entries from docs/reuse-register.md when the task consumes a selected library/reference  
• diagnostic reference-world files only when an implementation example is useful  
• exact verification commands  
• docs/handoff/world-packages.md when consuming the frozen M0 subsystem

Do not load the full PRD, NFR, TDS, Testing Strategy, and ADR set by default.

Applicable world-package Definition of Done additions:

• reusable conformance suites pass  
• static world/host boundary check passes  
• public SDK API-surface guard passes when the public entrypoint is touched  
• required fixture-world tests pass  
• packaged-runtime verification is rerun when discovery/loading/ESM/CSP/package assets/Tauri-WebView behavior is affected  
• diagnostic reference world remains conformant when public world-facing behavior changes  
• no diagnostic-only/private-host bypass is introduced

# 10\. Template Copy Block

Use the following compact structure when creating an implementation task:  
TASK ID / MILESTONE:  
TITLE:  
TYPE:  
IMPLEMENTATION MODEL:  
IMPLEMENTATION REASONING LEVEL:  
BASELINE:

OBJECTIVE  
\<one observable outcome\>

PRECONDITIONS  
\- ...

REQUIRED CONTEXT  
Authoritative contract/spec:  
\- ...

Handoff:  
\- ...

Source:  
\- ...

Oracle Registry / tests / fixtures:  
\- Oracle ID: ORC-... | none  
\- Governing authority: ...  
\- Authoritative test / procedure: ...  
\- Supporting fixtures/evidence: ...  
\- Classification: Class A | Class B | Class C | not applicable  
\- Review status: not-required | pending | approved | rejected  
\- Review owner/result: ...  
\- Freeze status: draft | frozen | superseded | retired  
\- Frozen baseline: ...  
\- Oracle change authority: none | \<explicit semantic changes \+ required reviewer\>

Reuse & Dependency Register / approved plan:  
\- REUSE ID: REUSE-... | none  
\- Reuse-entry status: candidate | evaluating | approved | blocked | superseded | retired | not applicable  
\- Approved component/reference: ...  
\- Approval source: Accepted ADR | authoritative TDS/interface/conformance decision | accepted experiment result | explicitly authorized non-architectural task decision | not applicable  
\- Handoff reference: optional docs/handoff/\<subsystem\>.md that cites the approval; never the Approval Source  
\- Reuse Mode: adopt directly | adapt approved reference | compose approved primitives | project-specific custom implementation | not applicable  
\- Version/source constraint: ...  
\- Permitted custom-code boundary: ...  
\- Prohibited Reinvention: ...

Reference implementation:  
\- ...

Evidence:  
\- ...

Optional context:  
\- ...

Do not load by default:  
\- ...

ALLOWED SCOPE  
Files/directories:  
\- ...  
Behavior:  
\- ...  
Tests:  
\- ...  
Dependencies/config:  
\- ...  
Permitted custom-code boundary:  
\- ...  
Documentation:  
\- ...

PROHIBITED / OUT OF SCOPE  
\- ...

DELIVERABLES  
\- ...

VERIFICATION  
Static:  
\- ...  
Tests:  
\- ...  
Build/package:  
\- ...  
Packaged/runtime:  
\- ...  
Manual/hardware:  
\- ...  
Evidence:  
\- ...

Test / oracle authority:  
\- Oracle ID: ORC-... | none  
\- Governing authority: ...  
\- Authoritative test / procedure: ...  
\- Classification: Class A | Class B | Class C | not applicable  
\- Review status: not-required | pending | approved | rejected  
\- Review owner/result: ...  
\- Freeze status: draft | frozen | superseded | retired  
\- Frozen baseline: ...  
\- Oracle change authority: none | \<explicit semantic changes \+ required reviewer\>

Reuse / dependency authority:  
\- REUSE ID: REUSE-... | none  
\- Reuse-entry status: candidate | evaluating | approved | blocked | superseded | retired | not applicable  
\- Approved component/reference: ...  
\- Permitted custom-code boundary: ...  
\- Prohibited Reinvention: ...

ESCALATION / STOP CONDITIONS  
\- ...

DEFINITION OF DONE  
\- ...

COMPLETION REPORT  
Return Outcome, Baseline, Changed, Verification, Oracle Registry, Reuse/Dependency, Scope, Architecture, Handoff/documentation, Remaining, and Final repository state.

# 11\. Design Decision

D-TASK-01 — Standard bounded implementation-task wrapper: ordinary implementation tasks use this template or an equivalent structure containing Required Context, Allowed Scope, Prohibited/Out-of-Scope Changes, Verification, Escalation/Stop Conditions, Definition of Done, and Completion Report. The task is a derived execution artifact and may not override authoritative contracts, accepted ADRs, registry records, or established test oracles. Context should be minimized to the material necessary for execution; architecture ambiguity stops and escalates rather than being resolved opportunistically inside a low-cost implementation task.  
D-TASK-02 — Explicit execution, oracle, and reuse authority: every implementation task must identify the implementation model/reasoning level, the governing test/oracle source and Class A/B/C classification when applicable, Oracle ID when registered, Review status, Freeze status, oracle change authority, REUSE ID when registered, reuse-entry status, approved component/reference, and permitted custom-code boundary/Prohibited Reinvention. Ordinary tasks default to no authority to alter accepted oracle expectations or substitute/reimplement approved mature components. Missing or contradictory authority blocks execution or raises the required review/model level rather than being resolved opportunistically by the implementation agent.  
D-TASK-03 — Direct registry consumption: bounded implementation tasks cite the relevant ORC-\* and REUSE-\* IDs when registered records apply. Oracle fields use the Oracle Registry vocabulary for governing authority, authoritative test/procedure, Review status (not-required | pending | approved | rejected), Freeze status (draft | frozen | superseded | retired), frozen baseline, and change authority. Reuse fields identify the REUSE ID, reuse-entry status, approved component/reference, permitted custom-code boundary, and Prohibited Reinvention. A task consuming a handoff-ready subsystem must match the handoff and repo-local registries; missing, stale, contradictory, superseded, retired, pending, or otherwise non-consumable records block ordinary implementation rather than being repaired opportunistically inside the task.  
D-TASK-04 — Reuse approval-source rule: “Reuse Mode” is the canonical A/B/C/D field and “Prohibited Reinvention” is the canonical restriction field. A reuse Approval Source may be an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision. A handoff note may reference that approval for execution context but must never be used as the Approval Source itself.

