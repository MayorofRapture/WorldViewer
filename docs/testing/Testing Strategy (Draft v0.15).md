# Testing Strategy

## Draft v0.15

# Document Status

Draft version: 0.15  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Testing Strategy  
Upstream artifacts:  
• Project Vision & Charter, Draft v0.2  
• Product Specification & PRD, Draft v0.2  
• Non-Functional Requirements, Draft v0.2  
• Interface & Contract Specification, Draft v0.6  
• Technical Design Specification, Draft v0.18  
• Architecture Decision Records — Index, Draft v0.4  
• Milestone Roadmap, Draft v0.15  
• World Package Conformance Specification, Draft v0.4  
• Task Specification & Definition of Done Template, Draft v0.4

This fifteenth draft removes duplicate handoff-schema authority. The TDS and repo-local docs/handoff/README.md own the handoff structure/required fields; this Testing Strategy owns only the readiness checks that determine whether a canonical handoff is safe for Milestone 1 consumption. The existing ORC/REUSE resolution, oracle-freeze, verification, architecture-freeze, and evidence requirements remain pass/fail checks rather than a second schema.

# 1\. Testing Objectives

The test strategy must answer five different questions:

1\. Is the math correct?  
2\. Are subsystem contracts respected?  
3\. Does the packaged application behave correctly in the real Tauri/WebView2 environment?  
4\. Does live tracking meet the measured performance/stability requirements on the reference laptop?  
5\. Does the result actually create a convincing fixed-window illusion for the user?

No single test layer can answer all five.

Primary goals:  
• catch projection and coordinate-system errors before live tracking is introduced  
• make most engine behavior testable without a webcam  
• verify package/runtime behavior outside Vite development mode  
• produce repeatable evidence for architecture decisions  
• make failures easy to diagnose with structured logs and diagnostics  
• give Luna/Terra bounded test-driven implementation tasks  
• prevent regressions in world loading, lifecycle, settings, and cleanup  
• establish measurable acceptance evidence on the ThinkPad E590

• make successful Milestone 0 subsystems handoff-ready so later lower-cost implementation agents can work from stable contracts, reference implementations, executable tests, and explicit escalation rules  
• make world-package correctness reusable and executable through shared conformance suites rather than one-off tests  
• ensure the diagnostic room proves the same public world contract expected of production worlds and receives no privileged host access  
• make world/host isolation mechanically enforceable so lower-cost implementation agents cannot accidentally bypass the public contract

# 2\. Testing Principles

The following principles govern all testing:

• Deterministic before physical. Geometry, projection, state transitions, persistence, schemas, and world lifecycle should be tested without hardware wherever possible.  
• Packaged behavior is a separate target. Passing in a browser/Vite environment does not prove Tauri/WebView2 compatibility.  
• Numerical invariants outrank screenshots for projection correctness.  
• Hardware-dependent results are reported with environment and sample conditions.  
• Performance tests use warm-up periods and bounded measurement windows.  
• Perceptual behavior uses repeatable manual procedures rather than vague impressions.  
• Test fixtures should use canonical millimeter coordinates and stable timestamps.  
• Test code must not silently depend on network access.  
• A failing experiment must preserve enough structured evidence to be reviewed by an AI/agent.  
• Tests should mirror subsystem ownership and contracts.

• Handoff readiness depends on executable truth. Handoff notes point to contracts, implementations, tests, fixtures, ADRs, and evidence rather than restating them as a parallel specification.  
• Architecture ambiguity is an escalation condition. An implementation agent should not silently redesign a handoff-ready subsystem to complete a bounded task.  
• Conformance suites define reusable behavioral obligations. The same applicable suite should verify the diagnostic reference world and later production worlds.  
• A reference implementation is an example, not authority over the contract. When code, a test, and an accepted higher-authority contract disagree, the conflict must be escalated rather than resolved by weakening the contract.  
• Static architecture-boundary checks complement runtime tests. Runtime success does not prove that world code respected the host/world dependency boundary.

# 3\. Test Layers

World Viewer will use six primary test layers.

Layer 1 — Pure unit tests  
Fast deterministic tests for math, schemas, state machines, validation, and utilities.

Layer 2 — Headless subsystem integration tests  
Multiple TypeScript modules composed together without Tauri, webcam, or GPU-dependent behavior where practical. This layer includes reusable world-package conformance suites, fixture-world execution, and static architecture-boundary verification when those checks do not require the packaged shell.

Layer 3 — Renderer/world integration tests  
Three.js scene/world lifecycle behavior using synthetic viewer data and the diagnostic reference world. The diagnostic room must exercise only the normal public world contract and must pass the same applicable reusable conformance suites as production worlds.

Layer 4 — Packaged Tauri smoke/integration tests  
Tests that prove WebView2, workers, local assets, permissions, package loading, native commands, and packaged-runtime world conformance behave correctly in the packaged application.

Layer 5 — Reference-hardware measurement tests  
Repeatable performance/stability measurements on the ThinkPad E590.

Layer 6 — Manual perceptual acceptance  
Human observation of fixed-window illusion, jitter, latency, tracking loss, reacquisition, and calibration usability.

The project should favor many Layer 1/2 tests, a smaller number of Layer 3/4 tests, and focused Layer 5/6 acceptance procedures.

# 3A. Test / Oracle Ownership Policy

This policy controls who may define, implement, review, freeze, and change test expectations. Its purpose is to spend stronger-model reasoning on the small set of verification artifacts where an incorrect oracle could cause an architecture-level mistake, while allowing Luna/Terra to author ordinary tests directly from frozen requirements.  
A test is an executable or procedural check. An oracle is the accepted source of expected correctness used by that check: an expected value, invariant, metric formula, threshold, state transition, conformance requirement, or acceptance procedure. Not every test is an architecture-critical oracle, and a test file may contain checks from more than one class.  
Classification applies to the expectation being created or changed, not merely to the test framework, file name, or number of modules involved.

## 3A.1 Class A — Routine Deterministic Tests

Class A covers tests whose expected behavior follows mechanically from a stable requirement, type/schema, small pure contract, or already-frozen subsystem behavior and whose false pass would not select or redefine architecture.  
Typical examples:  
• schema and DTO validation  
• serialization/deserialization and JSON round trips  
• pure utility and normalization behavior  
• deterministic repository behavior already specified by the persistence contract  
• invalid-input and boundary cases with explicit expected results  
• regression tests that reproduce a confirmed implementation defect without redefining accepted behavior  
Ownership and model policy:  
• Luna-Medium is the default for both test authoring and implementation when the requirement is explicit and the task is bounded.  
• Terra-Medium may be used when the routine test requires broader integration or environment troubleshooting, but stronger reasoning is not required merely because multiple files are touched.  
• Class A tests may be added or changed inside an authorized task as long as they do not reinterpret a frozen contract, conformance requirement, or accepted oracle.  
• A Class A regression test does not gain authority to redefine product behavior merely because it is executable.

## 3A.2 Class B — Integration and Conformance Tests

Class B covers tests that verify a stable contract across subsystem, host/world, packaged-runtime, or public capability boundaries. The expected behavior is still defined elsewhere; the test exists to prove that the implementation conforms to that authority.  
Typical examples:  
• reusable World Package Conformance Specification suites  
• host/world static boundary checks  
• fixture-world lifecycle/settings/asset/isolation tests  
• packaged smoke checks whose expected behavior is already specified  
• subsystem integration tests against frozen interfaces  
Ownership and model policy:  
• Luna-Medium may design and implement Class B tests when the expected behavior maps directly to normative requirement IDs, frozen interfaces, or an explicit acceptance checklist.  
• Terra-Medium is the default when the harness crosses Tauri/WebView2, worker/native, packaging, filesystem, or other environment-sensitive boundaries.  
• Stronger-model review is not automatically required for Class B work. It becomes required only when the proposed test introduces a new interpretation of the contract, defines a previously unspecified boundary, or would effectively change accepted architecture.  
• Once a conformance suite/check is accepted as the executable proof of a frozen public contract, ordinary implementation tasks may not weaken, delete, or reinterpret its expected behavior.  
• Changes to accepted conformance expectations require explicit authority and must remain aligned with the governing contract/specification.

## 3A.3 Class C — Architecture-Critical Oracles

Class C covers expected results, metric definitions, tolerances, procedures, or acceptance thresholds whose correctness can select/reject an architecture, drive an ADR, validate a high-risk mathematical assumption, or materially change whether the product is considered feasible.  
Typical examples:  
• off-axis projection invariants, screen-corner/NDC mapping, matrix sign/scale expectations, and numerical tolerances  
• pose-estimator comparison metrics, validity rules, calibration inputs, and experiment acceptance procedure  
• calibration correctness criteria when they determine the accepted physical model  
• motion/latency interpretation where the metric could be mislabeled or used to accept/reject the architecture  
• performance/resource acceptance rules when they become architecture or milestone gates  
• any new verification rule whose result is intended to justify an ADR or supersede an accepted technical choice  
Ownership and model policy:  
• Class C oracle design must receive stronger-reasoning review before it is frozen. The default project planning assumption is Sol-High unless Logan performs equivalent direct review or a later approved planning artifact specifies another reviewer.  
• The stronger model should spend its reasoning on the definition and validity of the oracle, not on routine harness boilerplate.  
• After the oracle is specified and reviewed, Luna-Medium or Terra-Medium may implement the test harness, fixtures, collectors, and reports when the implementation task is bounded and the oracle itself is not being changed.  
• A Class C result may not be reinterpreted, threshold-adjusted, or rewritten by the collection/implementation agent merely because the implementation fails it.  
• A failed Class C oracle is evidence to investigate or escalate, not permission to make the oracle easier.

## 3A.4 Freezing an Architecture-Critical Oracle

A Class C oracle is ready to freeze only when the following are explicit:  
• governing requirement, contract, ADR, research reference, or experiment specification  
• quantity/behavior being judged  
• expected value, invariant, formula, threshold, or categorical result  
• fixtures/input conditions and coordinate/units conventions  
• tolerance/error treatment where numerical comparison is involved  
• measurement or execution procedure where environment affects the result  
• known limitations and invalid-run conditions  
• independent cross-check or second oracle for high-risk mathematics where practical  
• stronger-reasoning review outcome  
After freeze, an ordinary implementation task may repair the harness without changing the accepted expectation. Any change to the expectation, tolerance, formula, threshold, or interpretation requires explicit oracle-change authority and the same level of review appropriate to the original Class C decision.

## 3A.5 Classification and Escalation Rules

• Any task that creates or materially changes expected test behavior must classify that expectation as Class A, B, or C before implementation is accepted.  
• A single test file may contain multiple classes; the classification belongs to the changed expectation, not the file.  
• If a proposed Class A/B test would actually decide an architecture question or fill an unspecified architecture gap, reclassify the affected oracle as Class C and stop ordinary implementation until review occurs.  
• If classification is genuinely uncertain, the task escalates the classification question rather than silently assuming the cheaper class.  
• Fixing a harness bug that leaves the accepted expectation unchanged does not by itself reopen the oracle.  
• A test generated from a reference implementation is not automatically correct; architecture-critical expectations still require validation against an independent reference, invariant, or stronger review where practical.

## 3A.6 Standard Delegation Flow

For new or changed verification behavior, use this sequence:  
1\. Identify the governing requirement/contract/ADR.  
2\. Classify the expected test behavior as A, B, or C.  
3\. Define the expected behavior/oracle before implementation when practical.  
4\. For Class C, obtain stronger-reasoning review and freeze the oracle.  
5\. Assign the bounded implementation/harness task to Luna or Terra at the lowest model/reasoning level appropriate to the integration risk.  
6\. Run the required verification without changing accepted expectations.  
7\. If implementation and oracle conflict, determine whether the defect is in implementation, harness, environment, or the accepted oracle; ordinary implementation agents stop rather than choosing among those architecture-significant possibilities.  
This ownership split is intended to reduce model cost without reducing confidence: stronger reasoning defines or validates the difficult meaning of “correct,” while lower-cost models perform most implementation and routine verification.

# 4\. Test Tooling

Baseline tooling:

• Vitest for unit, integration, and reusable conformance suites.  
• A small reusable world conformance testkit/harness rather than duplicated world-specific lifecycle/settings/asset tests.  
• Minimal fixture-world packages for positive, failure, isolation, and cleanup cases.  
• Automated static world/host architecture-boundary checks using the simplest maintainable lint/build/test mechanism that reliably enforces the approved dependency boundary.  
• TypeScript compile/typecheck as a mandatory static gate.  
• Tauri packaged smoke tests for production-shell behavior.  
• Small purpose-built test harnesses for projection, tracking traces, and performance measurement.  
• Synthetic/recorded viewer-pose fixtures.  
• Diagnostic JSON exports as supporting evidence during hardware/performance tests.

A full browser automation framework may be added where it materially helps settings/calibration/UI flows, but the project should not adopt a large E2E framework before there is a concrete automation target that cannot be tested more simply.

# 5\. Mandatory Pre-Commit / Local Verification

Before an implementation task is considered complete, the smallest relevant verification set should pass.

Baseline local gates:  
• TypeScript typecheck  
• relevant Vitest unit/integration suites  
• lint/format checks once configured  
• no unexpected dependency or build errors

For changes affecting packaged behavior:  
• production build/package succeeds  
• relevant packaged smoke test succeeds

For changes affecting projection/tracking/calibration:  
• deterministic numerical tests pass  
• the associated diagnostic/manual acceptance procedure is rerun when required

For changes affecting world packages or the host/world contract:  
• run the relevant reusable world conformance suites  
• run the static world/host architecture-boundary check  
• rerun the diagnostic reference world against the affected conformance suites when public world-facing behavior changes  
• perform packaged-runtime verification when the change affects package discovery, local ESM loading, CSP, package assets, or Tauri/WebView2 behavior

Agents should not report a task complete using only “code compiles” when the task has an executable test oracle.

For tasks consuming a handoff-ready subsystem:  
• read the corresponding docs/handoff/ package before editing the subsystem  
• run the exact deterministic verification commands identified by the handoff package  
• preserve the frozen contract and established test oracle unless the task explicitly authorizes a reviewed contract/test change  
• stop and escalate when satisfying the task appears to require a frozen-interface change, accepted-ADR conflict, test-oracle change, or new cross-subsystem dependency

# 

# 6\. Deterministic Test Fixtures

The testkit should provide reusable deterministic fixtures.

Minimum fixtures:  
• synthetic display profile with fixed width/height  
• reference E590 display profile  
• centered viewer pose  
• left/right/up/down viewer poses  
• near/far viewer poses  
• diagonal/asymmetric pose  
• scripted tracking loss  
• scripted reacquisition  
• stationary noisy pose trace  
• moving pose trace  
• invalid/non-finite pose inputs  
• valid/invalid world manifests  
• compatible/incompatible engineApi versions  
• valid/invalid world settings  
• corrupted persisted JSON samples

Synthetic tests must not depend on the physical development laptop unless the test is explicitly tagged as reference-hardware dependent.

World-package fixture worlds are a separate class of deterministic fixture. They should remain intentionally minimal so each valid or failing package isolates one contract rule. Section 15B defines the required baseline catalog.

# 7\. Projection Math Test Suite

Projection tests are a release-critical suite.

For known ScreenGeometry and viewer positions, tests shall verify:

• centered eye produces a symmetric frustum  
• screen-center ray maps to projection center  
• physical lower-left, lower-right, upper-left, and upper-right display corners map to the corresponding clip/NDC boundaries  
• \+X viewer movement changes the asymmetric frustum with correct sign  
• \-X viewer movement produces the mirrored result  
• \+Y/-Y viewer movement changes vertical bounds correctly  
• decreasing viewer Z changes aperture geometry in the physically expected direction  
• increasing viewer Z changes it oppositely  
• perspectiveStrength \= 0 produces neutral-viewer displacement behavior  
• perspectiveStrength \= 1 preserves physically calibrated behavior  
• invalid eye positions at or behind the screen plane are rejected  
• NaN/Infinity inputs are rejected  
• near/far invalid combinations are rejected

Projection correctness should be evaluated numerically, not solely by visual snapshots.

# 8\. Projection Numerical Tolerances

Projection tests require explicit tolerances because floating-point equality is inappropriate.

Initial approach:  
• compare projected screen-corner NDC coordinates against expected \-1/+1 boundaries using a small numeric epsilon  
• compare matrix/vector results using absolute or relative tolerance appropriate to the quantity  
• avoid tolerances so loose that sign/scale errors pass

The exact epsilon should be selected when the first implementation and oracle are created, documented in the projection test helper, and kept much tighter than any physically meaningful millimeter error.

If projection math is adapted from a reference implementation, a second independent oracle should be used for representative cases where practical.

# 9\. Viewer State Machine Tests

ViewerStateController shall have deterministic time-driven tests.

Required cases:  
• unavailable → initializing  
• initializing → acquiring  
• acquiring → tracked  
• tracked → degraded  
• degraded recovery back to tracked before loss confirmation  
• degraded/lost path after the 350 ms confirmation grace  
• confirmed loss begins neutral return  
• neutral return reaches the calibrated neutral pose over 5 seconds  
• no instantaneous snap at loss boundary  
• reacquisition begins from current effective pose  
• 300 ms reacquisition blend reaches tracked pose smoothly  
• repeated short interruptions do not corrupt state  
• calibration/profile change resets state safely  
• source reset cannot leave stale pose marked tracked

Tests should use a controllable monotonic clock rather than wall time.

# 10\. Pose Filter Tests

One Euro filter tests should cover both mathematical behavior and product-relevant traces.

Required tests:  
• constant input converges/stays stable  
• step input follows without overshoot caused by implementation errors  
• noisy stationary trace has lower RMS jitter than raw input  
• timestamp gaps are handled safely  
• non-monotonic timestamps are rejected or safely handled  
• reset removes stale history  
• X/Y/Z filters remain independent  
• output contains finite position and velocity  
• filter does not manufacture tracking confidence/state

A recorded/synthetic trace harness shall compare estimator-raw, calibrated, and filtered outputs using repeatable objective metrics rather than ad hoc live tuning.

The test suite should not bake tuning parameters permanently until Milestone 0 measurements support them. The implementation model must not silently alter thresholds, parameter ranges, or filter type while running the sweep.

# 10A. M0E Calibration and Filter Evidence Procedure

M0E must turn calibration and filter tuning into repeatable evidence tasks rather than open-ended model judgment.

M0D handoff prerequisite:  
• selected/provisional estimator outputs finite RawViewerPose samples in canonical screen-relative millimeters  
• representative recorded RawViewerPose traces are available for stationary and normal head-motion cases  
• estimator-specific calibration needed to produce those millimeter values is already owned by M0D

Calibration experiment:  
• use the identity host correction as the starting point  
• collect prescribed reference samples at the neutral pose and at several known normal seated distances/positions  
• evaluate only independent per-axis scale \+ offset correction initially  
• report residual error/repeatability by axis  
• do not introduce nonlinear correction, checkerboard calibration, lens-distortion correction, or full camera-intrinsic calibration unless the simple model demonstrably fails acceptance needs

Filter experiment:  
• replay the same recorded traces through the One Euro implementation  
• run a bounded, documented parameter grid rather than manual free-form tuning  
• calculate X/Y/Z RMS jitter, response lag, invalid/non-finite samples, and overshoot/discontinuity where applicable  
• preserve the full sweep results  
• shortlist a small number of Pareto-reasonable candidates balancing jitter and lag  
• compare only the shortlist perceptually in the diagnostic world  
• the user supplies perceptual observations; the collection model records them without replacing them with its own preference

Required evidence layout:  
• evidence/milestone-0/m0e/calibration/raw-samples.csv  
• evidence/milestone-0/m0e/calibration/fit-summary.json  
• evidence/milestone-0/m0e/filtering/stationary-trace.csv  
• evidence/milestone-0/m0e/filtering/motion-trace.csv  
• evidence/milestone-0/m0e/filtering/sweep-results.json  
• evidence/milestone-0/m0e/filtering/shortlist.json  
• evidence/milestone-0/m0e/perceptual-comparison.md

Execution model:  
• Luna-Medium may perform the prescribed collection, replay, metric calculation, and evidence packaging  
• Terra-Medium handles only the live RawViewerPose → CalibrationTransform → PoseFilter → ViewerStateController integration or troubleshooting that crosses subsystem boundaries  
• stronger reasoning is reserved for final evidence interpretation or escalation when simple calibration/filter assumptions fail

# 11\. Pose Estimator Experiment Harness

Purpose:  
M0D uses a controlled experiment to compare two predefined viewer-pose estimators. The experiment separates estimator implementation, evidence collection, and evidence interpretation so routine work can remain deterministic and lower-cost.

Prerequisite:  
Before M0D4–M0D7 begin, the Pose Estimator Experiment Specification must freeze:  
• estimator A method and reference/formula  
• estimator B method and reference/formula  
• required TrackingObservation inputs  
• estimator-intrinsic calibration inputs  
• RawViewerPose output semantics  
• metric formulas  
• live test matrix and timing  
• evidence schema and file naming  
• procedural invalidation/rerun rules  
• M0D7 restrictions and M0D8 review inputs

Estimator comparison rules:  
• both candidates use the same TrackingObservation contract  
• both candidates are evaluated before M0E host-level filtering  
• both candidates are tested against the same recorded/synthetic inputs and the same live measurement procedure  
• raw/null/invalid results are preserved rather than silently repaired  
• OpenCV/solvePnP is an escalation path only if neither baseline estimator is adequate

Required metrics:  
• stationary X/Y/Z RMS deviation of raw estimator output  
• depth repeatability at multiple seated distances  
• lateral and vertical repeatability  
• cross-axis error where specified by the experiment  
• discontinuity/outlier counts  
• update rate  
• estimator processing time  
• percentage of unusable/null samples  
• behavior during partial face visibility or normal head rotation  
• calibration steps required by each estimator

M0D6 replay and metrics requirements:  
• recorded traces must replay deterministically  
• metric calculations must be automated and reproducible  
• the same trace/configuration must produce the same summary within normal floating-point tolerance  
• evidence validation must reject missing trials, malformed metadata, non-finite values, and incomplete/corrupt captures  
• metric tooling must not make a qualitative estimator recommendation

M0D7 scripted live evidence-collection matrix:  
Use the exact procedure and physical positions defined in the Pose Estimator Experiment Specification. The baseline matrix shall include:  
• neutral stationary: 5 × 5-second trials  
• near stationary: 3 × 5-second trials  
• far stationary: 3 × 5-second trials  
• left/right movement: 3 prescribed cycles  
• up/down movement: 3 prescribed cycles  
• approach/retreat: 3 prescribed cycles  
• natural seated motion: 30-second capture  
• partial-visibility / normal head-turn scenario: fixed prescribed short run  
• processing/cadence run: 60-second capture

M0D7 collection rules:  
• execute the same matrix for estimator A and estimator B  
• use the same prescribed calibration and configuration for each estimator except estimator-specific values explicitly required by the experiment specification  
• do not change estimator equations, calibration rules, test duration, physical positions, metrics, or acceptance criteria during collection  
• do not remove unfavorable samples or outliers from the evidence bundle  
• do not rerun a trial because its result appears poor  
• rerun only for procedural invalidation such as wrong configuration, failed capture, application crash, user movement before capture start when the procedure requires stillness, or incomplete/corrupt evidence  
• preserve invalid/null observations and anomalies as evidence  
• mark procedural invalidations explicitly rather than overwriting the original record where practical  
• do not rank, select, tune, or recommend an estimator during M0D7

M0D7 evidence-completeness gate:  
Before handoff to M0D8:  
• every required scenario/trial exists or is explicitly marked procedurally invalid  
• environment/configuration metadata is present  
• both estimators were run under equivalent prescribed conditions  
• all required raw traces and summaries exist  
• all required numeric values are finite unless explicitly represented as null/invalid by schema  
• anomaly and procedural-deviation records are present where applicable  
• the evidence-bundle validator passes

M0D8 interpretation boundary:  
M0D8 begins only after the M0D7 evidence bundle validates. M0D8 may:  
• compare estimator A and B against predefined criteria  
• distinguish implementation defects, measurement limitations, and estimator limitations  
• determine whether either estimator is suitable for the baseline  
• recommend additional evidence when the experiment is inconclusive  
• recommend escalation to solvePnP or another estimator only when evidence warrants it  
• create/recommend ADR-006.01 when a production estimator is supported by evidence

M0D8 must not retroactively alter the M0D7 test procedure to improve a preferred estimator's result. If the procedure itself is found defective, record that finding and run a new versioned experiment.

The comparison output must remain machine-readable and preserve enough raw evidence for independent review.

# 12\. Tracking Worker Tests

Automated tests should verify the worker protocol independently of live camera quality.

Required:  
• init → ready lifecycle  
• initialization failure → structured error  
• local model/WASM asset loading path  
• frame accepted only after readiness  
• latest-frame backpressure behavior  
• no unbounded pending frame queue  
• frame replacement/drop counters are correct  
• stale observation results are ignored  
• message protocol version mismatch rejected  
• normalized TrackingObservation output follows the frozen contract  
• malformed/non-finite observations are rejected before estimator use  
• shutdown releases worker resources  
• repeated start/stop does not create duplicate active workers  
• inference metrics are emitted in expected shape

Packaged tests must separately verify that the actual MediaPipe model/WASM assets load in WebView2 with required network access unavailable.

Worker/protocol failures found during M0D7 are implementation or harness defects and should be routed to the appropriate implementation task for correction; M0D7 itself remains an evidence-execution task rather than an open-ended troubleshooting task.

# 13\. World Manifest and Discovery Tests

World manifest/discovery behavior is part of the reusable world-package conformance harness and should not be reimplemented as one-off tests for individual worlds.

Primary reusable suite:  
tests/conformance/world-manifest.conformance.ts

The final repository path may differ, but one shared suite should verify the structural/discovery contract against multiple package fixtures.

Valid cases:  
• valid immediate-child package  
• multiple valid packages  
• stable reverse-domain package IDs  
• compatible semantic engineApi range  
• valid package-local entry path  
• valid optional settings schema/UI paths

Invalid/boundary cases:  
• missing world.manifest.json  
• malformed JSON  
• missing required fields  
• duplicate package IDs  
• invalid reverse-domain ID  
• incompatible engineApi  
• invalid semantic version/range  
• entry path escaping package root  
• settings schema/UI path escaping package root  
• recursive/nested package ignored as designed  
• one invalid package does not prevent valid packages from appearing

Required assertions:  
• manifest validation occurs before executable package code is loaded  
• invalid/incompatible packages are rejected deterministically with useful structured errors  
• duplicate IDs never produce ambiguous activation  
• package-path validation cannot be bypassed by normalization/path traversal  
• discovery remains non-recursive  
• structural conformance does not imply behavioral or packaged-runtime conformance

Where practical, test names/output should reference the corresponding WPC-DIR/WPC-MAN requirement IDs from the World Package Conformance Specification.

# 14\. World Lifecycle Tests

World lifecycle behavior must be verified by a reusable conformance suite rather than tests tied only to the diagnostic room.

Primary reusable suite:  
tests/conformance/world-lifecycle.conformance.ts

The suite should execute against a minimal world factory/adapter so the same lifecycle assertions can be applied to the diagnostic reference world and later production worlds.

Required lifecycle assertions:  
• initialize is called exactly once per activation  
• update never starts before successful initialize  
• failed initialize prevents update  
• failed activation is not persisted as the active world  
• update stops before dispose begins  
• dispose is called during normal switch/shutdown  
• host-owned cleanup continues best-effort after dispose failure  
• partial initialization is cleaned after failure  
• each activation receives a fresh world-owned scene root  
• the host removes the world root after disposal  
• failed package/world execution cannot corrupt global settings/calibration  
• host remains recoverable after world failure  
• repeated activation/switch/disposal does not accumulate unbounded world-owned resources

Fixture coverage must include at least:  
• valid-minimal/normal world  
• init-failure  
• update-failure  
• dispose-failure  
• resource-sentinel

The diagnostic room must pass the same applicable lifecycle suite. It must not receive diagnostic-only lifecycle exceptions or privileged cleanup paths.

# 15\. World Settings Tests

World settings behavior must be covered through a reusable conformance suite.

Primary reusable suite:  
tests/conformance/world-settings.conformance.ts

Required settings tests:  
• valid settings.schema.json accepted  
• unsupported/invalid schema rejected with useful error  
• settings.ui.json unknown hints fall back safely  
• JSON Pointer controls map to intended properties  
• JSON Schema remains authoritative over UI hints  
• saved values validate before world delivery  
• invalid saved values never reach world code  
• same package version preserves valid saved settings  
• package version change resets saved settings to current defaults  
• default generation is deterministic  
• host UI cannot persist values outside schema constraints  
• settings delivered to world code are treated as read-only  
• world code cannot directly modify package settings files  
• world code cannot inject a private settings UI into the host  
• unsupported UI hints do not invalidate otherwise valid settings

Ajv behavior should be covered with representative Draft 2020-12 features actually supported by the product. The conformance suite should avoid testing JSON Schema features that World Viewer does not claim to support.

The diagnostic reference world should contain a deliberately small representative schema exercising at least boolean, numeric, and enum/select behavior unless later accepted implementation evidence narrows the supported baseline.

# 15A. World Package Conformance Harness

The repository shall provide reusable world-package conformance suites and a small shared testkit rather than duplicating contract assertions in each world.

Conformance reporting should distinguish:  
• structural conformance — package/discovery/manifest validation before code execution  
• behavioral conformance — public API, lifecycle, settings, assets, isolation, and cleanup behavior  
• packaged-runtime conformance — applicable behavior proven in the real packaged Tauri/WebView2 environment

A package should not be described simply as “World Viewer conformant” unless every mandatory conformance level applicable to it passes.

# 

Recommended conceptual structure:

# 

tests/  
  conformance/  
    world-manifest.conformance.ts  
    world-lifecycle.conformance.ts  
    world-settings.conformance.ts  
    world-assets.conformance.ts  
    world-isolation.conformance.ts  
  fixtures/  
    worlds/  
      ...  
  testkit/  
    world-harness.ts  
    fake-world-context.ts  
    fake-world-assets.ts  
    resource-sentinel.ts

# 

Exact paths may change to fit the repository. The reusable nature of the harness is the requirement.

# 

Conformance-harness requirements:  
• suites can be invoked against more than one world/package implementation  
• the diagnostic room runs the same applicable suites as production worlds  
• diagnostic-room-specific exceptions are prohibited unless the underlying public contract explicitly defines them  
• time-dependent behavior uses controlled clocks/events rather than arbitrary sleeps where practical  
• expected fixture failures are deterministic and distinguishable from harness failures  
• test output should identify the relevant WPC requirement ID when practical  
• conflicts between a conformance test and an accepted higher-authority contract stop and escalate; an implementation agent must not silently weaken the contract or test  
• packaged-runtime checks remain separate for behavior that headless tests cannot prove

# 

The conformance harness is an executable expression of the approved contract; it is not authority to invent new world capabilities.

# 

# 15B. Required Fixture-World Matrix

The baseline fixture catalog should remain intentionally small, with each package isolating one known condition:

# 

tests/fixtures/worlds/  
  valid-minimal/  
  invalid-manifest/  
  duplicate-id/  
  incompatible-api/  
  path-traversal-entry/  
  path-traversal-settings/  
  init-failure/  
  update-failure/  
  dispose-failure/  
  invalid-settings/  
  asset-escape/  
  resource-sentinel/

# 

Fixture rules:  
• each fixture has one obvious intended purpose  
• intentional failures use stable recognizable error text/codes where practical  
• fixtures contain no unnecessary content that could obscure the failure cause  
• new fixtures are added when real regressions expose a missing boundary rather than speculatively multiplying cases  
• valid-minimal remains the smallest package that proves mandatory structure/lifecycle

# 

# 15C. Static World/Host Architecture-Boundary Tests

Runtime success does not prove that a world respected the host/world architecture. The repository therefore requires both reusable isolation-contract tests and automated static/build-time boundary enforcement.

Primary reusable suite:  
tests/conformance/world-isolation.conformance.ts

The isolation suite should verify the public capability shape itself, including that WorldContext does not expose mutable engine camera/projection/tracking/native/persistence capabilities and that viewer state is delivered only through frame-scoped WorldFrame rather than a separate getViewerState()-style accessor. Static checks separately verify that world source code does not bypass the public contract through forbidden imports or direct platform APIs.

# 

World code may depend on:  
• the approved public world-facing API/SDK surface  
• package-internal modules  
• permitted bundled world dependencies such as Three.js  
• package-local assets through the approved resolver

# 

World code must not depend on:  
• host-private engine internals  
• tracking or pose-estimation internals  
• pose-filter internals  
• calibration repositories  
• ProjectionController or the mutable engine camera  
• NativeHost or unrestricted Tauri/native APIs  
• direct webcam/media-device acquisition  
• application persistence internals  
• another world package’s private files  
• required remote runtime assets/network services

# 

Boundary-test requirements:  
• run automatically in the relevant local verification path  
• run in CI when CI is introduced  
• fail with an actionable message naming the forbidden dependency and approved boundary  
• use the simplest maintainable mechanism that reliably enforces the rules  
• suppressions/exceptions require explicit review and must not become routine bypasses

# 

The exact enforcement tool may be ESLint/import rules, TypeScript/build restrictions, a small purpose-built checker, or a combination. The tool choice is implementation detail; the enforced boundary is not.

# 

# 15D. Diagnostic Reference-World Conformance

The diagnostic room is the canonical reference implementation of a normal world package and must not be a privileged host feature.

# 

Required behavior:  
• package-shaped source structure from M0B even if temporarily statically wired  
• normal VirtualWorld lifecycle  
• normal WorldContext and frame-scoped WorldFrame/ViewerState only  
• no mutable camera/projection/tracking/native/persistence access  
• representative world settings  
• at least one package-local asset through the normal asset resolver  
• world logging through the normal public capability  
• representative resource cleanup  
• applicable reusable conformance suites pass

# 

During early M0, the diagnostic room may be statically connected while the production package loader does not yet exist. By M0F, the same implementation must use the real manifest/discovery/dynamic-loading path.

# 

A second diagnostic-only implementation must not be created to avoid making the package-shaped reference world conformant. Existing reference code is an example; if it conflicts with the approved contract, the code is corrected.

# 15E. World Asset Conformance Tests

World asset behavior is verified through the reusable world-assets.conformance.ts suite.

# 

Required assertions:  
• package-relative valid assets resolve successfully  
• path traversal outside the active package root is rejected  
• remote/network asset URLs are rejected for normal world assets  
• a world cannot resolve another world package’s private assets  
• the host-selected local/Tauri asset representation remains opaque to the world contract  
• at least one real package-local asset is loaded by the diagnostic reference world through the production resolver path  
• missing/corrupt assets produce a bounded world/package failure rather than corrupting host-global state  
• asset tests do not reimplement Three.js loading behavior that is already owned by mature Three.js loaders

# 

Headless tests should verify path/isolation semantics. Packaged smoke must separately prove that the production resolver representation actually loads inside the packaged Tauri/WebView2 environment.

# 

# 16\. Persistence Tests

Versioned JSON persistence tests shall include:

• clean first-run initialization  
• save/read round trip  
• schemaVersion validation  
• malformed JSON recovery/error path  
• unsupported schema version  
• atomic write success  
• simulated interrupted temp write does not destroy last valid configuration  
• profile IDs remain stable  
• last-active-world update occurs only after successful activation  
• package directory survives restart  
• world settings are keyed to package ID/version correctly

Filesystem-specific atomic replacement behavior must also receive a packaged/native integration test because unit tests cannot prove Windows filesystem semantics.

# 17\. Diagnostic JSON Tests

The diagnostic builder requires automated schema and privacy tests.

Verify:  
• output is valid UTF-8 JSON  
• schemaVersion present  
• application/world version included where available  
• display/calibration information included  
• camera settings/capabilities included when available  
• tracking/viewer state included  
• performance summaries included  
• structured errors included  
• recent logs are bounded to 200 entries or 256 KiB, whichever is reached first  
• raw webcam imagery is absent  
• unsupported/unavailable metrics are omitted or null according to schema, never fabricated  
• export itself does not mutate runtime state  
• diagnostic export works offline

The eventual JSON Schema for diagnostic export should be used as an automated validation oracle.

# 18\. Offline Tests

Offline operation is a hard requirement and needs explicit testing.

Static/build checks:  
• production output contains no required CDN URLs  
• MediaPipe model/WASM assets exist locally  
• host fonts/icons/runtime assets exist locally  
• world package references remain local  
• world package source/build output contains no required remote runtime asset/service dependency  
• package-local asset paths remain inside the package boundary  
• static world/host architecture-boundary checks pass

Packaged runtime smoke:  
• disable/block network access  
• launch application  
• load the diagnostic reference world through the production package-loading path  
• initialize MediaPipe  
• use camera tracking  
• resolve at least one package-local world asset through the production asset path  
• open settings/diagnostics  
• switch world/package fixture where applicable  
• verify world settings remain functional  
• export diagnostic JSON  
• restart and restore state

A test passes only if missing network access does not create hidden startup/runtime failures.

Offline success in Vite/dev mode does not prove packaged offline conformance.

# 19\. Packaged Tauri Smoke Test Matrix

The packaged application must be tested separately from dev mode. The packaged smoke suite shall be automated during Milestone 0 rather than postponed until the Tauri/world-loading paths are mature.

Minimum smoke matrix:  
• application starts without localhost/dev server  
• production CSP permits required local assets but rejects unintended remote dependencies  
• camera permission path works  
• camera enumeration/capture initializes  
• MediaPipe WASM/model loads  
• tracking worker starts  
• worker frame-transfer path works  
• Three.js renderer starts  
• synthetic projection mode works  
• diagnostic reference world loads through the production manifest/discovery/local-ESM path  
• manifest validation occurs before executable package code for invalid/incompatible package fixtures  
• package-local textures/assets resolve through the production world asset path  
• world switch/update/dispose path works in the packaged shell  
• at least one invalid/incompatible package fixture is rejected without corrupting host-global state or preventing recovery  
• full-screen mode works  
• settings persistence works  
• diagnostic JSON export works  
• clean shutdown releases camera/worker and disposes the active world

Packaged smoke is not a replacement for the headless conformance suites; it proves behaviors that only the real Tauri/WebView2 environment can establish.

These tests should be repeated after changes to Tauri, Vite, CSP, worker configuration, asset paths, package discovery/loading, world-host boundaries, or local module loading.

# 20\. Reference Hardware Measurement Environment

Primary acceptance hardware:

Lenovo ThinkPad E590 20NB005RUS  
• Windows 11 Pro  
• Intel Core i5-8265U  
• 16 GB RAM  
• Intel UHD Graphics 620  
• 1920 × 1080 internal display at approximately 59.98 Hz  
• integrated fixed webcam  
• visible display approximately 345.4 × 194.3 mm

Each performance report should record:  
• app build/commit  
• relevant dependency versions  
• Windows build  
• display resolution/refresh/scaling  
• camera device and active capture mode  
• power state if materially relevant  
• warm-up duration  
• sample duration/count  
• active world  
• estimator/filter configuration

Results from faster machines may be useful for debugging but do not replace reference-hardware acceptance measurements.

# 21\. Render Performance Acceptance

For the Milestone 0 diagnostic world on the reference laptop:

Targets from the NFR:  
• render loop targets display refresh  
• p95 frame completion target: 20 ms or less after warm-up  
• sustained frame rate should not remain below 45 FPS during ordinary single-viewer use

Measurement procedure should:  
1\. launch packaged app  
2\. load diagnostic room  
3\. warm up for a fixed period  
4\. measure a fixed sample window  
5\. exclude intentional world loading/setup intervals  
6\. report median, p95, p99 where useful, and dropped/long frames  
7\. record world-update time separately from total render-frame time

Standard acceptance timing: use a 10-second warm-up followed by a 60-second measurement window unless a test explicitly documents a different requirement.

# 22\. Tracking Performance Acceptance

Reference-hardware tracking targets:

• useful pose updates at 15 Hz or better  
• 20–30 Hz preferred if the hardware supports it  
• inference must not block the render/UI thread  
• latest-frame policy must avoid increasing backlog latency

Measure:  
• camera capture cadence  
• worker input cadence  
• inference duration median/p95  
• accepted observation cadence  
• dropped/replaced frame counts  
• pose-estimator duration  
• filter duration  
• age of pose sample at render consumption where measurable

Tracking Hz alone is not a success metric if samples are stale.

# 23\. Stationary Jitter Acceptance

NFR acceptance target:

After filter settling, during a stationary 5-second sample:  
• X RMS deviation ≤ 3 mm  
• Y RMS deviation ≤ 3 mm  
• Z/depth RMS deviation ≤ 8 mm

Procedure:  
1\. establish calibrated normal seated pose  
2\. allow tracking/filter to settle  
3\. remain stationary for 5 seconds  
4\. record raw and filtered poses  
5\. calculate mean and RMS deviation per axis  
6\. record dropped/invalid samples  
7\. run five complete 5-second trials at the neutral seated pose  
8\. perform additional spot checks at nearer and farther normal seated distances

The numeric test does not replace the manual visual requirement that the diagnostic world show no objectionable swimming/shaking.

# 24\. Motion-to-Photon / Responsiveness Testing

Acceptance target:  
• median ≤ 80 ms  
• p95 ≤ 120 ms

True motion-to-photon latency is not fully proven by ordinary internal timestamps.

Use two categories:

A. Internal software latency  
Measure identifiable stages:  
• frame/capture timestamp where available  
• worker transfer  
• inference  
• pose estimation  
• filtering  
• age of ViewerState consumed by render  
• frame presentation proxy where available

B. External end-to-end test  
A repeatable physical procedure should be developed in Milestone 0, potentially using high-frame-rate video or another observable synchronized motion/display stimulus.

A high-frame-rate external motion-to-photon procedure is optional during Milestone 0 if internal timing measurements and perceptual responsiveness are healthy. Until an external procedure is actually executed, internal latency must not be mislabeled as true motion-to-photon latency.

# 25\. Tracking Loss / Reacquisition Acceptance

Approved timing behavior:

• short interruption is tolerated through the 350 ms confirmation grace  
• after confirmed loss, the effective view returns toward neutral over 5 seconds  
• reacquisition blends toward tracked pose over an initial 300 ms tuning value

Automated tests verify timing mathematics.

Manual packaged test verifies:  
• no visible snap at loss  
• transition feels smooth  
• neutral pose is reached  
• reacquisition does not snap  
• rapid loss/reacquisition does not oscillate badly

Milestone 0 may tune the 350 ms and 300 ms values; any architecture-significant change should update the relevant ADR.

# 26\. Memory and Resource Lifecycle Acceptance

Use the approved 25-cycle world-switch test.

Procedure:  
• establish stabilized baseline after warm-up  
• alternate between known fixture worlds for 25 complete switch cycles  
• allow normal cleanup/GC opportunities  
• record JavaScript heap where available  
• record total process memory where available  
• count host-observable Three.js resources, workers, timers/listeners where practical  
• analyze final 10 cycles

Balanced guardrails:  
• JS heap approximately ≤ 10 MB above stabilized baseline  
• total process memory approximately ≤ 50 MB above stabilized baseline  
• no sustained positive slope \> approximately 1 MB/cycle across final 10 cycles  
• world-owned resources return to expected baseline counts

A one-time cache increase followed by a plateau is not automatically a leak.

# 27\. Startup and World-Switch Acceptance

Reference-hardware release limits:

• cold startup to interactive restored/default world ≤ 5 seconds  
• valid local world switch to interactive ≤ 5 seconds  
• 2-second world switch remains an optimization target, not a release gate

Measure phase timings separately:  
• app shell startup  
• persistence load  
• world discovery  
• renderer initialization  
• tracking/model initialization  
• world module load  
• world initialize  
• ready/interactive

Separating phases prevents one slow component from being hidden inside a single total.

# 28\. Manual Fixed-Window Illusion Acceptance

Some critical product behavior is perceptual.

The diagnostic-room manual test should evaluate:

• viewer moves left: scene reveals geometry as though looking through a fixed window  
• viewer moves right: opposite parallax is coherent  
• viewer moves up/down: vertical parallax remains coherent  
• viewer moves closer: angular view through the aperture changes plausibly  
• viewer moves farther: inverse behavior  
• screen appears fixed rather than following/rotating with the head  
• straight lines and edge objects do not visibly expose projection sign errors  
• stationary pose does not visibly swim  
• normal slow head movement does not feel rubber-banded  
• neutral return/reacquisition is smooth

Use the same diagnostic room and normal seated viewing range for comparisons across builds.

# 29\. Calibration Acceptance

Manual calibration acceptance should verify:

• physical width/height can be entered clearly  
• live camera preview is available  
• integrated camera is identified  
• required camera offset measurement is understandable if needed  
• neutral pose can be established without expert tools  
• reset to reference/default profile works  
• invalid values are rejected  
• result can be reproduced after app restart

The user should not need checkerboards, lens-calibration software, or a specialist computer-vision workflow for the baseline product.

M0E calibration acceptance also verifies:  
• RawViewerPose is already in canonical screen-relative millimeters before host correction  
• identity host correction is valid and deterministic  
• if scale/offset correction is used, it is supported by measured reference samples  
• residual calibration error and repeatability are recorded  
• no more complex calibration model is introduced without evidence that the simple model is insufficient  
• calibration changes reset downstream filter history safely  
• recorded traces can reproduce calibration/filter results without live webcam input

# 30\. Failure and Recovery Testing

Test at least these recoverable failures:

Tracking/application failures:  
• camera permission denied  
• camera unavailable/disconnected  
• MediaPipe model missing/corrupt  
• worker initialization failure  
• tracking source stops unexpectedly  
• invalid display/calibration values  
• corrupted app-state JSON  
• invalid/missing last-active world  
• failed diagnostic export destination

World/package failures:  
• malformed world manifest  
• duplicate package ID  
• incompatible world engineApi  
• entry path escaping package root  
• settings schema/UI path escaping package root  
• invalid persisted world settings  
• package asset path escaping package root  
• world initialize failure  
• world update failure  
• world dispose failure

World/package failure cases should use the deterministic fixture packages defined in Section 15B wherever practical.

Expected behavior:  
• no unrecoverable crash where recovery is specified  
• invalid/incompatible package code does not execute when pre-load validation should reject it  
• projection never receives NaN/Infinity state  
• global settings/calibration remain intact  
• one failed world/package does not corrupt other packages or the configured package directory  
• host-owned cleanup continues best-effort after world failure  
• structured error is produced  
• expected fixture failure can be distinguished from an unexpected harness/runtime failure  
• the user can reach a safe state/retry path where appropriate  
• recovery never broadens filesystem/native/world capabilities as a fallback

# 31\. Test Classification and Naming

Tests should be easy for agents and humans to select.

Suggested categories/tags:  
• unit  
• integration  
• conformance  
• architecture-boundary  
• world-fixture  
• projection  
• tracking  
• world  
• persistence  
• diagnostics  
• packaged  
• performance  
• reference-hardware  
• manual

File names should indicate subsystem and behavior rather than milestone alone.

Examples:  
projection-off-axis.test.ts  
viewer-state-loss.test.ts  
world-manifest.conformance.ts  
world-lifecycle.conformance.ts  
world-settings.conformance.ts  
world-assets.conformance.ts  
world-isolation.conformance.ts  
world-boundary-imports.test.ts  
diagnostic-schema.test.ts

Where practical, conformance test names/output should include the relevant WPC requirement ID so an agent can understand the failed obligation without loading the entire conformance document.

Hardware/manual procedures should have named checklists/scripts so “tested manually” is not ambiguous.

# 32\. CI Strategy

The eventual CI pipeline should prioritize deterministic tests that do not require special hardware.

On each relevant push/PR:  
• install from lockfile  
• typecheck  
• unit tests  
• subsystem integration tests  
• reusable world-package conformance suites when world/host code is in scope  
• minimal fixture-world tests  
• static world/host architecture-boundary checks  
• production frontend build  
• Tauri compile/package validation when CI environment supports it  
• offline/static asset checks  
• deterministic verification commands named by handoff-ready subsystems should be mapped to stable repository scripts where practical and run in CI when they do not require special hardware  
• CI or a lightweight validation script should verify referenced handoff paths/files exist when that can be done reliably without turning prose documentation into a second schema

CI should fail fast on type, contract, conformance, architecture-boundary, projection, and schema regressions before expensive packaging jobs where practical.

Changes affecting package discovery, local ESM loading, CSP, package-local asset resolution, or the host/world runtime boundary should also trigger the relevant packaged smoke job when the CI environment supports packaged execution.

Reference-hardware webcam/perceptual tests should not be faked in generic cloud CI. They remain explicit acceptance runs on the E590 until reliable hardware-in-the-loop automation exists.

# 33\. Flaky Test Policy

Flaky tests are defects.

Rules:  
• do not solve timing flakiness by adding arbitrary sleeps when a controllable clock/event can be used  
• deterministic tests must not use real wall-clock timing  
• random tests use fixed/reportable seeds  
• packaged/hardware tests must state environmental prerequisites  
• rerunning until green is not acceptance evidence  
• a repeatedly flaky test may be quarantined only with a tracked reason and replacement plan

Tests intended for agent task acceptance should be especially deterministic.

# 34\. Test Evidence and Reporting

For ordinary implementation tasks, the agent/developer should report:  
• commands/tests run  
• pass/fail count  
• any tests intentionally not run  
• changed test files  
• Class A/B/C classification for any newly created or materially changed expected test behavior  
• whether any accepted/frozen Class B conformance expectation or Class C oracle was changed, and the explicit authority/review that permitted the change  
• relevant conformance/boundary checks  
• relevant packaged/manual verification

For Milestone 0 measurement work, retain structured evidence under the repository-level evidence/ directory. Store durable machine-readable summaries, procedures, traces, and references there when they are useful for reproducing or reviewing an experiment.

Collection and interpretation are deliberately separate responsibilities:  
• the evidence-collection agent follows prescribed procedures, captures raw outputs, verifies artifact completeness, and calculates only explicitly defined statistics  
• test harnesses should calculate RMS, median, p95, slopes, counts, and similar objective metrics automatically where practical  
• the evidence-collection agent must not change thresholds, tune the product, reinterpret a failed requirement, or make architecture decisions while collecting results  
• Luna-Medium is sufficient for routine M0H acceptance execution and evidence capture when procedures are explicit  
• Terra-Medium is an escalation path for harness, packaged-runtime, environment, or collection failures that require troubleshooting  
• stronger reasoning is applied only after the evidence bundle is complete, to synthesize results, distinguish product failures from measurement/harness problems, recommend tuning/remediation, and determine architecture or ADR consequences

M0D estimator experiment evidence:  
• store the M0D estimator-comparison bundle under evidence/m0d/ using the file structure defined by the Pose Estimator Experiment Specification  
• retain raw observations/poses needed to reproduce the fixed metrics  
• retain per-estimator metric summaries, environment/configuration metadata, anomaly records, and procedural-invalidity records  
• include an evidence-bundle validation result  
• M0D7 may calculate only predefined metrics and completeness checks; it must not rank, tune, or recommend an estimator  
• Luna-Medium is the default model for M0D7 prescribed collection and evidence validation  
• Terra-Medium is used only when collection is blocked by a worker, packaged-runtime, environment, or harness defect that requires troubleshooting  
• Sol-High performs M0D8 comparative interpretation after the bundle validates; M0D8 may recommend ADR-006.01 or an evidence-driven escalation

World-package conformance evidence:  
• retain a machine-readable Milestone 0 summary at evidence/milestone-0/world-package-conformance.json  
• record the reviewed commit/build and World Package Conformance Specification version  
• record reusable conformance-suite results  
• record required fixture-world catalog presence/results  
• record static architecture-boundary check result  
• record diagnostic reference-world conformance result  
• record packaged-runtime world loading/asset/switch/failure-recovery smoke results  
• reference the accepted packaged local-ESM loading/lifecycle evidence rather than duplicating it  
• record any non-applicable check explicitly rather than silently omitting it

Each result should include:  
• build/commit  
• environment  
• configuration  
• sample counts/windows  
• median/p95 metrics where applicable  
• pass/fail against the stated target when mechanically determinable  
• raw trace/artifact reference where appropriate  
• diagnostic JSON reference  
• anomalies/limitations  
• collection errors or deviations from procedure

Milestone 0 handoff-readiness evidence:  
• store the final cross-subsystem review at evidence/milestone-0/handoff-readiness.json  
• record each required subsystem as pass/fail with the reviewed commit, handoff path, authoritative oracle/freeze-status references, approved reuse/dependency/custom-code-boundary references, verification commands/results, and references to supporting evidence  
• handoff notes link to evidence artifacts rather than duplicating raw measurements or interpretation  
• a missing, stale, contradictory, or unverifiable handoff package is a failed readiness check when Milestone 1 intends to rely on that subsystem as stable

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

The evidence/ directory is the project’s durable source-controlled home for hardware/performance and experiment evidence. Large or unsuitable binary artifacts may be referenced rather than committed when repository size would become unreasonable.

After M0H collection is complete, the full evidence/milestone-0/ bundle should be reviewed as a separate analysis task. That review compares the evidence against this Testing Strategy and the Milestone 0 exit criteria, identifies passes, failures, and ambiguous results, distinguishes likely harness/measurement issues from product issues, recommends remediation or tuning, and identifies any ADR consequences. Raw evidence remains unchanged; interpretation belongs in the review summary.

The goal is enough durable evidence for later ADRs and next-step decisions without forcing future agents to reconstruct the experiment from chat history.

# 35\. Subsystem Handoff-Readiness and M1 Architecture-Freeze Verification

A subsystem is handoff-ready when a later implementation agent can safely use it as a stable dependency without re-deriving architecture or guessing how correctness is verified.

This gate applies to each Milestone 0 subsystem that Milestone 1 will treat as stable.  
Registry lifecycle:  
• M0A creates docs/testing/oracle-registry.md from the approved Oracle Registry design and docs/reuse-register.md from the approved Reuse & Dependency Register design, with their header/legend/template structures present before subsystem implementation begins  
• M0B–M0G populate or update the relevant registry entries in the same bounded changes that make an oracle, dependency/reference choice, reuse boundary, or subsystem handoff real; entries must not be deferred until M0H as reconstruction work  
• M0H validates both registries for completeness, status, authority alignment, and consistency with the reviewed commit as part of Verification Readiness and Reuse Readiness  
• M1A revalidates every registry entry required by downstream Milestone 1 work against the actual M1 starting commit before ordinary M1 implementation consumes it  
Canonical reuse fields: use “Reuse Mode” for A/B/C/D and “Prohibited Reinvention” for the mature behavior that must not be replaced, bypassed, duplicated, or rebuilt. A handoff records the authoritative Approval Source but never serves as that source.  
Canonical handoff structure reference:  
• the canonical handoff field set/semantics are owned by the Technical Design Specification “Production handoff architecture” section and, once M0A creates the repository, operationalized by docs/handoff/README.md  
• this Testing Strategy does not define or maintain a second handoff schema; it verifies that each reviewed note conforms to the current canonical TDS/repo template  
• a missing canonical field, stale template, unresolved ORC/REUSE reference, or field/source contradiction is a readiness failure  
• the checks below define verification/pass-fail semantics only; they do not create new handoff fields  
• the Milestone Roadmap determines when M0H runs this readiness review and which later milestone may consume a passing result  
Handoff-readiness checks:  
• every referenced file/path exists at the reviewed commit  
• the stable contract typechecks and the known-good implementation satisfies it  
• every Oracle ID named by the handoff resolves to a current record in docs/testing/oracle-registry.md and the record’s governing authority, authoritative test/procedure, classification, review status, freeze status, frozen baseline, and change authority agree with the handoff and reviewed commit  
• every authoritative test/oracle named by the handoff exists, is traceable to its governing requirement/contract/experiment source, and has an unambiguous M1 freeze status  
• every Class C oracle marked frozen for M1 has completed the required stronger-reasoning review/freeze process  
• no oracle that remains provisional is being treated as a stable M1 acceptance mechanism  
• required deterministic tests and fixtures execute successfully  
• required packaged, hardware, or manual verification is referenced when deterministic tests alone cannot prove the behavior  
• verification commands are runnable from the documented repository context and produce the expected result  
• governing ADRs and evidence do not conflict with the handoff summary  
• every REUSE ID named by the handoff resolves to a current record in docs/reuse-register.md and the record’s status, approval source, approved component/reference, Reuse Mode, relevant version/source/provenance constraints, permitted custom-code boundary, Prohibited Reinvention, and verification agree with the handoff and reviewed commit  
• the approved dependency/reference implementation and Reuse Mode match the authoritative Approval Source; valid approval originates from an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision; a handoff may reference that source but is not itself approval authority  
• any copied/adapted reference with material provenance/licensing implications has an explicit source/version/provenance reference  
• the remaining project-specific custom-code boundary is narrow and specific enough that an implementation agent can distinguish permitted glue/adapters from architecture/reimplementation work  
• Prohibited Reinvention is explicit enough to prevent a mature approved capability from being silently rebuilt  
• limitations are specific enough that an implementation agent will not mistake unsupported behavior for a defect to redesign  
• escalation conditions cover at least: frozen-contract changes, accepted-ADR conflicts, frozen-oracle changes/reclassification, approved dependency/reference substitution, Reuse Mode changes, custom-code-boundary expansion, and new cross-subsystem dependency requirements  
• the handoff note does not duplicate normative behavior that is already better represented by code, interfaces, tests, ADRs, or evidence  
• no unresolved disagreement exists among the authoritative sources; a conflict blocks handoff readiness rather than being resolved implicitly by an implementation agent  
Additional world-package handoff checks:  
• the World Package Conformance Specification is referenced as the compact world-package contract context  
• the diagnostic room is the known-good canonical reference world and uses no privileged host capability  
• the diagnostic room passes all applicable reusable world-package conformance suites  
• the required fixture-world catalog is present and its deterministic checks pass  
• static world/host architecture-boundary enforcement is active and passes  
• packaged-runtime conformance is proven for the diagnostic reference world through the production package-loading path  
• manifest validation-before-code-load, package-local asset resolution, world switch/dispose, and representative package rejection/recovery are covered by automated verification  
• the handoff contains no diagnostic-only exception that Milestone 1 would need to understand or preserve  
• the exact public world-facing contract is frozen; ordinary Milestone 1 work must not decide how worlds access new host capabilities

M1 architecture-freeze checks:  
• identify every evidence-gated technical choice that Milestone 1 depends on and verify that it has an accepted baseline rather than an experimental, provisional, contradictory, or undocumented state  
• verify the accepted production pose estimator and its governing evidence/ADR outcome  
• verify the accepted baseline calibration approach/model and any approved correction model/defaults  
• verify the worker frame-transfer representation/mechanism selected from packaged WebView2 compatibility/performance evidence  
• verify the packaged local ESM loading mechanism proven by the packaged world-loading experiment  
• verify the production filtering implementation and baseline/default parameters selected from deterministic/objective/perceptual evidence  
• verify the world package-loading and lifecycle behavior against its stable contracts, reusable conformance suites, static boundary checks, diagnostic reference world, fixture catalog, and packaged evidence  
• a choice may remain unresolved only when Milestone 1 does not depend on it, and that non-dependency is documented  
• handoff readiness and architecture freeze are both required: a well-documented subsystem still fails the M1 gate if a required architecture choice is unresolved  
• if a required choice conflicts with an accepted ADR, test oracle, reference implementation, conformance specification, or evidence, the freeze check fails and escalates rather than choosing a resolution during ordinary implementation  
• record the architecture-freeze result and supporting references in evidence/milestone-0/handoff-readiness.json alongside the subsystem handoff-readiness results  
• the M1 Architecture Freeze Gate is independently pass/fail for the architecture decisions Milestone 1 depends on; passing handoff readiness does not override a failed architecture-freeze check

Review result:  
• handoff-ready is pass/fail for any subsystem Milestone 1 will consume as stable  
• a provisional or experimental subsystem may remain documented, but Milestone 1 must not treat it as a frozen dependency  
• failed checks identify the missing artifact, verification failure, or architecture conflict that must be resolved

Evidence:  
• record the final review in evidence/milestone-0/handoff-readiness.json  
• record the reviewed Oracle Registry and Reuse Register paths/status, the reviewed commit, and any missing/stale/contradictory registry condition as an explicit readiness failure  
• for each reviewed subsystem, record the exact ORC-\* ID set and REUSE-\* ID set consumed by its handoff, together with each record’s current review/freeze or reuse-entry status; evidence must make it possible to tell exactly which registry records M0H accepted for M1  
• include the reviewed commit/build, subsystem name, handoff document path, check results, verification commands/results, and references to supporting evidence  
• for the world subsystem, reference evidence/milestone-0/world-package-conformance.json  
• handoff documents should link to durable evidence instead of copying measurement results into the handoff note

Consumption rule for later tasks:  
• an implementation agent working from a handoff-ready subsystem follows its frozen contract and verification commands  
• it must not weaken or replace a test oracle merely to make an implementation pass  
• the diagnostic reference world is an implementation example, not authority to override the public contract  
• if satisfying the task appears to require changing a frozen interface, accepted ADR, conformance requirement, test oracle, or cross-subsystem boundary, the task stops and escalates for review

# 36\. Definition of Done — Testing

A development task is not done merely because implementation exists. Ordinary implementation tasks should use the Task Specification & Definition of Done Template so Required Context, Allowed Scope, Verification, Escalation/Stop Conditions, and task-specific Definition of Done are explicit before coding begins.

Default Definition of Done:  
• code typechecks  
• relevant deterministic tests exist and pass  
• any newly created or materially changed expected test behavior is classified as Class A, B, or C under the Test / Oracle Ownership Policy  
• any Class C oracle required by the task has completed stronger-reasoning review before freeze/acceptance  
• no accepted/frozen Class B conformance expectation or Class C oracle was weakened, reinterpreted, or downgraded in classification merely to make the implementation pass  
• boundary validation/error cases are covered where the task introduces a boundary  
• no unrelated tests regress  
• implementation remained inside the task’s Allowed Scope, except for explicitly authorized and reported deviations  
• packaged verification is performed when the change touches Tauri/WebView/worker/CSP/local module loading  
• test evidence is summarized  
• temporary debug bypasses/mocks are not left in production paths  
• documentation/ADR is updated if the task changes an architectural decision  
• when a task changes a handoff-governed subsystem, its docs/handoff/ package remains accurate against the current canonical Technical Design Specification/docs/handoff/README.md structure for every handoff field affected by the change  
• an implementation task does not weaken, delete, or replace an established test oracle merely to make new code pass unless the task explicitly includes reviewed test/architecture change authority

Additional Definition of Done for world-package/host-world changes:  
• applicable reusable world-package conformance suites pass  
• static world/host architecture-boundary checks pass  
• the required fixture-world tests for the changed behavior pass  
• the diagnostic reference world continues to pass the affected conformance suites when public world-facing behavior changes  
• packaged smoke is rerun when package discovery/loading, local ESM, CSP, package assets, or Tauri/WebView2 behavior is affected  
• no new diagnostic-only/private-host bypass is introduced  
• any proposed new public world capability or boundary change is escalated for explicit contract/architecture review rather than smuggled into an implementation task

A milestone is complete only when its stated acceptance procedures, including hardware/manual checks where applicable, have been executed.

# 37\. Milestone 0 Test Exit Criteria

Milestone 0 should not be considered complete until all of the following are demonstrated:

Core projection/tracking:  
• deterministic projection invariants pass  
• synthetic viewer can drive the diagnostic room correctly  
• packaged Tauri application starts without development server  
• local MediaPipe model/WASM and worker function in packaged WebView2  
• at least two pose-estimation candidates have comparable, validated measurement evidence collected under the same versioned M0D procedure  
• M0D8 selects an accepted production estimator from the validated evidence and records the architecture outcome in ADR-006.01 or a later superseding ADR; a provisional estimator does not satisfy the M1 Architecture Freeze Gate  
• representative RawViewerPose traces are preserved for deterministic M0E replay and calibration/filter work  
• the baseline calibration approach/model is usable, evidence-supported, and accepted for Milestone 1 consumption  
• tracking loss/reacquisition behavior is smooth

World-package conformance and packaged runtime:  
• the diagnostic room is package-shaped and uses only the normal public world-facing contract  
• by M0F, the diagnostic room loads through the production manifest/discovery/local-ESM path rather than a diagnostic-only loader  
• the diagnostic room passes every applicable reusable world-package conformance suite  
• the required baseline fixture-world catalog from Section 15B exists and its deterministic tests pass  
• static world/host architecture-boundary enforcement is automated and passes  
• manifest validation-before-code-load is proven  
• package-local asset isolation/resolution is proven  
• local world package loading is proven in the packaged app  
• representative invalid/incompatible package rejection and host recovery are proven in the packaged app  
• world lifecycle/cleanup conformance passes  
• no diagnostic-only exception or privileged host access is required for the reference world  
• evidence/milestone-0/world-package-conformance.json records the reviewed world conformance results

System acceptance:  
• offline packaged smoke passes  
• 25-cycle resource test does not show an unbounded leak  
• startup/world-switch limits pass  
• diagnostic JSON validates and contains useful AI/agent troubleshooting context  
• manual fixed-window illusion test is successful on the reference hardware

Milestone 1 handoff/freeze:  
• the M1 Architecture Freeze Gate passes for every evidence-gated technical choice Milestone 1 depends on  
• the worker frame-transfer representation/mechanism is accepted from packaged WebView2 compatibility/performance evidence  
• the packaged local ESM loading mechanism is accepted from the packaged world-loading experiment  
• the production filtering implementation and baseline/default parameters are accepted from deterministic/objective/perceptual evidence  
• world package-loading and lifecycle behavior are accepted against stable contracts, reusable conformance suites, static boundary checks, the canonical diagnostic reference world, required fixtures, and packaged evidence  
• any architecture choice left unresolved is explicitly documented as not required by Milestone 1  
• every M0 subsystem required by Milestone 1 has a current docs/handoff/ package conforming to the canonical Technical Design Specification/docs/handoff/README.md structure and passes the Testing Strategy handoff-readiness checks  
• all deterministic verification commands referenced by those handoff packages pass at the final reviewed Milestone 0 commit  
• evidence/milestone-0/handoff-readiness.json records the reviewed commit, per-subsystem handoff-readiness checks, M1 oracle-freeze/Verification Readiness status, Reuse Readiness status, M1 architecture-freeze checks, command results, supporting evidence/ADR references, and any non-applicable checks  
• no unresolved conflict among a stable contract, accepted ADR, conformance requirement, test oracle, reference implementation, or required evidence is being deferred into ordinary Milestone 1 implementation

Architecture-significant evidence-gated choices required by Milestone 1 should be captured in new or superseding ADRs before M1 begins. Accepted implementation/default choices that do not warrant an ADR must still be unambiguous in authoritative code/configuration, tests, evidence, and the relevant handoff package.

# 38\. Resolved Testing Strategy Decisions

D-TEST-01 — Performance acceptance timing: use a 10-second warm-up followed by a 60-second measurement window unless a specific test documents a different need.  
D-TEST-02 — Stationary jitter acceptance: run five complete 5-second trials at the neutral seated pose, plus spot checks at nearer and farther normal seated distances.  
D-TEST-03 — Packaged smoke automation: automate the packaged Tauri smoke suite during Milestone 0 rather than postponing automation until later.  
D-TEST-04 — External motion-to-photon validation: a high-frame-rate phone-camera procedure is optional during Milestone 0 if internal timing measurements and perceptual responsiveness are healthy. Internal measurements must not be labeled true motion-to-photon latency unless an external end-to-end procedure is actually executed.  
D-TEST-05 — Evidence storage: use a repository-level evidence/ directory as the durable source-controlled home for hardware/performance and experiment evidence. Large binary artifacts may be referenced instead of committed when appropriate.  
D-TEST-06 — M0H collection/analysis split: use Luna-Medium for prescribed acceptance execution, objective metric calculation, and evidence capture; use Terra-Medium only to troubleshoot collection or harness failures; perform evidence synthesis, tuning/remediation recommendations, and architecture/ADR decisions as a separate stronger-reasoning review after the evidence bundle is complete.  
D-TEST-07 — M0E calibration/filter evidence workflow: treat M0D output as canonical RawViewerPose in millimeters; default host correction to identity and evaluate only measured per-axis scale \+ offset; adapt a proven One Euro implementation; tune via deterministic trace replay and bounded parameter sweeps; use Luna-Medium for prescribed evidence work, Terra-Medium for live integration, and stronger reasoning only for evidence review or escalation.  
D-TEST-08 — M0D estimator experiment workflow: freeze the two estimator methods, required inputs, calibration inputs, metric formulas, live test matrix, evidence schema, and rerun rules before implementation/evidence collection; use deterministic replay and evidence-bundle validation; use Luna-Medium for M0D7 scripted live collection without tuning, sample removal, ranking, or recommendation; use Terra-Medium only for worker/runtime/harness defects that block collection; and use Sol-High for M0D8 comparative interpretation and the ADR-006.01 or escalation decision after the evidence bundle validates.  
D-TEST-09 — Production handoff readiness verification: M0H verifies each Milestone 0 subsystem that Milestone 1 will consume as stable against the canonical handoff structure owned by the Technical Design Specification and operationalized by docs/handoff/README.md; this decision does not define or restate that structure. Readiness passes only when the handoff conforms to the current canonical structure, all referenced paths and authorities resolve at the reviewed commit, all cited ORC-\* and REUSE-\* records are current and consistent with their authoritative sources and the handoff summary, all required oracle/reuse review or acceptance states are sufficient for Milestone 1 consumption, and every exact verification command required by the handoff passes. M0H records the reviewed commit, exact ORC/REUSE ID sets, pass/fail checks, command results, and supporting references in evidence/milestone-0/handoff-readiness.json. Missing, stale, contradictory, provisional where acceptance is required, or unverifiable handoff/registry/source information fails readiness and escalates rather than being silently reconciled or used to redefine the canonical handoff.  
D-TEST-10 — Milestone 1 architecture freeze verification: M0H must verify that every evidence-gated technical choice required by Milestone 1 has an accepted baseline and is no longer experimental, provisional, contradictory, or undocumented. The minimum freeze set is the production pose estimator, baseline calibration approach/model, worker frame-transfer mechanism, packaged local ESM loading mechanism, production filtering implementation/defaults, and world package-loading/lifecycle behavior. A choice may remain unresolved only when Milestone 1 does not depend on it. Handoff readiness and architecture freeze are separate required checks; failures stop and escalate rather than being resolved inside ordinary M1 implementation. The results are recorded alongside handoff readiness in evidence/milestone-0/handoff-readiness.json.  
D-TEST-11 — Reusable world-package conformance harness: world manifest/discovery, lifecycle, settings, assets, and isolation behavior are verified through reusable conformance suites and a minimal shared testkit rather than duplicated one-off tests. The suites must be invokable against multiple world implementations/packages, and expected fixture failures must be deterministic and distinguishable from harness failures.  
D-TEST-12 — Diagnostic reference world and static boundary enforcement: the diagnostic room is the canonical reference implementation of a normal world package, must pass the same applicable conformance suites as production worlds, and must not receive privileged host access. Static/build-time world/host architecture-boundary checks are mandatory in the relevant local verification path and future CI; by M0F the diagnostic room must run through the production package-loading path.  
D-TEST-13 — Standard task-level verification contract: ordinary implementation tasks use the Task Specification & Definition of Done Template (or an equivalent structure) to declare exact verification commands, task-specific acceptance conditions, Allowed Scope, and Escalation/Stop Conditions. Task-specific Definition of Done may strengthen the Testing Strategy but may not silently weaken established verification, conformance checks, test oracles, packaged checks, or hardware/manual acceptance. A task that encounters a required architecture/test-oracle change outside its authority stops and reports Blocked rather than editing the acceptance mechanism to obtain a pass.  
D-TEST-14 — Test/oracle ownership and review classification: expected test behavior is classified as Class A routine deterministic, Class B integration/conformance, or Class C architecture-critical. Luna-Medium may author Class A and directly specified Class B tests; Terra-Medium is the default for environment-sensitive Class B harnesses. Class C oracle design must receive stronger-reasoning review before freeze, with Sol-High as the default planning assumption unless Logan performs equivalent direct review or another approved plan specifies otherwise. After freeze, Luna/Terra may implement harnesses against the oracle but may not weaken, reinterpret, re-threshold, or downgrade it to obtain a pass. Uncertain classification or an implementation/oracle conflict stops and escalates rather than being silently resolved inside ordinary implementation.  
D-TEST-15 — Reuse terminology and approval-source verification: handoff/readiness checks use “Reuse Mode” as the canonical A/B/C/D term and “Prohibited Reinvention” as the canonical restriction field. Reuse approval must originate from an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision. Handoff notes may cite/summarize the approval but do not create it; a handoff that names itself or another handoff as the approval authority fails readiness until corrected.  
D-TEST-16 — Handoff verification ownership: the Technical Design Specification owns the semantic handoff structure and docs/handoff/README.md operationalizes that structure in the repository. The Testing Strategy does not maintain a duplicate field schema; it owns pass/fail readiness checks against the canonical handoff, including referenced-path existence, ORC/REUSE resolution, oracle review/freeze status, verification execution, approval/provenance consistency, boundary clarity, limitations, escalation conditions, and architecture-freeze evidence. The Milestone Roadmap owns when the review runs.

