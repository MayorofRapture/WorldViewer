# Milestone Roadmap

## Draft v0.15

# Document Status

Draft version: 0.15  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Milestone Roadmap  
Upstream artifacts:  
• Project Vision & Charter, Draft v0.2  
• Product Specification & PRD, Draft v0.2  
• Non-Functional Requirements, Draft v0.2  
• Interface & Contract Specification, Draft v0.6  
• Technical Design Specification, Draft v0.18  
• Architecture Decision Records — Index, Draft v0.4  
• Testing Strategy, Draft v0.15  
• World Package Conformance Specification, Draft v0.4  
• Task Specification & Definition of Done Template, Draft v0.4

This fifteenth draft replaces the blanket pre-Milestone-0 document checklist with staged specification readiness. The existing PRD/contracts now serve as the functional baseline instead of requiring a duplicate project-wide Functional Specification before M0A. UX/UI and Data Model/Persistence artifacts become slice-local gates before the first M0 work that commits those concerns—M0E1/M0E2 and M0G—and are revalidated before the corresponding Milestone 1 slices. This preserves specification discipline without front-loading documents that M0A–M0D do not need.

# 1\. Roadmap Purpose

The roadmap has four jobs:

• prevent high-risk technical assumptions from being hidden inside content work  
• keep implementation tasks small enough for efficient AI-assisted development  
• define when an experimental subsystem is mature enough to become a stable platform dependency  
• prevent “feature complete” from being confused with “accepted”

The implementation order intentionally validates projection, packaged Tauri behavior, live tracking, pose estimation, and world loading before investing heavily in polished content.

# 2\. Milestone Governance

Milestone rules:  
• Entry criteria must be satisfied before substantial work begins on the next milestone.  
• Exit criteria are evidence-based; code existence alone is insufficient.  
• Accepted ADRs are locked once implementation begins.  
• Architecture changes after that point require a superseding ADR.  
• Evidence-gated decisions must produce durable artifacts under the repository-level evidence/ directory.  
• A failed experiment may change the roadmap, but the failure and resulting decision should be recorded rather than silently worked around.  
• Scope may move between milestones only when the move reduces risk or preserves a cleaner dependency boundary.  
• Optional future capabilities do not enter a milestone merely because they are technically convenient to add.

M0 production handoff rule:  
• M0B through M0G must produce or update a repo-local subsystem handoff package under docs/handoff/ for every capability Milestone 1 will treat as stable.  
• Each handoff must conform to the canonical structure owned by the Technical Design Specification and, once created, operationalized by docs/handoff/README.md; this Roadmap does not restate or extend that field schema.  
• Handoff notes summarize and link to authoritative code, interfaces, tests, ADRs, evidence, and applicable ORC/REUSE registry records rather than replacing those sources.  
• M0H runs the handoff-readiness and architecture-freeze verification defined by the Testing Strategy before Milestone 1 may depend on the subsystem.  
World-package handoff rule:  
• the World Package Conformance Specification is the compact normative context for ordinary world-package implementation tasks, subordinate to the Interface & Contract Specification and accepted ADRs.  
• the diagnostic room is the canonical reference world but is not privileged and is not itself the source of truth.  
• the public world-facing contract is treated as stable for Milestone 1 only after the diagnostic reference world passes the applicable reusable conformance suites, static world/host boundary checks, and packaged-runtime tests through the production package-loading path.  
• the required minimal fixture-world catalog and automated world/host architecture-boundary enforcement must be present before the world subsystem is handed to Milestone 1\.

# 3\. Pre-Implementation Readiness Gate

World Viewer uses staged specification readiness. A specification must be sufficiently frozen before the first implementation slice that would otherwise have to invent the behavior, data shape, UI flow, or ownership rule it governs; it is not required earlier merely because it appears on a generic project-document checklist.

Milestone 0 entry baseline:  
• the Product Specification & PRD, together with the Interface & Contract Specification, Non-Functional Requirements, accepted ADRs, and TDS, is the functional baseline for Milestone 0  
• a separate project-wide Functional Specification is not required to begin M0A; if a bounded slice exposes user-observable behavior that is not already defined by the PRD/contracts, that slice is Blocked until the behavior is added to the existing authoritative product/contract artifact or, when the gap is broad enough to justify it, a focused Functional Specification is created  
• the Task Specification & Definition of Done Template must be accepted sufficiently to standardize Required Context, Allowed Scope, Verification, Escalation/Stop Conditions, and task-level Definition of Done  
• the World Package Conformance Specification must be accepted sufficiently to drive M0B/M0F world-boundary, reference-world, fixture, and conformance work  
• M0A–M0D do not require a project-wide UX/UI Specification or Data Model & Persistence Specification merely to start; they may not, however, commit unresolved UI or persistence behavior outside the contracts already frozen for those slices

Staged specification gates:  
• before M0E1 begins, a Data Model & Persistence Specification must be sufficiently frozen for the persisted entities and semantics M0E1 will commit, including display/calibration profile identity, calibration data shape, versioning/validation, atomic-write expectations, and recovery/migration behavior that is already required by the accepted contracts  
• before M0E2 begins, a UX/UI Specification must be sufficiently frozen for the calibration flow M0E2 will implement, including physical display-dimension entry, camera preview/identification, camera-to-screen offset entry where required, neutral-pose capture, reset/retry, and reliable access back to host controls  
• before M0G begins, the Data Model & Persistence Specification must be expanded/revalidated for application state, display profiles, calibration profiles, world settings, package-version reset, diagnostics/export persistence, corruption/unsupported-version recovery, and concrete file/directory ownership needed by the slice  
• before M0G implements user-facing settings, diagnostics, export, or recovery behavior, the UX/UI Specification must be expanded/revalidated for those flows, including schema-driven settings presentation, status/diagnostics presentation, export actions, and expected recovery paths  
• before M1C, M1E, or M1F consumes these artifacts, the relevant Data Model/Persistence or UX/UI sections are revalidated against the accepted M0 handoff rather than recreated from scratch

Specification-minimization rule:  
• do not create a new specification merely to duplicate requirements already owned by the PRD, Interface & Contract Specification, NFRs, TDS, WPC, or accepted ADRs  
• prefer adding a focused section to the existing authoritative artifact when the missing decision clearly belongs there  
• create a dedicated Functional, UX/UI, or Data Model/Persistence artifact only when it has a distinct source-of-truth role and enough material to justify independent maintenance  
• a slice with a real specification gap remains Proposed/Blocked until that gap is resolved; an implementation agent must not fill it opportunistically

Entry into Milestone 0 therefore requires the current architecture, contract, verification, reuse, and task-authoring baseline to be ready for the slice being executed—not every later product/UI/persistence detail to be specified in advance.

# 4\. Roadmap Overview

Milestone 0 — Core Feasibility and Virtual-Window Proof  
Prove the illusion, tracking pipeline, packaged runtime, local world loading, reusable world-package conformance infrastructure, diagnostics, and acceptance measurements.

Milestone 1 — Reusable Engine and Host Baseline

Productionize the successful Milestone 0 implementation while preserving the already-validated public world-facing contract. Ordinary M1 work hardens, integrates, and cleans up frozen M0 subsystems rather than redesigning the world API.

Milestone 2 — First Production World  
Build the first substantial content world using only the public world-package contract and measure the platform under realistic content load.

Milestone 3 — Reusability Validation and World Authoring Hardening  
Build a contrasting second world or equivalent reference package to prove that the engine is not accidentally specialized around the first world; refine world-authoring guidance and SDK boundaries.

Milestone 4 — Personal v1 Hardening and Release Baseline  
Stabilize the application for normal personal use, clean packaging, repeatable installation/setup, regression coverage, and durable documentation.

Future milestones remain optional and evidence-driven.

# 5\. Milestone 0 — Core Feasibility and Virtual-Window Proof

Goal:  
Demonstrate that the core head-tracked fixed-window illusion is technically credible on the reference ThinkPad E590 and that the chosen Tauri/Three.js/MediaPipe architecture can support it fully offline.

Milestone 0 is intentionally not a polished content milestone. The diagnostic room is the primary world.

Primary risks addressed:  
• off-axis projection math/sign/scale errors  
• packaged Tauri/WebView2 incompatibility  
• MediaPipe worker/frame-transfer latency  
• unstable monocular depth estimation  
• filter jitter/lag tradeoff  
• calibration burden  
• dynamic loading of local ESM world packages  
• accidental world/host coupling or dev-only success being mistaken for package conformance  
• cleanup/resource leaks  
• offline asset/runtime failures

## Class C oracle timing rule and Milestone 0 audit:

• any oracle whose expected result, metric definition, threshold/tolerance, procedure, or interpretation can select/reject architecture or materially determine Milestone 0 acceptance is Class C  
• Class C oracle design must complete stronger-reasoning review and freeze before Luna/Terra implementation, harness construction, or evidence collection consumes that oracle; post-implementation review may audit implementation/evidence but may not retroactively redefine the oracle  
• M0B projection corner/invariant/golden-case correctness is Class C and is reviewed/frozen before production projection implementation  
• M0D estimator formulas/comparison metrics/interpretation rules/live procedure are Class C and are reviewed/frozen before M0D4–M0D7  
• M0E calibration-model sufficiency and filter-selection metric/shortlist/default-selection criteria are Class C and are reviewed/frozen before M0E5/M0E6; M0E7 remains Logan’s perceptual evidence rather than a model-defined oracle  
• M0H consumes frozen NFR thresholds and earlier frozen oracles; any new or materially changed architecture-critical acceptance/performance metric/procedure receives Class C review/freeze before collection  
• M0A, M0C, M0F, and M0G are expected to rely primarily on Class A/B deterministic, integration, conformance, packaging, and contract-derived checks; if work in those slices would define a new architecture-selecting correctness criterion, it is reclassified Class C and stops for pre-freeze review

## M0A — Repository and Application Foundation

Deliverables:  
• Tauri 2 \+ React \+ TypeScript \+ Vite application foundation  
• Three.js/WebGLRenderer host canvas  
• initial source layout matching TDS subsystem boundaries  
• strict TypeScript configuration  
• Vitest baseline  
• production build/package path  
• repository-level evidence/ directory with README/purpose  
• baseline scripts for typecheck, test, build, package, and smoke verification  
• generic packaged-launch smoke harness established alongside the production packaging path  
• initial packaged smoke entrypoint that proves the executable can start, reach the minimal ready condition, report pass/fail, and terminate predictably

## 

• repository-level docs/handoff/ directory with docs/handoff/README.md materializing the canonical subsystem handoff structure defined by the Technical Design Specification; M0B–M0G populate subsystem notes from that canonical template as their handoff boundaries become real  
• docs/testing/oracle-registry.md created from the approved Oracle Registry design with its header/legend/record template ready for M0B–M0G population  
• docs/reuse-register.md created from the approved Reuse & Dependency Register design with its header/legend/entry template and global Do Not Build guardrail ready for M0B–M0G population  
Exit gate:  
• application starts in development  
• production package builds  
• baseline automated test command succeeds  
• packaged-launch smoke command succeeds without requiring Vite/localhost  
• no real tracking/content behavior required yet  
• docs/handoff/ contains a usable standard subsystem handoff template that points to authoritative code/tests/ADRs/evidence rather than duplicating them  
• docs/testing/oracle-registry.md exists in repo-local form and is structurally ready to receive real Oracle records  
• docs/reuse-register.md exists in repo-local form and is structurally ready to receive real REUSE records  
Registry lifecycle rule:  
• M0A creates the two repo-local registry files and their empty/initial structures  
• M0B–M0G update the relevant Oracle and REUSE records in the same bounded work that establishes or changes their authoritative source, evidence status, or handoff boundary  
• M0H runs the Testing Strategy’s Verification Readiness and Reuse Readiness procedures using the current Oracle and Reuse registries and records the resulting gate status as required by the Testing Strategy  
• M1A revalidates all M1-required records against the actual starting commit before downstream M1 slices consume them  
• a registry record that should have been maintained during M0B–M0G is not deferred to M0H as a documentation-reconstruction task  
Preferred agent profile:  
Luna for project scaffolding, scripts, and the generic smoke harness when interfaces are explicit; Terra only if Tauri/build behavior is unexpectedly ambiguous or platform-specific.

## 

## M0B — Deterministic Geometry, Projection, and Package-Shaped Diagnostic Reference World

Deliverables:  
• shared canonical millimeter geometry types  
• ScreenGeometry implementation  
• deterministic SyntheticViewerPoseSource  
• perspective-strength transform  
• engine-owned off-axis projection adapter  
• independent numerical projection oracle and golden-case test suite  
• compact M0B Projection Reference Pack  
• explicit src/world-sdk/ public world-facing source boundary for the contracts required by the reference world  
• host-private world infrastructure remains outside src/world-sdk/  
• baseline static world/host boundary check sufficient to prevent the diagnostic reference world from importing private host modules  
• package-shaped diagnostic reference world under worlds-dev/diagnostic-room/  
• world.manifest.json, package-local assets, and representative settings.schema.json/settings.ui.json authored in their eventual package locations  
• diagnostic room/grid with strong depth and edge cues  
• temporary static bootstrap that loads the package-shaped source only until the production runtime package loader exists  
• synthetic head-motion scripts

Diagnostic reference-world rule:  
• the diagnostic room implements the normal VirtualWorld/WorldContext/WorldFrame contract from the beginning  
• the temporary M0B/M0C bootstrap may change how the module is obtained, but it must not expose camera, MediaPipe, projection camera/controller, NativeHost, application persistence, or other host-private capabilities  
• early M0 validates the source/API/package shape; packaged-runtime conformance is not claimed until M0F builds dist/world.js and loads it through the production path  
• settings files may exist in package shape before the M0G settings UI is implemented; their presence does not pull M0G behavior into M0B

Projection Reference Pack:  
• frozen World Viewer coordinate convention, physical units, screen-corner definitions, and eye-position definition  
• DisplayXR Math Reference as the primary written derivation for the display-centric/window-into-world projection  
• DisplayXR display3d\_view implementation/self-test as the primary implementation reference  
• DisplayXR App Authoring Rules as a review checklist for projection invariants, matrix conventions, and common mistakes  
• Three.js Matrix4.makePerspective() documentation/source as the production matrix-construction primitive  
• Kooima generalized-perspective material as fallback theory when a reference needs interpretation  
• 8–12 canonical World Viewer test vectors and expected invariants

Implementation strategy:  
• treat projection as an adaptation task, not a fresh mathematical derivation  
• before production projection implementation begins, classify the numerical projection oracle/golden cases as Class C, complete stronger-reasoning review of the governing formulas/invariants/epsilon/coordinate conventions, and freeze the accepted oracle in the Oracle Registry; Sol-High is the default planning assumption unless Logan performs equivalent direct review or another approved planning artifact specifies an equivalent review path  
• only after that Class C oracle is frozen may Terra-Medium implement the production adapter from ScreenGeometry \+ viewer eye position to asymmetric frustum bounds and delegate matrix construction to THREE.Matrix4.makePerspective()  
• the production implementation must not invent an alternate projection algorithm unless the supplied references demonstrably fail a World Viewer requirement and the issue is escalated before implementation changes the oracle  
• the independent test oracle/golden cases must not simply duplicate the production implementation’s logic  
• Luna-Medium may implement deterministic geometry types, synthetic pose fixtures, package-shaped diagnostic-world scaffolding/content, and motion scripts once their interfaces are frozen; it does not author or reinterpret the Class C projection oracle  
• after implementation, use a separate Terra-High implementation audit to compare the production adapter against the already-frozen oracle and reference material; this audit may identify an implementation defect or escalate an oracle/reference conflict but may not rewrite the oracle to obtain a pass  
• Sol-High remains the escalation reviewer if authoritative references, the frozen oracle, and observed diagnostic behavior materially disagree

Exit gate:  
• all projection invariants pass  
• centered viewer produces the expected symmetric frustum  
• physical display corners map to expected NDC boundaries within a tight documented epsilon  
• mirrored left/right and up/down cases behave as mathematical mirrors  
• diagnostic room responds correctly to centered, lateral, vertical, near/far, and asymmetric synthetic poses  
• perspectiveStrength \= 0 and 1 behaviors are verified  
• invalid/non-finite geometry cannot produce an applied camera matrix  
• the Class C projection oracle has a recorded stronger-review result and frozen Oracle Registry entry before production projection implementation begins  
• production projection results agree with the independent frozen oracle across the canonical test set  
• Terra-High post-implementation audit finds no unresolved projection-sign, matrix-layout, unit, or clipping ambiguity and records no unauthorized oracle change  
• the diagnostic reference world is package-shaped and uses only the public world-facing source boundary  
• the baseline static world/host boundary check passes for the diagnostic reference world  
• no diagnostic-only/private-host capability is required by the temporary static bootstrap

Model plan:  
Class C projection-oracle design/review before freeze: Sol-High by default, or Logan/equivalent explicitly approved review.  
Primary projection implementation after freeze: Terra-Medium.  
Supporting deterministic/reference-world work: Luna-Medium where scope is narrow and interfaces are fixed.  
Independent post-implementation projection audit: Terra-High against the frozen oracle.  
Sol-High: escalation if implementation evidence conflicts with the frozen oracle/reference set or an architecture-significant oracle change is proposed.

Production handoff package:  
• update docs/handoff/projection.md for the projection subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md  
• begin the world-package handoff record with the public world-facing boundary and package-shaped diagnostic reference-world path; M0F completes the package/conformance/runtime-loading handoff

## M0C — Deterministic Viewer State and Packaged Synthetic Smoke

### M0C1 — Viewer State Controller

Deliverables:  
• ViewerStateController implemented against a fixed transition contract  
• injected monotonic clock for deterministic timing  
• defined interpolation/easing behavior rather than model-selected timing semantics  
• tracking-state transitions  
• 350 ms provisional loss-confirmation grace  
• 5-second neutral return  
• 300 ms provisional reacquisition blend  
• deterministic tests for interruption, loss, neutral return, reacquisition, reset, and invalid pose handling

## 

### M0C2 — Packaged Synthetic Smoke Mode

Deliverables:  
• extend the M0A packaged-launch harness with an application-native smoke mode  
• use SyntheticViewerPoseSource and the diagnostic room; no live webcam dependency  
• execute a known scripted pose sequence  
• perform internal smoke assertions for renderer readiness and viewer-state behavior  
• emit a structured pass/fail result  
• terminate with a predictable success/failure exit outcome  
• verify only the local assets required by M0C itself

## 

Explicit exclusions:  
• no MediaPipe integration  
• no webcam permission/capture testing  
• no calibration workflow  
• no live tracking  
• no dynamic local world-package loading  
• no full offline/static-asset completeness test

## 

Exit gate:  
• deterministic ViewerStateController timing tests pass  
• 350 ms / 5-second / 300 ms behavior is numerically verified under the injected clock  
• packaged application runs without Vite/localhost  
• application-native smoke mode initializes Three.js and the diagnostic room  
• synthetic viewer drives the known pose sequence successfully  
• structured smoke result is produced and the process exits predictably  
• no live computer-vision dependency exists in M0C

## 

Rationale:  
M0C extends a packaged-launch mechanism already established in M0A rather than designing packaging automation and viewer-state behavior at the same time. Full offline/static-asset verification remains with M0G, where the complete runtime asset set exists.

## 

Production handoff package:  
• update docs/handoff/viewer-state.md for the viewer-state subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md

## 

## M0D — Live Tracking Worker and Pose Estimator Experiments

Goal:  
Prove the packaged live-tracking pipeline and select a viable raw viewer-pose estimator through repeatable evidence while keeping implementation, evidence collection, and interpretation as separate responsibilities.

Execution boundaries:  
• M0D evaluates raw estimator output before host-level filtering; One Euro filtering and host calibration refinement remain M0E responsibilities  
• estimator formulas/reference methods, required inputs, metric formulas, acceptance/interpretation rules, evidence schema, and live test procedure that can select or reject a production estimator are Class C oracle material; they must receive stronger-reasoning review and be frozen in the Pose Estimator Experiment Specification/Oracle Registry before M0D4–M0D7 implementation or evidence collection consumes them  
• M0D7 executes a prescribed experiment and records evidence; it does not tune estimators, remove unfavorable samples, change metrics, or select a winner  
• M0D8 owns comparative interpretation and the architecture decision  
• OpenCV/solvePnP is not part of the baseline M0D implementation and is considered only as an evidence-driven escalation if neither simpler estimator is adequate

### M0D1 — MediaPipe worker boot and local asset loading

Deliverables:  
• locally packaged MediaPipe Face Landmarker model/WASM assets  
• tracking Web Worker initialization/shutdown  
• packaged WebView2 asset-loading path  
• structured ready/status/error reporting  
Exit gate:  
• worker initializes successfully in the packaged application with network access unavailable  
• model/WASM assets load locally  
• initialization failure produces a structured recoverable error

### M0D2 — Worker protocol and latest-frame backpressure

Deliverables:  
• versioned worker message protocol  
• latest-frame-only backpressure  
• frame acceptance/replacement counters  
• clean shutdown/restart behavior  
Exit gate:  
• automated tests prove no unbounded pending-frame queue  
• stale results cannot overwrite newer state  
• repeated worker start/stop does not create duplicate active workers

### M0D3 — TrackingObservation normalization

Deliverables:  
• normalize MediaPipe output into the frozen TrackingObservation contract  
• preserve monotonic timestamps and tracking metadata  
• reject malformed/non-finite observations before estimator use  
• deterministic observation fixtures for downstream tests  
Exit gate:  
• representative MediaPipe results normalize deterministically  
• estimator code consumes TrackingObservation rather than MediaPipe-specific objects directly

### M0D4 — Estimator A: MediaPipe facial-transform-based viewer pose

Deliverables:  
• implement the frozen estimator-A method behind ViewerPoseEstimator  
• perform only estimator-intrinsic calibration required to emit canonical screen-relative millimeters  
• deterministic fixture tests for sign, axis, finite-output, null/error, and representative movement behavior  
Exit gate:  
• estimator emits RawViewerPose or null according to contract  
• implementation follows the specified reference/formula rather than introducing an alternate pose model

### M0D5 — Estimator B: calibrated facial-scale/interocular viewer pose

Deliverables:  
• implement the frozen estimator-B method behind the same ViewerPoseEstimator contract  
• use the prescribed calibration inputs/formula only  
• deterministic fixture tests equivalent to M0D4  
Exit gate:  
• estimator emits RawViewerPose or null according to contract  
• both estimators can be exercised by the same replay and evidence tooling

### M0D6 — Recorded-trace replay, metrics, and evidence tooling

Deliverables:  
• deterministic TrackingObservation/pose trace replay  
• fixed metric calculations for stationary RMS jitter, depth/lateral/vertical repeatability, update cadence, estimator processing time, invalid/null sample rate, and required outlier/anomaly counts  
• versioned machine-readable evidence schema  
• evidence-bundle validator  
• repository evidence/m0d/ convention for experiment artifacts  
Exit gate:  
• the same trace produces repeatable metrics  
• evidence validation detects missing trials, malformed metadata, non-finite values, and incomplete/corrupt captures  
• metric computation requires no manual interpretation

### M0D7 — Scripted live evidence collection

Purpose:  
Execute the predetermined hardware test matrix for both estimators and produce a complete evidence bundle for later interpretation.

Rules:  
• use the same prescribed test conditions, durations, calibration procedure, and metrics for both estimators  
• do not change estimator equations, calibration rules, test duration, physical test positions, metric formulas, or acceptance criteria during collection  
• do not remove poor samples or rerun a trial merely because its result is unfavorable  
• rerun only when a procedural invalidation occurs, such as wrong configuration, failed capture, crash, or incomplete/corrupt evidence  
• preserve anomalies and invalid/null observations as evidence  
• do not rank, select, or recommend an estimator

Deliverables:  
• complete live captures for the frozen stationary, near/far, lateral, vertical, approach/retreat, natural-motion, partial-visibility, and processing/cadence scenarios  
• raw observations/poses required by the experiment specification

• computed metric summaries  
• anomaly/procedural-invalidity records  
• validated evidence bundle under evidence/m0d/

Exit gate:  
• every required scenario/trial is present or explicitly marked procedurally invalid  
• evidence validator passes  
• both estimators were tested under equivalent prescribed conditions  
• no interpretation or tuning has been mixed into evidence collection

### M0D8 — Evidence interpretation and production-estimator decision

Inputs:  
• Pose Estimator Experiment Specification  
• validated M0D7 evidence bundle  
• relevant NFR/acceptance thresholds  
• documented anomalies and experiment limitations

Responsibilities:  
• compare both estimators against the predefined criteria  
• distinguish implementation defects, measurement limitations, and genuine estimator limitations  
• determine whether estimator A, estimator B, or neither is suitable for the baseline  
• decide whether additional evidence or an escalation such as solvePnP is warranted

ADR output:  
• if a production estimator is supported by evidence, create ADR-006.01 to supersede ADR-006  
• if neither estimator is adequate, preserve the evidence and document the required escalation rather than forcing a selection

Dependency order:  
M0D1 → M0D2 → M0D3 may proceed against frozen worker/observation contracts. In parallel, the Class C estimator-comparison oracle is designed, stronger-reviewed, and frozen. Only after that freeze may M0D4, M0D5, and M0D6 proceed as independently as their interfaces allow. M0D7 begins only after both estimators/evidence tooling are ready and the same Class C oracle remains frozen. M0D8 begins only after the M0D7 evidence bundle validates and performs stronger-reasoning evidence interpretation/architecture selection without changing the collection oracle retroactively.

Overall M0D exit gate:  
• worker and local MediaPipe assets function in packaged WebView2  
• render/UI thread remains independent from inference  
• latest-frame backpressure and worker lifecycle tests pass  
• both specified estimators produce comparable machine-readable output through the same contract  
• the Class C estimator-comparison oracle shows completed stronger review/freeze before M0D4–M0D7 consumption  
• scripted live evidence collection completes without hidden tuning or result selection  
• final estimator choice is evidence-based under the frozen criteria, or escalation is explicitly documented  
• representative RawViewerPose traces are preserved for M0E replay

Production handoff package:  
• update docs/handoff/tracking-pose-estimation.md for the tracking/pose-estimation subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md; the selected or explicitly provisional estimator status must be reflected through that canonical structure

## 

## M0E — Calibration, Filtering, and Live Viewer State

Specification readiness:  
• M0E1 is Blocked until the Data Model & Persistence Specification is sufficiently frozen for the calibration/profile persistence behavior it will commit  
• M0E2 is Blocked until the UX/UI Specification is sufficiently frozen for the calibration/camera-preview/neutral-capture flow it will implement  
• M0E3 may proceed from the frozen PoseFilter contract and approved reuse path without waiting on unrelated UI/persistence detail  
• M0E4 may proceed only after the contracts and upstream M0E1/M0E3 behavior it consumes are ready; it must not invent persistence or UI behavior to unblock integration

## 

M0E oracle/review gate:  
• calibration-model sufficiency criteria, residual/repeatability interpretation rules, filter-selection metrics/shortlist rules, and any default-selection procedure that can change the accepted calibration/filter baseline are Class C oracle material  
• design these Class C criteria before M0E5/M0E6 evidence collection, obtain stronger-reasoning review, and freeze them in the Oracle Registry/Testing Strategy procedure before Luna/Terra executes the experiments or sweeps  
• M0E1–M0E4 may implement frozen contracts/reference adaptations without waiting for evidence collection, but they may not invent or revise the Class C acceptance/default-selection criteria  
• M0E7 records Logan’s perceptual observations as user evidence; a model must not replace that human judgment with an automated preference score  
• M0E8 interprets the frozen objective/perceptual evidence and selects defaults or escalates; if evidence implies a new calibration model/filter family or oracle change, stop for architecture/oracle review rather than changing criteria after seeing results  
M0E implementation decomposition:

M0E1 — Calibration data contracts and persistence  
• implement calibration profile shape, validation, defaults, and identity host correction  
• persist display/camera association, neutral pose, estimator identity/parameters, and host per-axis scale/offset  
• no nonlinear calibration model

M0E2 — Calibration UI and camera preview  
• physical display-dimension entry  
• fixed integrated-camera identification/preview  
• camera-to-screen offset entry/measurement where required  
• neutral-pose capture and reset/retry flow

M0E3 — One Euro filter adaptation and trace harness  
• adapt a vetted One Euro reference implementation to the frozen PoseFilter contract  
• deterministic unit tests  
• recorded RawViewerPose replay  
• objective metric generation

M0E4 — Live pose/calibration/filter integration  
• integrate RawViewerPose → CalibrationTransform → PoseFilter → ViewerStateController  
• preserve monotonic timestamps, confidence, estimator identity, and explicit tracking-state semantics  
• reset filter state safely on source/calibration changes

M0E5 — Calibration experiment  
• collect prescribed reference samples  
• begin with identity host correction  
• evaluate only independent per-axis scale \+ offset if systematic error is measured  
• generate machine-readable residual/repeatability summary

M0E6 — Filter parameter sweep  
• run bounded documented parameter grid against recorded traces  
• calculate X/Y/Z RMS jitter, response lag, invalid/non-finite samples, and overshoot/discontinuity where applicable  
• preserve complete sweep and shortlist reasonable candidates

M0E7 — Perceptual comparison  
• compare only shortlisted filter candidates in the diagnostic world  
• record user observations without substituting an automated preference

M0E8 — Evidence review and default selection  
• review calibration/filter evidence against acceptance targets  
• select defaults or identify further experiments  
• escalate for additional technical review only when objective/perceptual evidence conflicts or simple calibration assumptions fail

M0D handoff requirement:  
Before M0E begins, M0D must provide a selected/provisional estimator that outputs finite RawViewerPose samples in canonical screen-relative millimeters, plus representative recorded stationary and normal-motion traces. M0E does not reinterpret MediaPipe landmarks or redesign estimator computer-vision math.

Exit gate:  
• calibration can be completed without specialist tooling  
• identity host correction is the default and any non-identity per-axis scale/offset is supported by measurement  
• five 5-second neutral-position jitter trials can be captured reproducibly  
• One Euro implementation passes deterministic tests and trace replay  
• the M0E Class C calibration/filter-selection criteria have a recorded stronger-review result and frozen Oracle Registry entries before M0E5/M0E6 evidence collection  
• bounded parameter sweep produces reproducible machine-readable evidence  
• filter reduces stationary noise without unacceptable visible lag  
• tracking loss/reacquisition is visually smooth  
• calibrated physical baseline remains available when perspective strength is applied  
• no checkerboard/full intrinsic/nonlinear calibration is introduced without evidence and architecture review

Evidence:  
Store M0E evidence under evidence/milestone-0/m0e/ using the Testing Strategy layout.

Production handoff package:  
• update docs/handoff/calibration-filtering.md for the calibration/filtering subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md

## 

## M0F — Local World Package Conformance and Runtime Loading

Deliverables:

• configured local package-directory support  
• immediate-child discovery and world.manifest.json validation  
• reverse-domain package IDs and engineApi compatibility checks  
• package-root normalization and traversal rejection before executable code  
• prebuilt single-entry ESM runtime package format  
• reusable world-package conformance harness covering manifest/discovery, lifecycle, settings, assets, and isolation  
• minimal fixture-world catalog: valid-minimal, invalid-manifest, duplicate-id, incompatible-api, path-traversal-entry, path-traversal-settings, init-failure, update-failure, dispose-failure, invalid-settings, asset-escape, and resource-sentinel  
• completed automated static world/host architecture-boundary enforcement  
• packaged Tauri dynamic local-ESM loading spike  
• the existing worlds-dev/diagnostic-room source built into dist/world.js and loaded through the production manifest/discovery/loader/lifecycle path  
• package-local WorldAssetService behavior proven with a real diagnostic asset and asset-escape fixture  
• failure-safe world activation/update/disposal/recovery path  
• evidence/milestone-0/world-package-conformance.json structure established for durable conformance results

Implementation rule:  
M0F changes how the already-existing diagnostic reference world is loaded; it does not create a second diagnostic implementation. The reference world remains a normal consumer of src/world-sdk/ and receives no privileged host capability.

Exit gate:  
• packaged application discovers and loads the diagnostic reference world from the configured local directory through the production loader  
• the diagnostic reference world passes every applicable reusable world-package conformance suite  
• the required baseline fixture-world catalog exists and its deterministic checks pass  
• static world/host architecture-boundary enforcement runs automatically and passes  
• invalid/incompatible/path-traversal packages are rejected safely, with pre-load failures occurring before executable package code runs  
• package-local asset resolution succeeds for the diagnostic reference world and asset escape is rejected  
• initialize/update/dispose and representative failure recovery behave according to the public lifecycle contract  
• switching between valid fixture/reference worlds works without restart  
• packaged Tauri/WebView2 behavior proves the local ESM loader rather than relying only on Vite/dev mode  
• exact local ESM loading mechanism is documented in evidence and, if architecture-significant, finalized by ADR  
• evidence/milestone-0/world-package-conformance.json captures the reviewed conformance/build result at this stage

Model plan:  
• Luna-Medium is preferred for manifest/schema validation, reusable conformance suites, fixture worlds, static boundary-rule implementation, and deterministic lifecycle/asset tests  
• Terra-Medium owns the packaged local-ESM loading seam, Tauri/WebView2 asset integration, and cross-boundary lifecycle integration  
• Terra-High/Sol are escalation-only if the packaged loader or accepted contracts reveal an architectural conflict

Production handoff package:  
• update docs/handoff/world-packages.md for the world-package subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md; the World Package Conformance Specification remains the compact normative world-package context

## M0G — Settings, Persistence, Diagnostics, and Offline Operation

Specification readiness:  
• before M0G begins, the Data Model & Persistence Specification must be sufficiently frozen for the stores, concrete persistence ownership, version/reset/recovery semantics, and file/directory behavior this slice will implement  
• before M0G implements user-facing settings, diagnostics/export, or recovery flows, the UX/UI Specification must be sufficiently frozen for those flows  
• if either artifact leaves a required observable behavior or persisted-data decision unresolved, the affected M0G work remains Blocked rather than being decided inside implementation

## 

Deliverables:  
• versioned JSON persistence with atomic writes  
• app/display/calibration/world-settings stores  
• JSON Schema Draft 2020-12 validation through Ajv  
• settings.ui.json handling  
• schema-driven settings UI experiment  
• package-version settings reset behavior  
• structured local logging  
• bounded recent-log ring  
• diagnostic JSON builder/export  
• full offline/static-asset completeness checks for the packaged runtime  
• verification that required local application, MediaPipe model/WASM, world-package, and settings/diagnostic assets are present  
• packaged runtime smoke sequence with network access disabled/blocked

## 

Exit gate:  
• persisted state restores after restart  
• corrupted/invalid data follows defined recovery behavior  
• world settings validate and package-version reset behavior passes  
• diagnostic JSON validates and excludes raw webcam imagery  
• recent logs obey 200-entry / 256 KiB bound  
• static/offline asset verification reports no required remote dependency  
• packaged app completes the required offline smoke sequence without network access

## 

Production handoff package:  
• update docs/handoff/settings-persistence-diagnostics.md for the settings/persistence/diagnostics subsystem using the current canonical handoff structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md

## 

## M0H — Acceptance, Performance, Cleanup, and Architecture Lock-In

Required acceptance runs:  
• 10-second warm-up \+ 60-second render/tracking measurement  
• five neutral 5-second jitter trials plus near/far spot checks  
• internal latency measurement  
• optional external high-frame-rate motion-to-photon validation  
• 25-cycle world-switch memory/resource test  
• startup timing  
• world-switch timing  
• manual fixed-window illusion procedure  
• calibration usability check  
• packaged offline smoke  
• final world-package conformance and packaged-runtime verification

Execution and evidence-collection strategy:  
• before M0H data collection, verify that every acceptance/performance metric or procedure capable of selecting/rejecting architecture or Milestone 0 acceptance is already governed by a frozen requirement/procedure; if a new or materially changed metric, formula, threshold, tolerance, invalid-run rule, or interpretation would be architecture-critical, classify it Class C, obtain stronger-reasoning review, and freeze it before collection begins  
• NFR-defined thresholds and previously frozen Class C oracles are consumed as-is; M0H collection is not a second opportunity to redesign them  
• separate test execution/data collection from evidence interpretation and architecture judgment  
• Luna-Medium is the default model for prescribed procedures, artifact checks, deterministic conformance verification, and explicitly defined statistics  
• collection prompts specify exact commands/procedures, thresholds, metadata, output locations, and stop conditions; the collection model must not tune thresholds, redesign implementation, weaken conformance requirements, or reinterpret failed requirements  
• test harnesses calculate RMS, medians, p95 values, slopes, counts, conformance pass/fail, and other defined metrics automatically where practical  
• Terra-Medium is reserved for operational troubleshooting when a harness, packaged test, environment, or evidence-collection procedure fails unexpectedly  
• evidence synthesis, tuning/remediation recommendations, architecture consequences, and next-step planning are a separate stronger-reasoning review  
• Sol-High is used for any still-unfrozen Class C acceptance-oracle review before collection and for final evidence/architecture review when needed; it is not used for routine execution of already-frozen procedures

Standard Milestone 0 evidence bundle:  
• evidence/milestone-0/acceptance-summary.json  
• evidence/milestone-0/environment.json  
• evidence/milestone-0/render-performance.json  
• evidence/milestone-0/tracking-performance.json  
• evidence/milestone-0/jitter/trial-01.csv through trial-05.csv plus summary.json  
• evidence/milestone-0/resource-lifecycle.json  
• evidence/milestone-0/startup-timing.json  
• evidence/milestone-0/world-switch-timing.json  
• evidence/milestone-0/offline-smoke.json  
• evidence/milestone-0/world-package-conformance.json  
• evidence/milestone-0/manual-acceptance.md  
• evidence/milestone-0/diagnostic-export.json  
• evidence/milestone-0/errors/ for structured failure artifacts when needed

Large or unsuitable binary artifacts may be referenced rather than committed, consistent with the Testing Strategy.

M0 production-handoff readiness review:  
Ownership split:  
• this Roadmap owns when the M0H handoff/readiness gate runs and which later milestone may consume a passing result.  
• the Technical Design Specification and repo-local docs/handoff/README.md own the canonical handoff structure and required fields.  
• the Testing Strategy owns pass/fail handoff-readiness verification, including Verification Readiness, Reuse Readiness, and M1 architecture-freeze checks and evidence requirements; this Roadmap does not restate those checks.  
M0H execution:  
• M0H applies the current Testing Strategy “Subsystem Handoff-Readiness and M1 Architecture-Freeze Verification” procedure to every Milestone 0 subsystem Milestone 1 intends to consume as stable.  
• for the world subsystem, M0H also applies the world-package-specific readiness checks referenced by the Testing Strategy against the current World Package Conformance Specification rather than duplicating them here.  
• M0H records the review results and supporting evidence exactly as required by the Testing Strategy.  
• Milestone 1 may consume a subsystem as stable only after the required handoff-readiness and architecture-freeze reviews pass; failed or blocked results remain non-consumable and escalate under the governing authoritative source.  
Milestone 0 exit criteria:  
• deterministic projection invariants pass  
• synthetic viewer drives the diagnostic reference world correctly  
• packaged app starts without a development server  
• local MediaPipe worker pipeline works  
• selected estimator has comparative evidence and an accepted production baseline  
• jitter/latency goals are met or credibly supported with documented limitations  
• calibration is usable  
• tracking loss/reacquisition is smooth  
• local world-package loading is proven in the packaged app  
• diagnostic reference world passes applicable manifest, lifecycle, settings, asset, and isolation conformance  
• required fixture-world catalog and static architecture-boundary enforcement pass  
• package-local asset isolation and representative failure recovery are proven  
• lifecycle cleanup test passes  
• 25-cycle resource test shows no unbounded leak  
• startup/world-switch acceptance limits pass  
• diagnostics are useful and AI/agent-friendly  
• manual fixed-window illusion is successful on the reference hardware  
• required M0H evidence artifacts are complete enough for independent review

Analysis handoff:  
After collection, provide the complete evidence/milestone-0/ bundle to a stronger reasoning review. The review compares results against the Testing Strategy and milestone exit criteria, identifies passes/failures/ambiguous results, distinguishes likely measurement/harness problems from product problems, recommends remediation/tuning, and identifies ADR consequences. Raw measurements remain unchanged; interpretation belongs in the review summary.

Architecture outputs:  
• superseding/final ADRs for estimator, loader mechanism, calibration details, frame-transfer representation, or other evidence-gated decisions as needed  
• Milestone 0 evidence summary  
• documented pass/fail/conditional-pass analysis and next-step recommendation

M1 Architecture Freeze Gate:  
Before Milestone 1 begins, M0H runs the M1 Architecture Freeze verification defined by the Testing Strategy against the architecture requirements and minimum freeze set defined by the Technical Design Specification. This Roadmap owns the gate timing and downstream consumption consequence; it does not restate or extend the technical freeze criteria or pass/fail procedure.  
Milestone 1 may consume only capabilities whose required architecture decisions pass that verification. A failed or unresolved result blocks the affected M1 work and escalates under the governing architecture source before implementation resumes.  
Decision gate:  
If the fixed-window illusion is not credible after reasonable tuning, do not proceed directly into production-world work. Diagnose the failed requirement and revise architecture first.

# 6\. Milestone 1 — Reusable Engine and Host Baseline

# 

Goal:  
Productionize the successful Milestone 0 host implementation into a maintainable baseline for real content while preserving the already-validated public world-facing contract and removing experiment-only shortcuts.

Milestone 1 is not where the public world API is designed from scratch. Ordinary M1 work consumes the M0-frozen public boundary, canonical diagnostic reference world, reusable conformance suites, fixture catalog, static architecture-boundary enforcement, public SDK API-surface guard, packaged-runtime evidence, subsystem handoff notes, and the standard Task Specification & Definition of Done Template.

Milestone-wide entry criteria:  
• the M1 Architecture Freeze Gate defined by the Technical Design Specification and verified under the Testing Strategy has passed for every architecture decision on which Milestone 1 depends  
• every M0 subsystem that M1 intends to treat as stable has passed handoff-readiness review  
• each required subsystem has a current repo-local handoff package conforming to the canonical structure defined by the Technical Design Specification and operationalized by docs/handoff/README.md  
• the world-package handoff references the World Package Conformance Specification as the compact implementation context  
• the diagnostic reference world passes applicable reusable conformance suites, world/host boundary checks, public SDK API-surface checks, and packaged-runtime tests through the production package-loading path  
• evidence/milestone-0/world-package-conformance.json and the required baseline fixture-world catalog are complete  
• ordinary M1 tasks use the standard bounded Task Specification & Definition of Done Template and have no authority to invent, revise, or silently reconcile architecture  
• Verification Readiness and Reuse Readiness have passed for every capability the first M1 slice will consume

## Verification Readiness

The Testing Strategy owns the Verification Readiness pass/fail procedure and required oracle/harness/review conditions. This Roadmap owns only the M1 consumption consequence: a capability may be consumed by M1 only after the applicable Verification Readiness check passes.  
A failed or unresolved Verification Readiness result keeps the dependent M1 work Proposed/Blocked until the governing verification source is corrected, completed, or the dependency is removed from scope.

## Reuse Readiness

The Technical Design Specification owns the Mandatory Reuse Gate and reuse-policy semantics, and the Testing Strategy owns the Reuse Readiness pass/fail procedure. This Roadmap owns only the M1 consumption consequence: a capability may be consumed by M1 only after its applicable reuse decision is resolved under those authorities and the Reuse Readiness check passes.  
A failed or unresolved Reuse Readiness result keeps the dependent M1 work Proposed/Blocked until the governing reuse decision is completed, explicitly excepted under the approved process, or the dependency is removed from scope.  
M1 start condition  
Milestone 1 begins only when the Architecture Freeze Gate, handoff-readiness review, Verification Readiness, and Reuse Readiness all pass for the capabilities M1 will consume. These gates are complementary: architecture freeze resolves technical choices, handoff readiness makes the subsystem consumable, Verification Readiness fixes what correctness means, and Reuse Readiness fixes the approved implementation path and custom-code boundary.  
Milestone-wide rules:  
• each slice receives its own bounded task specification rather than handing an agent the whole milestone  
• before a slice task is marked Ready, Verification Readiness and Reuse Readiness are rechecked for any capability/dependency/oracle newly introduced by that slice; a failed gate blocks the task rather than being resolved opportunistically during implementation  
• cleanup/refactoring preserves frozen behavior unless a task explicitly includes reviewed behavior change authority  
• implementation-only refactors inside host-private modules do not reopen the public API  
• any proposed public capability addition, breaking contract change, relaxation of world/host isolation, test-oracle change, or new cross-subsystem ownership decision stops and escalates for architecture review  
• the diagnostic reference world is an implementation example, not authority to override the accepted contract  
• no slice may weaken verification to obtain a passing result

## M1A — Baseline Intake and Reconciliation

Entry state:  
• all Milestone 0 exit criteria required by M1 are accepted  
• M0H handoff-readiness and architecture-freeze evidence is complete  
• M0H Verification Readiness and Reuse Readiness checks have passed for the capabilities M1A will consume  
• docs/testing/oracle-registry.md exists and contains the M1-required reusable oracle records produced during M0  
• docs/reuse-register.md exists and contains the M1-required material reuse/dependency records produced during M0  
• the repository baseline/working tree is known and reproducible

Bounded deliverables:  
• verify every M1-required docs/handoff/ note against the referenced source, tests, ADRs, evidence, and commands  
• for every M1-required subsystem, resolve each handoff Oracle ID through docs/testing/oracle-registry.md and confirm the registry record points to the correct governing authority, authoritative test/procedure, classification, review result, freeze status, frozen baseline, and change authority  
• confirm every oracle required by ordinary M1 work is current and frozen; Class C records must show completed required review, and draft/pending/superseded/retired records must not be consumed as current M1 gates  
• for every M1-required capability/dependency, resolve each handoff REUSE ID through docs/reuse-register.md and confirm the record is approved/current and matches its authoritative approval source, Reuse Mode, component/reference, relevant version/source/provenance constraints, permitted custom-code boundary, Prohibited Reinvention, and verification path  
• confirm no M1-required capability depends on a reuse record that is candidate, evaluating, blocked, superseded, or retired  
• confirm handoff Oracle/REUSE references, the two registries, authoritative source files/tests/ADRs/evidence, and the actual M1 starting commit agree; report drift instead of repairing authority opportunistically  
• confirm the M0H Verification Readiness and Reuse Readiness results—including the Oracle Registry and Reuse Register records they relied on—still match the actual M1 starting commit; report drift instead of silently choosing new oracles/dependencies  
• establish the exact M1 starting branch/commit and clean baseline  
• identify and remove only clearly obsolete experiment-only wiring that can be deleted without changing frozen behavior  
• record any deferred M0 limitation that M1 must preserve rather than silently “fix”  
• create the M1 baseline completion/intake record, including the reviewed commit and the complete set of Oracle IDs and REUSE IDs approved for downstream M1 consumption

Exit tests:  
• every handoff verification command succeeds  
• every M1-required handoff Oracle ID resolves to a current registry record whose authoritative test/procedure exists and whose review/freeze status is sufficient for the downstream M1 work  
• every M1-required handoff REUSE ID resolves to an approved current registry record whose component/reference and permitted custom-code boundary agree with the governing source and repository baseline  
• no authoritative-source contradiction remains unresolved  
• no required M0 experiment remains provisional for a dependency M1 will consume  
• no required test/oracle remains unaccepted/unfrozen for the M1 work that depends on it  
• no required Oracle Registry record is missing, draft, pending, superseded, retired, stale, or contradictory for downstream M1 consumption  
• no material reuse/dependency choice or permitted custom-code boundary remains unresolved for the M1 work that depends on it  
• no required Reuse Register record is missing, candidate, evaluating, blocked, superseded, retired, stale, or contradictory for downstream M1 consumption  
• repository baseline is clean/reproducible and the M1 task context set is valid  
• the M1 baseline completion/intake record lists the exact current Oracle IDs and REUSE IDs that downstream M1 task specifications may consume

Model recommendation:  
Luna — Medium.

Why:  
This is primarily reconciliation, verification, and tightly bounded cleanup against already-frozen evidence and handoff packages.

Escalation conditions:  
• a handoff note, Oracle Registry record, or Reuse Register record disagrees materially with authoritative code/tests/ADRs/evidence  
• a required M0 architecture decision is still unresolved  
• making the baseline green would require changing a frozen contract or test oracle  
• a required Oracle ID is missing/unfrozen/superseded or requires a stronger-review decision not completed in M0  
• a required REUSE ID is missing/unapproved/superseded or would require changing the approved component/reference, Reuse Mode, or permitted custom-code boundary

## M1B — Core Engine Productionization

Entry state:  
• M1A accepted  
• projection, viewer-state, tracking-pose, calibration/filter, and renderer handoffs are ready

Bounded deliverables:  
• refactor experiment-shaped host runtime code into stable engine modules without changing accepted behavior  
• remove temporary bootstrap/debug seams that are no longer required after M0, except those deliberately retained for test modes  
• preserve canonical millimeter geometry, ViewerPoseSource boundaries, ViewerStateController semantics, off-axis projection behavior, and engine-owned camera responsibility  
• keep deterministic synthetic/recorded test seams available for regression testing  
• update affected subsystem handoff notes only when implementation paths or verification commands move

Exit tests:  
• typecheck and relevant unit/integration suites pass  
• projection numerical oracle/golden cases remain unchanged and green  
• viewer-state deterministic timing tests remain green  
• synthetic packaged smoke remains green  
• no public world SDK export or behavior changes  
• no new direct coupling between engine-private subsystems

Model recommendation:  
Luna — Medium.

Why:  
The difficult architecture and numerical behavior were settled in M0; this slice is refactoring under strong tests and frozen interfaces.

Escalation conditions:  
• a behavior-preserving refactor is impossible without changing a frozen interface, numerical oracle, or subsystem ownership boundary  
• packaged behavior diverges from deterministic behavior in a way that crosses the assigned scope

## M1C — Persistence and Profile Hardening

Entry state:  
• M1A accepted  
• persistence/settings/calibration handoff is ready  
• Data Model & Persistence Specification is sufficiently frozen for implementation

Bounded deliverables:  
• productionize versioned JSON repositories for application state, display profiles, calibration profiles, and world settings  
• preserve atomic-write, validation, reset/version, and recovery behavior  
• harden corrupted/unsupported data handling and safe defaults  
• ensure last-active-world and active profile identifiers are persisted only through approved repositories  
• preserve package-version world-settings reset behavior

Exit tests:  
• repository round-trip tests pass  
• atomic/interrupted-write recovery tests pass  
• invalid/corrupt/unsupported-version tests pass  
• display/calibration profile identity and restore tests pass  
• world-settings version-reset tests pass  
• no world package gains direct persistence access

Model recommendation:  
Luna — Medium.

Why:  
The work is schema-, repository-, validation-, and fixture-driven with little remaining architectural ambiguity.

Escalation conditions:  
• completing the slice requires a new persistence format, ownership model, migration strategy, or public world capability  
• Windows filesystem behavior contradicts the accepted atomic-write approach and cannot be resolved inside the repository implementation

## M1D — Application Startup and World Selection

Entry state:  
• M1B and M1C accepted  
• world-package loader/lifecycle handoff is ready

Bounded deliverables:  
• productionize startup sequencing around validated application state, profiles, renderer, tracking initialization, and world activation  
• restore the last active valid world  
• provide deterministic fallback to world-selection/error flow when restoration fails  
• implement world selection using discovered valid packages only  
• make full-screen world viewing the default while preserving reliable access to host controls  
• retain startup/world-switch timing instrumentation

Exit tests:  
• valid last-world restoration test passes  
• missing/incompatible/failed last-world fallback tests pass  
• world selection never activates an invalid package  
• packaged launch/synthetic smoke paths remain green  
• startup state does not require network access  
• startup and world-switch timing data can be captured for M1H acceptance

Model recommendation:  
Luna — Medium.

Why:  
The startup state machine and loader contracts are already frozen; implementation is mainly orchestration with deterministic fallback behavior.

Escalation conditions:  
• unexpected Tauri/WebView2 startup or fullscreen behavior requires a native/runtime architecture change  
• restoring/activating a world requires changing the frozen package/lifecycle contract  
• Terra-Medium may be used for a bounded packaged-runtime integration defect

## M1E — Settings and Calibration UI

Entry state:  
• M1C and M1D accepted  
• settings, display-profile, calibration, and world-settings contracts are stable  
• UX/UI specification for these flows is sufficiently frozen

Bounded deliverables:  
• implement host settings navigation and display-profile editing  
• implement calibration workflow using the accepted simple calibration model and live camera preview  
• expose perspective-strength configuration at the approved display-profile scope  
• implement schema-driven world settings using Ajv plus the selected renderer/adapter  
• validate before persistence or delivery to world code  
• preserve package-version settings reset semantics

Exit tests:  
• settings validation and persistence tests pass  
• calibration/profile UI integration tests pass  
• world settings conformance tests pass  
• invalid settings never reach world code  
• packaged camera preview/calibration smoke passes where required  
• no UI path exposes host-private capabilities to worlds

Model recommendation:  
Luna — Medium.

Why:  
The behavioral contracts are fixed, so most work is bounded React/UI integration plus validation rather than product or architecture design.

Escalation conditions:  
• the chosen schema renderer cannot represent an approved baseline settings behavior without changing the contract  
• calibration UI requirements imply a more complex calibration model  
• packaged camera-preview behavior requires cross-boundary Tauri work; use Terra-Medium for that defect only

## M1F — Diagnostics and Recovery UI

Entry state:  
• M1C and M1D accepted  
• diagnostic JSON/error contracts and persistence/export paths are stable  
• UX/UI recovery behavior is sufficiently frozen

Bounded deliverables:  
• implement diagnostics/status UI for environment, camera/tracking/viewer, world, performance summaries, and structured errors  
• implement explicit diagnostic JSON export flow  
• implement user-visible recovery paths for expected camera, package, persistence, and world failures  
• preserve bounded recent-log behavior and exclude raw webcam imagery  
• present stable error codes/messages without exposing implementation-only internals unnecessarily

Exit tests:  
• diagnostic JSON schema/contract tests pass  
• recent-log 200-entry / 256 KiB bound passes  
• raw image/privacy exclusion checks pass  
• representative failure/retry flows pass  
• packaged export path succeeds offline  
• recovery from one bad world does not corrupt host-global state

Model recommendation:  
Luna — Medium.

Why:  
Diagnostics and recovery are strongly contract-, schema-, and fixture-driven after M0.

Escalation conditions:  
• native export or packaged recovery behavior crosses the existing NativeHost/Tauri boundary in an unsupported way  
• recovery requires changing subsystem ownership or a frozen error contract  
• Terra-Medium may handle a bounded native/packaged integration defect

## M1G — World Host Productionization

Entry state:  
• M1A accepted  
• M0F world-package handoff is ready and fully conformant  
• public src/world-sdk/ surface is frozen and guarded

Bounded deliverables:  
• productionize src/world-host/ discovery, validation, loading, lifecycle, assets, and settings orchestration without widening the public world API  
• integrate reusable conformance suites, fixture catalog, world/host boundary checker, and public SDK API-surface guard into normal local/CI verification  
• keep the diagnostic room as the canonical conformant regression package through the production loader  
• harden failure recovery and resource disposal inside the accepted lifecycle semantics  
• preserve the deterministic package-build workflow; add a minimal world starter/template only if Q-ROAD-04 is resolved in favor of including it in M1 before this slice executes

Exit tests:  
• all applicable world-package conformance suites pass  
• all required positive/negative fixture packages behave deterministically  
• world/host boundary and SDK API-surface checks pass  
• diagnostic reference package builds and loads through the production packaged path  
• package-local asset and offline checks pass  
• repeated world activation/disposal does not regress resource sentinels  
• no host-private import/capability bypass exists

Model recommendation:  
Luna — Medium by default; Terra — Medium only for the packaged local-ESM, WebView2 asset, lifecycle, or Tauri integration seam.

Why:  
Most of the subsystem is already constrained by WPC requirements and executable conformance. Only the packaged/runtime seam remains inherently cross-boundary.

Escalation conditions:  
• a new public SDK capability or package-contract change appears necessary  
• conformance can pass only by relaxing isolation or modifying an established oracle  
• packaged local ESM/Tauri behavior contradicts the frozen architecture beyond a bounded integration fix

## M1H — Packaged Integration and Milestone Acceptance

Entry state:  
• M1B through M1G accepted  
• no slice remains blocked on an architecture decision  
• all relevant handoff notes and task completion reports are current

Bounded deliverables:  
• integrate the complete M1 host baseline into one packaged/offline acceptance candidate  
• run the full deterministic, conformance, boundary, packaged-smoke, startup/world-switch, persistence/recovery, and resource-cleanup verification set  
• perform the required reference-hardware/manual acceptance procedures that remain applicable  
• record the M1 completion/evidence summary and any known limitations  
• confirm the host is ready for the first production world without requiring host-private access or unresolved M0 experimentation

Exit tests:  
• all slice-level verification remains green together  
• diagnostic reference world passes all applicable conformance and packaged/offline regression tests  
• startup/world-switch limits pass on the reference laptop  
• required lifecycle/resource checks pass  
• settings/calibration/diagnostic/recovery flows pass in the packaged application  
• a production world can be authored against only the approved public world-facing surface  
• no unresolved M0/M1 experiment blocks content development  
• M1 completion record confirms all milestone exit criteria

Model recommendation:  
Terra — Medium.

Why:  
This slice intentionally spans the complete packaged application and is primarily cross-boundary integration/acceptance rather than isolated implementation.

Escalation conditions:  
• integration reveals a true frozen-contract conflict or architecture defect  
• performance/resource evidence requires changing an accepted design rather than tuning inside allowed bounds  
• stronger reasoning is used only for explicit architecture/evidence review; ordinary acceptance work does not redesign the system

Explicitly excluded from Milestone 1:  
• polished marketplace/installer  
• arbitrary external cameras  
• WebGPU migration  
• broad editor/content-authoring tools  
• production fishtank polish  
• speculative generalization for future world types not yet demonstrated

Milestone 1 overall exit criteria:  
• M1A through M1H are accepted  
• host behaviors in Functional/UX specs are implemented for baseline flows  
• the public world-facing contract remains compatible with the M0-frozen baseline or any intentional change has gone through explicit architecture review/versioning  
• a production world can be built using only src/world-sdk/ / approved public package APIs without importing host-private modules  
• diagnostic reference world passes all applicable conformance suites and packaged/offline regression tests  
• required fixture-world, world/host boundary, and SDK API-surface checks pass  
• packaged local ESM loading, package-local assets, lifecycle/recovery, and offline behavior remain green in normal verification  
• persistence/recovery behaviors are stable  
• no open M0 experiment blocks content development  
• M1 has not introduced a diagnostic-only exception or private-host bypass that future worlds must understand  
• the Milestone 1 completion record is sufficient for Milestone 2 task planning

# 7\. Milestone 2 — First Production World

Goal:  
Build the first substantial world as a consumer of the platform rather than as an engine feature.

Proposed first world:  
Aquarium / fishtank, consistent with the original project inspiration.

World responsibilities may include:  
• scene composition  
• fish population and behavior  
• schooling/boids-style motion where useful  
• water/caustic visual treatment  
• environment/props  
• world-specific settings  
• viewer-reactive behavior that consumes read-only ViewerState  
• world-owned resource cleanup

Host constraints:  
• no fish-specific code may enter the engine  
• no direct projection-camera access  
• no direct webcam/MediaPipe access  
• no private filesystem/native access  
• all world options go through the public settings mechanism

Performance policy:  
The world should degrade world-specific visual quality before compromising tracking/projection correctness on the reference laptop.

Exit criteria:  
• world is enjoyable and stable for normal use  
• world package loads/switches/settings persist as designed  
• world respects cleanup/resource budgets  
• head-tracked illusion remains within host performance/stability expectations  
• no engine modification was required solely because the engine accidentally assumed “diagnostic room”  
• any genuinely missing platform capability is added through a reviewed host contract rather than an ad hoc world bypass

Roadmap note:  
This milestone validates the platform under realistic content load; it is not yet sufficient by itself to prove broad world generality.

# 8\. Milestone 3 — Reusability Validation and World Authoring Hardening

Goal:  
Demonstrate that the platform is genuinely reusable and not merely a fishtank engine with a package wrapper.

Approach:  
Build one deliberately contrasting reference/production world that exercises different platform behavior.

Strong candidate categories:  
• miniature room/diorama  
• simple landscape/window scene  
• 2.5D painting/photo scene

The second world should intentionally avoid depending on aquarium-specific assumptions and should use the same public world package interface.

Deliverables:  
• second contrasting world/reference package  
• refined world starter/template  
• World Authoring Guide / SDK Guide  
• asset-scaling guidance for millimeter host space  
• settings-schema authoring guidance  
• cleanup/resource checklist  
• package validation/build script improvements  
• documentation of common world performance budgets

Exit criteria:  
• second world works without host-private imports or projection hacks  
• both worlds can switch repeatedly without lifecycle/resource regressions  
• world authoring can be explained from stable public docs rather than chat history  
• any API changes needed by the second world are reviewed for generality  
• host remains content-agnostic

If the second world exposes a fundamental package-contract limitation, fix the platform before declaring reusability validated.

# 9\. Milestone 4 — Personal v1 Hardening and Release Baseline

Goal:  
Make World Viewer dependable for routine personal use rather than only developer-driven testing.

Deliverables:  
• clean release packaging  
• documented first-run setup  
• default/reference display profile behavior  
• clear world-directory configuration  
• polished error/recovery paths  
• stable settings/calibration workflows  
• regression test consolidation  
• release checklist  
• versioning policy for host/world API  
• backup/recovery guidance for local settings  
• final documentation pass  
• known-issues list  
• release evidence summary

Acceptance:  
• fresh installation/setup is reproducible  
• application launches/restores expected world reliably  
• offline operation remains intact  
• calibration/settings survive normal use  
• packaged smoke and deterministic regression suites pass  
• reference-hardware acceptance procedures pass  
• first and second worlds remain usable after clean install  
• no unresolved critical error/recovery issue remains

This milestone defines a dependable personal v1. It does not imply a public marketplace-quality product.

# 10\. Future / Optional Milestones

Possible later work, only when justified:

• arbitrary external camera placement/calibration  
• multiple display profiles with richer hardware discovery  
• WebGPU evaluation  
• richer world SDK/shared runtime if duplicated dependencies become costly  
• physics integration for a world that actually requires it  
• advanced 2.5D authoring tools  
• ant-farm/stigmergy world  
• landscape/window worlds  
• additional diagnostics/replay tooling  
• optional installer/update workflow for world packages  
• cross-platform investigation

These items are intentionally not assigned to the core roadmap.

# 11\. Milestone Dependency Map

Pre-implementation specs  
↓  
M0 Core Feasibility  
↓  
M1 Reusable Engine/Host Baseline  
↓  
M2 First Production World  
↓  
M3 Reusability Validation / Second World  
↓  
M4 Personal v1 Hardening

M1 may begin only after M0 proves the core illusion and the M1 Architecture Freeze Gate confirms that required subsystems—including the public world-facing contract—are stable, conformant, and handed off with executable verification.

M2 may begin only after M1 productionizes the accepted M0 host baseline without reopening unresolved world-platform architecture.

M3 deliberately follows M2 because the second-world exercise is most valuable after the first production world has already stressed the platform.

M4 should not become a dumping ground for unresolved architectural problems from M0–M3.

# 12\. AI-Assisted Implementation Strategy by Milestone

Luna should handle as much deterministic, well-bounded implementation as practical:  
• schemas and validation  
• DTOs/contracts already defined by specs  
• pure utilities  
• persistence repositories  
• reusable conformance-suite cases against frozen requirements  
• minimal fixture worlds  
• static world-boundary rule implementation against the frozen public/private contract  
• diagnostic reference-world content/settings/assets once interfaces are fixed  
• diagnostic builders  
• simple React components  
• narrow world content tasks  
• documentation/test updates with explicit acceptance criteria  
• prescribed acceptance/evidence collection where procedures and statistics are fixed

Terra should handle moderately cross-cutting implementation:  
• Tauri/native integration  
• worker integration  
• packaged local ESM loader  
• package-local asset resolution in Tauri/WebView2  
• world lifecycle integration when multiple host boundaries are involved  
• transition of the existing diagnostic reference world from temporary static bootstrap to production package loading  
• settings renderer integration  
• packaged smoke automation  
• performance instrumentation  
• complex but well-specified world systems

Stronger reasoning should be reserved for:  
• projection mathematics/oracles when references disagree  
• pose-estimator experiment design/comparison  
• calibration-model decisions  
• latency interpretation  
• architecture review  
• difficult cross-boundary debugging unresolved by Terra  
• ADR decisions arising from experiments or proposed public-contract changes

World-package compact-context rule:  
For ordinary world-package work after the relevant contract is frozen, prompts should prefer:  
• bounded task specification using the Task Specification & Definition of Done Template  
• World Package Conformance Specification  
• relevant src/world-sdk contracts  
• relevant reusable conformance tests and fixture worlds  
• diagnostic reference-world files when an example is useful  
• exact verification commands  
• relevant docs/handoff/world-packages.md when consuming the frozen subsystem

Do not load the entire project document set by default when this compact context is sufficient. Every ordinary implementation task must also state Allowed Scope, Prohibited/Out-of-Scope Changes, exact Verification, and Escalation/Stop Conditions. If these artifacts expose a genuine missing capability or contract conflict, the task stops and escalates rather than expanding scope, weakening verification, or improvising architecture.

The roadmap should be converted into narrowly scoped task specifications using the standard Task Specification & Definition of Done Template rather than handing a model an entire milestone at once.

# 13\. Evidence and Completion Records

Each milestone should end with a compact completion record containing:  
• accepted scope  
• final commit/build identifier  
• tests executed  
• conformance/boundary checks executed when applicable  
• packaged/manual acceptance performed  
• evidence/ artifacts produced  
• performance results where applicable  
• ADRs created/superseded  
• deferred issues  
• known limitations  
• confirmation that milestone exit criteria are met

For the world subsystem, Milestone 0 must also retain evidence/milestone-0/world-package-conformance.json containing the reviewed commit/build, conformance-spec version, reusable suite results, fixture-catalog result, static boundary-check result, diagnostic reference-world result, and packaged-runtime world-loading/asset/lifecycle/recovery checks.

Completion records should make it possible to start a new AI conversation without replaying the full project history and should point to durable evidence rather than copying large raw outputs.

# 14\. Open Roadmap Decisions

Q-ROAD-01 — Confirm that the Aquarium / fishtank should be the first production world in Milestone 2\.

Q-ROAD-02 — Should a contrasting second world be a required gate before declaring personal v1, as proposed, or should it remain optional after the fishtank?

Q-ROAD-03 — For the second-world validation, should we deliberately prefer a 2.5D scene because it exercises a substantially different content style from the fully 3D aquarium?

Q-ROAD-04 — Should Milestone 1 include a minimal world starter/template as a required deliverable, or wait until after the aquarium reveals what world authors actually need?

Q-ROAD-05 — Should milestone completion records be stored as individual files under evidence/milestones/ so agents can retrieve a small summary instead of the entire evidence tree?

