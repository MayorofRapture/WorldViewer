# Technical Design Specification

## Draft v0.18

# Document Status

Draft version: 0.18  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Technical Design Specification (TDS)  
Upstream artifacts:  
• Project Vision & Charter, Draft v0.2  
• Product Specification & PRD, Draft v0.2  
• Non-Functional Requirements, Draft v0.2  
• Interface & Contract Specification, Draft v0.6

• Milestone Roadmap, Draft v0.15  
• Testing Strategy, Draft v0.15  
• World Package Conformance Specification, Draft v0.4  
Companion execution artifact:  
• Task Specification & Definition of Done Template, Draft v0.4  
This eighteenth draft establishes a single owner for subsystem handoff structure. The TDS and the repo-local docs/handoff/README.md template own handoff fields/shape; the Testing Strategy owns pass/fail readiness checks against that structure; and the Milestone Roadmap owns when the gate runs and which later milestone may consume the result. This removes the remaining duplicate handoff-schema authority.

# 1\. Architecture Summary

World Viewer will be a Windows-only Tauri 2 desktop application with a TypeScript/React frontend and an imperative Three.js rendering engine.

The host application owns:  
• camera acquisition  
• MediaPipe face tracking  
• pose estimation  
• filtering  
• viewer-state transitions  
• display/calibration profiles  
• off-axis projection  
• the Three.js renderer and head-tracked camera  
• local world discovery/loading  
• host-rendered settings  
• local persistence  
• diagnostics/export  
• world lifecycle

World packages own:  
• world scene content  
• world-specific assets  
• simulation/update behavior  
• world-specific settings schema/UI hints  
• cleanup of world-owned resources

Implementation boundary:  
• src/world-sdk/ exposes the public world-facing contract surface  
• src/world-host/ owns host-private world discovery/loading/lifecycle/assets/settings infrastructure  
• worlds-dev/ contains reference/development worlds as API consumers rather than engine-internal scenes  
• tests/conformance/, scripts/check-world-boundaries.\*, and scripts/check-world-sdk-surface.\* make the host/world capability boundary executable

The core runtime pipeline is:

Integrated webcam  
→ MediaPipe worker  
→ normalized tracking observation  
→ selected pose estimator  
→ ViewerPoseSource / RawViewerPose  
→ CalibrationTransform  
→ OneEuroPoseFilter  
→ viewer-state controller  
→ perspective-strength transform / tracking-loss blending  
→ off-axis projection  
→ engine-owned camera  
→ active world \+ Three.js renderer

Tracking and rendering run at independent cadences. Worlds receive an immutable ViewerState snapshot only through WorldFrame during update().

# 2\. Baseline Technology Stack

The preferred initial stack is:

Desktop shell:  
• Tauri 2  
• Rust only for native shell capabilities that cannot or should not live in the WebView

Application language:  
• TypeScript

Application UI:  
• React  
• Vite

Rendering:  
• Three.js  
• WebGLRenderer / WebGL2

Tracking:  
• @mediapipe/tasks-vision  
• MediaPipe Face Landmarker  
• dedicated module Web Worker

Runtime validation:  
• Zod for TypeScript-owned host configuration/contracts  
• Ajv for JSON Schema Draft 2020-12 validation of world settings

World settings UI:  
• React host UI generated from world JSON Schema  
• a mature JSON-Schema form renderer is preferred over a custom renderer if it satisfies the settings.ui.json adapter contract; React JSON Schema Form is the leading candidate for evaluation

Testing:  
• Vitest for unit/integration tests  
• packaged smoke/E2E tests through the Tauri application  
• deterministic synthetic viewer fixtures

Asset formats:  
• glTF/GLB preferred for 3D assets  
• ordinary local image/audio formats as required by individual worlds

No physics engine, ECS, OpenCV, WebGPU, Redux-style global state framework, or database is included in the initial baseline unless Milestone 0 produces a measured requirement.

# 3\. Process and Thread Model

World Viewer should use three logical execution domains:

1\. Tauri native process  
Responsibilities:  
• desktop window lifecycle  
• filesystem access permitted by explicit commands/scopes  
• package-directory enumeration  
• atomic app-data writes  
• diagnostic export  
• packaged asset access support  
• future native integrations if required

2\. WebView renderer/main UI thread  
Responsibilities:  
• React application shell  
• Three.js renderer  
• render/update loop  
• viewer-state controller  
• projection controller  
• world lifecycle orchestration  
• settings UI  
• diagnostic UI  
• lightweight validation/orchestration

3\. Tracking Web Worker  
Responsibilities:  
• MediaPipe model initialization  
• face-landmarker inference  
• normalized tracking observations  
• inference timing  
• no DOM or Three.js world responsibilities

The worker must not own projection or filtering policy. It provides observations; the host pipeline converts them into canonical viewer state.

The renderer/main UI thread must not perform synchronous face inference or other expensive per-frame computer-vision work.

# 4\. Proposed Repository Layout

The initial repository should favor explicit subsystem ownership and mechanically enforceable boundaries over a large framework or premature monorepo.

Proposed structure:

src/  
  app/  
    App.tsx  
    routes-or-panels/  
    components/  
  engine/  
    core/  
    rendering/  
    projection/  
    viewer/  
    tracking/  
    calibration/  
    diagnostics/  
  world-sdk/  
    index.ts  
    contracts/  
  world-host/  
    discovery/  
    manifest/  
    loader/  
    lifecycle/  
    assets/  
    settings/  
    validation/  
  settings/  
  persistence/  
  native/  
  shared/  
    contracts/  
    validation/  
    errors/  
  workers/  
    tracking.worker.ts  
  testkit/  
    synthetic-viewer/

worlds-dev/  
  diagnostic-room/  
    world.manifest.json  
    settings.schema.json  
    settings.ui.json  
    src/  
      index.ts  
      DiagnosticWorld.ts  
      scene.ts  
    assets/  
    dist/                  generated package output when the package build path is introduced

src-tauri/  
  src/  
  capabilities/  
  tauri.conf.\*

tests/  
  unit/  
  integration/  
  conformance/  
    world-manifest.conformance.ts  
    world-lifecycle.conformance.ts  
    world-settings.conformance.ts  
    world-assets.conformance.ts  
    world-isolation.conformance.ts  
  fixtures/  
    worlds/  
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
  testkit/  
    world-harness.ts  
    fake-world-context.ts  
    fake-world-assets.ts  
    resource-sentinel.ts  
  packaged/

scripts/  
  build-world-package/  
  check-world-boundaries.\*  
  check-world-sdk-surface.\*  
  copy-local-assets/  
  smoke-package/  
  verify-offline/

docs/  
  handoff/  
    README.md  
    projection.md  
    viewer-state.md  
    tracking-pose-estimation.md  
    calibration-filtering.md  
    world-packages.md  
    settings-persistence-diagnostics.md

evidence/  
  milestone-0/  
    world-package-conformance.json  
    handoff-readiness.json

Boundary intent:

• src/world-sdk/ is the source-level public world-facing API boundary. It exposes only contracts/capabilities approved by the Interface & Contract Specification.  
• src/world-host/ contains host-private discovery, validation, loading, lifecycle, asset, settings, and related world infrastructure. Worlds do not import it.  
• src/world-sdk/ is not initially a separately published/versioned npm package and does not require a workspace/monorepo. It is an explicit internal source boundary that may later become a package if demonstrated reuse justifies it.  
• nothing under src/engine/, src/world-host/, src/native/, src/persistence/, src/settings/, or src/shared/ is world-public merely because it is importable inside the host repository; a capability is public to worlds only when intentionally exposed/re-exported through src/world-sdk/.  
• src/world-sdk/index.ts is the initial canonical public export entrypoint. Its TypeScript-visible export surface is guarded automatically so accidental additions/removals or host-private re-exports fail verification before world code can depend on them.  
• worlds-dev/ is top-level so reference/development worlds are visibly consumers of the host API rather than children of the engine implementation.  
• tests/conformance/ contains reusable contract suites; tests/fixtures/worlds/ contains deliberately minimal package fixtures; scripts/check-world-boundaries.\* enforces forbidden world→host dependencies; scripts/check-world-sdk-surface.\* guards the approved public export surface.  
• final file names may vary slightly during scaffolding, but changes must preserve these ownership boundaries rather than collapsing public world API and host-private implementation together.

The diagnostic room is package-shaped from its first M0 implementation. M0B/M0C may import its source statically while the production package loader does not yet exist, but that temporary wiring must supply only the same public WorldContext/WorldFrame contract. M0F builds the same source into the runtime package and loads it through the production package path; a second diagnostic implementation is not created.

If the public world SDK later earns separate versioning/distribution, it may move into packages/world-sdk/ through an explicit design decision. The first implementation should not introduce a monorepo/workspace solely for organizational aesthetics.

# 5\. Application Startup Sequence

Proposed startup order:

1\. Tauri window starts.  
2\. Host loads and validates application state.  
3\. Host loads active display profile and calibration profile.  
4\. Host resolves configured local world-package directory.  
5\. World package discovery validates manifests without executing package code.  
6\. Host resolves the last active world.  
7\. Renderer initializes Three.js and the engine-owned camera.  
8\. Tracking worker begins model initialization and camera pipeline startup.  
9\. The last active valid world is loaded.  
10\. Full-screen world viewing becomes the default view.  
11\. Tracking progresses through initializing/acquiring/tracked state.  
12\. Projection begins from neutral pose and transitions to tracked viewer state when reliable.

Startup must not wait for network access.

If the last active world is unavailable or invalid, startup falls back to the world-selection/error view.

The startup path should be instrumented with timestamps so the 5-second cold-start acceptance requirement can be measured rather than guessed.

# 6\. Rendering Architecture

Three.js rendering is imperative and engine-owned.

The engine creates exactly one primary:  
• WebGLRenderer  
• Scene root owned by the host  
• PerspectiveCamera whose transform/projection is controlled exclusively by the projection subsystem

The active world receives a world-owned Group attached beneath the host scene root. All normal world content is placed beneath that Group.

The render loop should be driven by requestAnimationFrame.

Per frame:  
1\. sample current effective ViewerState  
2\. compute/apply current off-axis camera state  
3\. construct immutable WorldFrame  
4\. invoke activeWorld.update(frame)  
5\. collect timing samples  
6\. renderer.render(scene, camera)

React does not own the render loop and should not trigger Three.js scene simulation through component re-renders.

UI overlays/settings/diagnostics may be React-driven above or beside the render canvas.

# 7\. Canonical Geometry

The TDS adopts the Interface Specification coordinate convention:

• right-handed coordinates  
• origin at the physical center of the visible display  
• \+X to the viewer’s right  
• \+Y upward  
• \+Z outward from the screen toward the viewer  
• screen plane at Z \= 0  
• viewer in front of screen at Z \> 0  
• normal virtual content behind screen at Z \< 0  
• all physical spatial coordinates in millimeters

The viewer reference point is the midpoint between the two eyes (“cyclopean eye”).

All tracker/camera coordinates must be transformed into this canonical frame before filtering/viewer-state/projection code receives them.

World authors may choose their own semantic local origin inside their world root, but the world root itself is positioned in the same millimeter-scale host scene.

Imported meter-based assets, especially glTF assets, must be scaled explicitly at the world/asset boundary. For example, a one-meter glTF object is scaled to 1000 World Viewer millimeters if physical scale is intended.

# 8\. Screen Geometry

ScreenGeometry is derived from the active DisplayProfile.

For physical width W and height H in millimeters:

lowerLeft  \= (-W/2, \-H/2, 0\)  
lowerRight \= ( W/2, \-H/2, 0\)  
upperLeft  \= (-W/2,  H/2, 0\)  
upperRight \= ( W/2,  H/2, 0\)

Reference ThinkPad E590 profile:  
• width: approximately 345.4 mm  
• height: approximately 194.3 mm

The projection system must not derive physical screen size from pixel resolution.

Pixel resolution and device pixel ratio affect renderer/viewport behavior only; physical millimeter dimensions define head-coupled geometry.

# 9\. Tracking Worker Architecture

The tracking worker owns MediaPipe Face Landmarker.

Renderer/main-thread responsibilities:  
• camera permission request and user-facing error state if required by browser APIs  
• creation/transfer of frames using the least-copy mechanism supported by the actual WebView environment  
• worker lifecycle  
• consumption of normalized observations

Worker responsibilities:  
• load locally packaged MediaPipe model/WASM assets  
• initialize Face Landmarker  
• process the latest available frame  
• drop obsolete queued frames rather than building unbounded backlog  
• return only normalized observation data and timing metadata

Proposed worker messages:

Host → worker:  
• init  
• frame  
• configure  
• shutdown

Worker → host:  
• ready  
• observation  
• status  
• metrics  
• error

Each message should include a protocol version and correlation/timestamp fields where useful.

The exact transferable frame mechanism (for example VideoFrame, ImageBitmap, or another WebView-supported representation) is a Milestone 0 compatibility experiment and must be benchmarked in the packaged Tauri app.

# 10\. Tracking Backpressure Policy

Low latency is more important than processing every camera frame.

The worker must use latest-frame semantics:  
• at most one frame may be actively processed  
• while inference is busy, newer frames may replace an older waiting frame  
• an unbounded FIFO frame queue is prohibited  
• old tracking results that arrive after a newer accepted result are discarded

This prevents latency from growing under CPU load.

Tracking cadence may be 15–30 Hz while rendering remains near display refresh rate. Viewer state is smoothed/interpolated between tracking updates.

# 11\. ViewerPoseSource Composition

ViewerPoseSource is the primary pose-source abstraction and defines the M0D→M0E RawViewerPose handoff.

Production composition:  
MediaPipeLiveTrackingSource  
→ ViewerPoseEstimator  
→ LiveViewerPoseSource / RawViewerPose  \[M0D handoff boundary\]  
→ CalibrationTransform  
→ OneEuroPoseFilter  
→ ViewerStateController

M0D owns tracking and estimator-specific calibration through production of finite canonical RawViewerPose samples in screen-relative millimeters plus reusable recorded traces. M0E must not reinterpret MediaPipe landmarks or redesign estimator math while implementing host calibration/filtering.

Test/development alternatives:  
• SyntheticViewerPoseSource  
• RecordedViewerPoseSource

ViewerStateController receives only filtered/calibrated pose state plus tracking health and does not know whether the upstream RawViewerPose came from MediaPipe, recorded fixtures, or synthetic scripts.

This is a critical test seam. Projection, lost-tracking behavior, world reactions, and most render-loop development must be possible without webcam access.

The live source should expose structured health/timing information separately from pose samples so failure states are explicit.

# 12\. Pose Estimation Strategy

Milestone 0 must not prematurely lock one monocular pose-estimation technique.

The design supports two bounded baseline estimator implementations behind ViewerPoseEstimator. Their methods are frozen before implementation/evidence collection in the Pose Estimator Experiment Specification so coding agents adapt a defined method rather than inventing computer-vision logic.

Candidate A — MediaPipe facial-transform-based estimator  
Purpose:  
• use MediaPipe-provided facial geometry/transformation information where it proves sufficiently stable and physically meaningful  
• adapt into canonical screen-relative millimeters through estimator-intrinsic calibration  
• implement from the reference/formula frozen by the experiment specification

Candidate B — calibrated facial-scale / interocular estimator  
Purpose:  
• independently estimate physical viewer position from stable facial landmarks plus a simple calibration reference  
• provide a comparison path that does not depend on the same transformation interpretation as Candidate A  
• implement from the reference/formula and calibration inputs frozen by the experiment specification

Both estimators must:  
• consume the same normalized TrackingObservation contract  
• emit finite canonical RawViewerPose values or null according to the ViewerPoseEstimator contract  
• remain independent from M0E host-level CalibrationTransform and PoseFilter behavior  
• preserve estimator identity/configuration in experiment evidence  
• be replayable against the same deterministic recorded traces

Estimator experiment architecture:  
M0D separates four concerns that must not be collapsed into one open-ended task:  
1\. estimator implementation  
2\. deterministic replay/metric calculation  
3\. scripted live evidence collection  
4\. comparative interpretation and architecture decision

Before M0D4–M0D7 begin, the Pose Estimator Experiment Specification freezes:  
• estimator A and B methods  
• required TrackingObservation fields  
• estimator-intrinsic calibration inputs  
• RawViewerPose output semantics  
• fixed metric formulas  
• live hardware test matrix and timing  
• evidence schema/file layout  
• procedural invalidation/rerun rules  
• M0D7 restrictions  
• M0D8 review inputs

Required comparison measurements:  
• stationary raw X/Y/Z RMS deviation  
• depth repeatability at multiple seated distances  
• lateral/vertical repeatability  
• cross-axis error where defined  
• discontinuity/outlier counts  
• update cadence  
• estimator processing time  
• unusable/null sample percentage  
• behavior during partial face visibility and normal head rotation  
• estimator-specific calibration burden

Evidence collection:  
M0D7 executes the frozen test matrix and produces the evidence bundle. It may calculate only predefined metrics and completeness checks. It must not tune estimator equations/calibration rules, remove unfavorable samples, alter test conditions, rank candidates, or recommend a production estimator. Procedurally invalid runs are recorded explicitly and rerun only under the predefined rerun rules.

Evidence interpretation:  
M0D8 begins only after the evidence bundle validates. It compares the candidates against the predefined criteria, separates measurement/harness defects from estimator limitations, and decides whether estimator A, estimator B, or neither is suitable. If evidence supports a production choice, M0D8 supplies the basis for ADR-006.01.

OpenCV/solvePnP is not part of the baseline. It becomes an evidence-driven escalation path only if neither simpler estimator can meet the product requirements or the experiment is otherwise unable to support a viable baseline decision.

# 13\. Calibration Design

Calibration must remain deliberately simple and is split into two concerns: estimator-intrinsic calibration needed by M0D to produce canonical physical-ish RawViewerPose values, and M0E host-level correction applied after estimation. M0E receives the estimator output as a defined contract rather than reopening computer-vision design.

Initial calibration responsibilities:  
• confirm physical screen width/height  
• identify/reference the fixed integrated webcam  
• determine any required camera-to-screen offset  
• capture the user’s neutral viewer pose  
• capture only the additional physical reference required by the selected estimator  
• apply host-level pose correction only when measurement demonstrates systematic scale/offset error

The UI should show a live camera preview during calibration.

The initial design should avoid a full checkerboard/intrinsic-camera-calibration flow.

Calibration storage includes:  
• display profile ID  
• camera identity where available  
• neutral cyclopean-eye position in mm  
• camera offset in screen coordinates  
• selected estimator ID/version  
• estimator-specific parameters  
• host-level per-axis pose correction scale/offset, defaulting to identity

Because webcam field of view is not known reliably from the laptop specification, FOV must not be hard-coded. If an estimator requires effective camera intrinsics, those parameters must come from runtime capability data, estimator-intrinsic calibration, or an estimator-specific derivation with documented assumptions.

For M0E, the host-level calibration model is intentionally capped at independent per-axis scale \+ offset unless evidence demonstrates that this cannot meet the acceptance requirements. Checkerboard calibration, lens-distortion correction, nonlinear fitting, or a more general camera model is not added as a precaution. Any escalation beyond the simple model requires recorded evidence and architecture review.

# 14\. Pose Filtering

The default filtering approach should use a proven One Euro filter implementation or a small project implementation directly based on the published algorithm when licensing/provenance is clearer than adding a dependency.

Filtering is applied independently to X, Y, and Z position.

Filter output:  
• filtered position in mm  
• estimated velocity in mm/s  
• confidence  
• timestamp

Filter design constraints:  
• filtering must not convert tracking loss into stale tracked state  
• filter reset must occur on meaningful source/calibration changes  
• reacquisition may initialize from the current effective pose to avoid a snap  
• filter parameters must be treated as engineering configuration, not automatically exposed as user-facing settings

Milestone 0 shall use a replayable trace harness rather than relying on ad hoc live tuning. Recorded RawViewerPose traces flow through CalibrationTransform and PoseFilter deterministically.

Filter tuning procedure:  
• collect representative stationary and motion traces  
• evaluate a bounded, documented parameter grid  
• calculate objective metrics automatically, including per-axis RMS jitter, response lag, invalid/non-finite samples, and overshoot/discontinuity where applicable  
• shortlist candidates that provide a reasonable jitter/lag tradeoff  
• compare only the shortlist perceptually in the diagnostic world  
• preserve raw traces, sweep configuration, and machine-readable results under evidence/

The implementation task is adaptation/integration of the proven One Euro algorithm; parameter selection is a separate evidence task. The model executing the sweep must not silently change thresholds or invent a different filter.

# 15\. Viewer State Machine

ViewerStateController owns tracking-state transitions and the effective eye position used by projection.

# 

Public tracking statuses remain:  
• unavailable  
• initializing  
• acquiring  
• tracked  
• degraded  
• lost

# 

Reacquisition is an internal controller phase, not a new public TrackingStatus.

# 

Timing dependency:  
ViewerStateController receives an injected MonotonicClock:  
  nowMs(): number

# 

The production clock is backed by performance.now() or the equivalent monotonic host time source. Tests use a ManualClock. Viewer-state logic must not depend on Date.now(), arbitrary sleeps, or setTimeout/setInterval for correctness.

# 

Usable-pose rule:  
A pose containing NaN, Infinity, or otherwise invalid/non-finite coordinates is unusable and is never applied to effectivePositionMm. An unusable pose is handled as missing pose input for loss-state purposes.

# 

Tracked:  
effectivePositionMm follows the current filtered/calibrated tracked pose.

# 

Degraded / loss-pending:  
The first degraded or missing usable sample records lossPendingSinceMs. During the 350 ms grace period:  
• if usable marginal samples remain available, they may continue to update effectivePositionMm  
• if no usable sample is available, hold the last effectivePositionMm  
• if fully valid tracking recovers before 350 ms expires, cancel the pending loss without entering neutral return

# 

Confirmed lost:  
At 350 ms of continuous loss/degradation without valid recovery:  
• public status becomes lost  
• snapshot the current effectivePositionMm as neutralReturnStartPositionMm  
• snapshot the transition start time  
• begin the 5-second neutral return

# 

Neutral-return interpolation:  
Let p \= clamp((nowMs \- transitionStartMs) / 5000, 0, 1).  
Use smoothstep easing:  
  w \= p × p × (3 \- 2 × p)

# 

Then:  
  effectivePositionMm \=  
    lerp(neutralReturnStartPositionMm, neutralPositionMm, w)

# 

At p \= 1, effectivePositionMm equals neutralPositionMm exactly.

# 

Reacquisition:  
When a valid tracked pose becomes available after confirmed loss or during neutral return:  
• snapshot the current effectivePositionMm as reacquisitionStartPositionMm  
• snapshot the reacquisition start time  
• start a 300 ms internal reacquisition phase  
• each update blends from the fixed reacquisitionStartPositionMm toward the latest valid filtered/calibrated tracked pose using the same smoothstep function over 300 ms  
• after 300 ms, effectivePositionMm follows the tracked pose normally

# 

If tracking degrades or disappears during reacquisition, the same 350 ms loss-confirmation rule begins from the current effective pose. If valid tracking recovers before that grace expires, start a fresh 300 ms reacquisition blend from the current effective pose. No transition may snap effectivePositionMm.

# 

Reset semantics:  
Reset clears loss/reacquisition timestamps and blend snapshots, restores effectivePositionMm to neutralPositionMm, and leaves the next public tracking status to be determined from the current source-health input.

# 

The 350 ms and 300 ms values remain Milestone 0 tuning defaults; the 5-second neutral return is fixed by the product requirement. All three durations and the easing function must be centralized and covered by deterministic tests rather than being chosen by an implementation agent.

# 16\. Perspective Strength Semantics

Perspective strength modifies viewer displacement relative to neutral without changing the stored physical calibration.

Proposed formula:

effectiveArtisticEye \=  
  neutralEye \+  
  perspectiveStrength × (effectiveTrackedEye \- neutralEye)

Semantics:  
• 1.0 \= physically calibrated baseline  
• 0.0 \= neutral/no head-coupled displacement  
• values between 0 and 1 attenuate the effect  
• values above 1 exaggerate the effect

The initial allowed UI range is deferred to the UX/UI specification, but the projection subsystem consumes a validated finite value.

Perspective strength is stored globally per display profile.

# 17\. Off-Axis Projection Implementation

For the initial fixed planar display, the projection can use the axis-aligned specialization of generalized off-axis perspective while preserving the generalized screen-corner model in tests/contracts.

Let:  
• eye \= (ex, ey, ez), ez \> 0  
• W \= screen width in mm  
• H \= screen height in mm  
• n \= near clipping distance  
• f \= far clipping distance

Near-plane bounds:

left   \= n × (-W/2 \- ex) / ez  
right  \= n × ( W/2 \- ex) / ez  
bottom \= n × (-H/2 \- ey) / ez  
top    \= n × ( H/2 \- ey) / ez

The engine camera is located at the effective cyclopean-eye position and aligned with the fixed screen coordinate basis. The projection matrix is built from left/right/top/bottom/near/far.

Required numerical invariants:  
• rays through physical screen corners map to the corresponding clip-space corners  
• a centered viewer produces a symmetric frustum  
• moving viewer left/right changes visible scene content in the physically correct direction  
• moving viewer closer widens angular coverage through the fixed aperture  
• sign conventions remain correct for virtual geometry behind Z \= 0

The implementation should be cross-checked against a licensed generalized-perspective reference rather than treated as novel mathematics.

The first version does not need arbitrary tilted/rotated screens or cameras.

# 18\. Near/Far Plane Policy

Near/far distances are engine-level projection settings expressed in millimeters.

The near plane must remain between the viewer and screen in the camera projection model and must never become zero/negative.

Because the physical screen plane is an aperture rather than a conventional scene object, clipping distances should be selected for numerical stability and the expected depth range of worlds rather than tied directly to the physical panel thickness.

Initial fixed defaults should be chosen during the diagnostic-room implementation and validated against depth precision. They should not become user-facing settings unless real worlds demonstrate a need.

# 19\. Render Loop and Timing

requestAnimationFrame drives the engine frame loop.

Each frame:  
1\. obtain the latest stable ViewerState  
2\. apply perspective-strength transform  
3\. compute off-axis projection  
4\. apply camera matrices  
5\. construct WorldFrame  
6\. call world.update()  
7\. render  
8\. record timings

deltaSeconds is clamped after long pauses/backgrounding so worlds do not receive a huge simulation step.

The world update loop runs at render cadence by default. Individual worlds may internally use fixed-timestep simulation accumulators if required, but the engine does not impose a global physics timestep.

Tracking timestamps and render timestamps use the same monotonic time basis where possible.

# 20\. World Package Discovery

The configured local package directory is enumerated through the native host boundary and interpreted by host-private code under src/world-host/discovery and src/world-host/manifest.

Rules:  
• each immediate child directory is one candidate  
• discovery is non-recursive  
• valid world.manifest.json is required  
• manifest validation occurs before executable world code is loaded  
• IDs use reverse-domain format  
• duplicate IDs are rejected deterministically  
• engineApi compatibility is checked before module load  
• entry/settings paths are normalized and must remain inside the validated package root  
• invalid packages appear in diagnostics but do not prevent valid packages from loading  
• discovery requires no network access

Discovery result should separate:  
• valid compatible worlds  
• invalid manifest/package worlds  
• incompatible API-version worlds

The validator/discovery path must be testable against the minimal fixture packages without executing world code. Manifest fixtures should cover valid-minimal, invalid-manifest, duplicate-id, incompatible-api, and package-boundary traversal cases.

The diagnostic room may contain its future manifest from M0B onward, but it is not treated as a runtime package candidate until the production discovery/loading path exists. By M0F the same package-shaped implementation is discovered and loaded normally.

This design keeps the world selector and diagnostic export informative without executing broken packages and gives lower-cost implementation agents a deterministic validation oracle.

# 21\. World Package Build Format

Worlds are distributed to the configured local package directory as prebuilt browser-compatible packages. World Viewer does not compile TypeScript or bundle source code at runtime.

Runtime package layout:

\<package\>/  
  world.manifest.json  
  dist/  
    world.js  
  assets/  
    ...  
  settings.schema.json   optional  
  settings.ui.json       optional

world.js is a browser-compatible single-entry ESM bundle exporting the world factory/object required by the public world contract.

A world may be developed in its own repository/toolchain as long as its produced package satisfies the runtime package contract and World Package Conformance Specification.

Reference-world development layout:

worlds-dev/  
  diagnostic-room/  
    world.manifest.json  
    settings.schema.json  
    settings.ui.json  
    src/  
      index.ts  
      DiagnosticWorld.ts  
      scene.ts  
    assets/  
    dist/                generated

The diagnostic room deliberately uses the future package shape before dynamic loading exists.

M0B/M0C:  
• source under worlds-dev/diagnostic-room/src is imported statically by a narrow development/bootstrap adapter  
• the world implements the normal VirtualWorld contract  
• it receives the normal WorldContext and WorldFrame surface only  
• package manifest/settings/assets are authored in their eventual package locations  
• the development tree is not claimed to be a fully runtime-conformant package until the generated dist/world.js and production loader exist; early M0 validates the source/API shape, not packaged-runtime conformance  
• settings schema/UI files may exist before the host settings UI is implemented; their presence does not pull M0G settings behavior into M0B/M0C  
• no diagnostic-only camera/projection/native capability is introduced

M0F:  
• the normal world build step bundles that same source into dist/world.js  
• the manifest-declared entry is validated  
• the package is copied/used through the configured local package directory  
• the production loader dynamically imports the resulting ESM entry  
• the temporary static bootstrap is no longer the normal packaged runtime path

The transition changes only how the same world implementation is obtained. It must not require rewriting the diagnostic room into a second package-specific implementation.

Milestone 0 uses the diagnostic room as the canonical reference package and build fixture.

# 22\. Dynamic World Module Loading

Dynamic execution of local world code inside a packaged Tauri/WebView2 application is one of the highest-risk integration points and must be proven before real content work.

Transitional M0B/M0C path:  
1\. application imports the package-shaped diagnostic-room source statically  
2\. a narrow diagnostic bootstrap constructs it through the normal VirtualWorld shape  
3\. host creates the same normal WorldContext/world root used by the future WorldManager  
4\. synthetic ViewerState is delivered only through WorldFrame  
5\. no host-private capability is exposed merely because the module is statically imported

This transitional path exists only to prove projection/renderer/viewer-state behavior before the package loader exists. It is not a fallback world architecture and should be removed/disabled from the normal packaged runtime once M0F succeeds.

Production M0F direction, subject to the packaged Tauri loading spike:  
1\. native host validates package root and manifest  
2\. manifest/API/path validation completes before executable world code is requested  
3\. native host/asset resolver exposes the validated entry bundle through a Tauri-approved local asset URL or equivalent scoped mechanism  
4\. renderer dynamically imports the ESM entry  
5\. host validates the exported world factory shape  
6\. host creates a fresh WorldContext and world root  
7\. initialize() runs  
8\. only successful activation is persisted/marked active

Constraints:  
• entry path may not escape package root  
• remote HTTP(S) module imports are not permitted  
• world code is trusted local owner-supplied code but receives only the public world-facing surface  
• static source imports into host-private modules are forbidden even when dynamic loading is not involved  
• package loading must work in the packaged app, not only Vite dev mode  
• the diagnostic room must use this production path by M0F  
• invalid/incompatible fixture packages must be rejected without executing code when pre-load validation should catch them

Fallback designs such as reading JavaScript text and executing via Blob/data URLs should not be adopted unless the preferred local-module approach is proven incompatible and the CSP/security implications are explicitly reviewed.

A Milestone 0 spike must settle the exact loader mechanism before Milestone 1 treats world loading as frozen.

# 23\. World Dependency Strategy

The first world-package system should prioritize isolation, understandable dependencies, and reliable loading over sophisticated deduplication.

Approved initial rules:  
• world packages import the designated public world-facing surface from src/world-sdk/ (or its eventual stable exported module name)  
• each world bundle may be self-contained for world-specific runtime dependencies unless the public host contract explicitly supplies a capability  
• world packages must not import src/world-host/, engine-private modules, tracking/pose/filter/calibration/projection internals, NativeHost, application persistence, host UI/state internals, or another world package’s private files  
• communication with the host occurs only through the documented world API  
• normal world operation must not depend on remote runtime services/assets  
• direct Tauri/native or media-device acquisition from world code is forbidden by the public/private capability boundary

Static/build-time enforcement:  
• scripts/check-world-boundaries.\* (or an equivalently simple maintainable mechanism) scans/enforces forbidden imports/direct bypasses  
• scripts/check-world-sdk-surface.\* (or an equivalent maintainable static test) checks the canonical src/world-sdk public entrypoint against the approved TypeScript-visible export set and rejects unintended additions, removals, or host-private re-exports  
• the surface guard records names/origins only; it must not duplicate public type definitions or create a parallel contract source of truth  
• both checks run in local verification and future CI  
• failures identify the forbidden dependency/export and the approved public boundary  
• suppressions/exceptions require explicit review rather than routine bypass

Three.js duplication across separately bundled worlds is acceptable for the first feasibility implementation if necessary to keep loading simple. Only one world is active at a time.

If duplicate Three.js/runtime copies materially affect package size, memory, or compatibility, a later SDK/shared-runtime mechanism may be introduced through an explicit engine API decision.

Do not add import maps, runtime package managers, a custom dependency resolver, or a separately published SDK package before measurements/use justify them.

# 24\. World Lifecycle Manager

Host-private WorldManager implementation lives under src/world-host/lifecycle/ and owns exactly one active world.

Load flow:  
• validate manifest/package boundary  
• validate API compatibility  
• load/validate/reset settings as required  
• load module  
• validate exported world shape  
• create a fresh world root  
• create WorldContext from the public world-facing capability surface  
• initialize world exactly once  
• begin updates only after successful initialization  
• only after successful initialization, mark/persist the world active

Switch flow:  
• stop updates to old world  
• dispose old world  
• continue host-owned cleanup even if dispose reports failure  
• remove old world root  
• release host-tracked references  
• create/load the new world through the normal activation flow  
• persist new last-active-world ID only after successful activation

Failure flow:  
• manifest/API/path failures reject before executable code when applicable  
• initialize failure never enters update and is never persisted as successful activation  
• update failure stops normal updates for that world and enters the defined safe/error recovery path  
• dispose failure is reported but does not prevent host-owned root removal/best-effort cleanup  
• partial new-world resources are cleaned  
• global display/calibration/package-directory/other-world settings remain intact  
• host returns to a safe selector/error state or preserves the old world only if the switch implementation can do so without violating lifecycle ownership

Conformance design:  
• lifecycle logic is driven through a reusable adapter/harness so valid-minimal, init-failure, update-failure, dispose-failure, resource-sentinel, the diagnostic room, and later production worlds exercise the same lifecycle rules  
• diagnostic-room-specific lifecycle branches are prohibited  
• controlled callbacks/events should be used in deterministic lifecycle tests instead of arbitrary sleeps

World switch must reach an interactive state within 5 seconds on the reference machine under normal local conditions.

# 25\. World Resource Ownership

The world contract requires explicit dispose(), and the host provides defense-in-depth cleanup without taking ownership of arbitrary world resources.

Each world owns, where applicable:  
• Three.js objects/resources it creates under its scene root  
• geometry/materials/textures/render targets  
• timers/listeners/subscriptions created by world code  
• world-created workers  
• world-specific audio  
• world-specific loaded assets/caches not explicitly owned by a shared host service

Rules:  
• dispose() is the world’s primary cleanup boundary  
• host removes the world root after disposal or failed disposal  
• host root traversal/removal does not replace explicit disposal required by Three.js/browser/runtime semantics  
• each activation starts with a fresh root and must not depend on stale resources from a prior activation  
• host may use narrow defensive helpers for common scene resources, but public cleanup/cache helpers are added only after demonstrated cross-world need  
• failure in world cleanup must not prevent host-owned references/root from being released best-effort

Testing support:  
• tests/fixtures/worlds/resource-sentinel/ allocates representative resources/listeners/timers so cleanup behavior is observable  
• tests/testkit/resource-sentinel.ts tracks host-observable sentinels where practical  
• the diagnostic reference world implements representative cleanup and passes the same lifecycle/resource conformance checks as later worlds  
• resource counts are sampled before/after repeated switches for the 25-cycle memory/resource acceptance test

The reusable conformance test is a contract check, not a substitute for the longer 25-cycle acceptance measurement.

# 26\. World Settings Architecture

Each world may provide:

settings.schema.json  
• JSON Schema Draft 2020-12  
• authoritative data validation/default definition

settings.ui.json  
• host-specific UI hints keyed by JSON Pointer  
• widget/group/order/label/unit/description metadata

The host:  
1\. loads schema/UI hints  
2\. validates schema/hints  
3\. loads saved settings only for the same package ID \+ package version  
4\. validates saved settings  
5\. otherwise derives defaults from the current schema  
6\. renders the settings form  
7\. validates every submitted change  
8\. persists values outside the world package  
9\. delivers immutable settings to the world

When package version changes, saved world settings are reset to current defaults by design.

World code never writes settings files directly. WorldSettingsStore and other persistence repositories remain host-private; worlds receive only validated immutable settings through WorldContext/onSettingsChanged.

The reusable world-settings conformance suite verifies schema authority, UI-hint fallback, same-version persistence, package-version reset, read-only delivery, and the prohibition on world-supplied private settings UI.

# 27\. Settings Form Rendering

Approved reuse-first approach:  
• Ajv validates JSON Schema Draft 2020-12  
• evaluate React JSON Schema Form before considering a custom settings renderer  
• adapt settings.ui.json into the renderer’s presentation configuration

If the mature renderer proves too heavy or incompatible with the deliberately small supported schema subset, implement only a narrow host renderer for:  
• boolean  
• string  
• number  
• integer  
• enum  
• modestly nested object groups

Avoid implementing arrays, oneOf/anyOf conditional UX, arbitrary custom widgets, or schema-driven business logic until a real world requires them.

The TDS deliberately prefers standards-compatible validation even if the first UI supports only a subset.

# 28\. Persistence Architecture

The initial product does not need a database.

Approved initial persistence:  
• small versioned JSON documents in the Tauri application-data/config area  
• writes performed through a narrow native host command  
• atomic temp-file \+ replace/rename semantics  
• runtime validation on read  
• explicit schemaVersion

Logical persisted domains:  
• app state  
• display profiles  
• calibration profiles  
• per-world-version settings

Suggested logical separation:

app-state.json  
display-profiles.json  
calibration-profiles.json  
world-settings/  
  \<safe-key-derived-from-world-id\>/  
    \<package-version\>.json

The final physical file names may change in the Data Model/Persistence Spec.

A SQLite database should be introduced only if later history/indexing/concurrency requirements make JSON files materially worse.

# 29\. Native Host Boundary

Tauri commands/capabilities should remain narrow and purpose-specific.

Expected native operations:  
• choose package directory  
• enumerate immediate child directories  
• read validated package text metadata  
• resolve validated package asset/module paths  
• read/write application data  
• atomic configuration writes  
• export diagnostic JSON through a save dialog  
• return basic OS/app version metadata needed for diagnostics

Renderer code should not receive a generic unrestricted “read any file” or “write any file” API.

World code receives no direct Tauri/native capability object.

The exact Rust/Tauri command names and capability configuration are implementation details, but command inputs/outputs should use serializable typed DTOs validated on both sides where practical.

# 30\. Offline Asset Strategy

All runtime assets required by the host are packaged locally:  
• MediaPipe model  
• MediaPipe WASM/runtime assets  
• application JS/CSS  
• required fonts/icons  
• diagnostic-room package  
• schemas required by the host

# 

No CDN URLs are permitted in production configuration.

# 

World packages resolve assets relative to their validated package root.

# 

Offline verification is staged:  
• M0A/M0C packaged smoke verifies only the local assets required by those stages  
• M0G owns the full production-output/configuration scan for remote-runtime references and the packaged smoke sequence executed with network access unavailable or blocked  
• M0G must verify the complete local runtime asset set, including application assets, MediaPipe model/WASM assets, world-package assets, and settings/diagnostic schemas required at that point

# 31\. Content Security Policy and WebView Constraints

The application should maintain a restrictive production CSP.

Required policy goals:  
• no arbitrary remote script execution  
• no remote world modules  
• local MediaPipe WASM/workers permitted  
• local world asset/module mechanism explicitly permitted  
• no eval unless a proven dependency forces it and the security tradeoff is documented

Because Tauri/WebView2 behavior can differ from Vite/browser dev mode, all of the following must be tested in packaged builds early:  
• webcam permission  
• MediaPipe WASM loading  
• module worker loading  
• worker transfer path  
• local world dynamic import  
• local assets/textures  
• full-screen behavior

Milestone 0 must not postpone packaged testing until the end.

# 32\. Application State Management

Do not introduce Redux or another global state framework initially.

Use:  
• React component state/context for UI-only application state  
• explicit engine service objects/classes for tracking/viewer/projection/world/render subsystems  
• immutable snapshots passed across subsystem boundaries  
• repositories/services for persistence

Engine state should not live in React state if it changes at render-frame cadence.

A small app-level coordinator can publish coarse UI state such as:  
• active world ID  
• tracking status  
• diagnostics open/closed  
• settings open/closed  
• camera initialization state

This avoids coupling the 60 Hz engine loop to React rendering.

# 33\. Error Handling

Errors crossing subsystem boundaries use the structured WorldViewerError contract.

Implementation pattern:  
• low-level exception retained as cause/log detail where useful  
• stable error code added at subsystem boundary  
• user-safe message presented by UI  
• structured details captured for diagnostic export  
• recoverable flag drives UI/state recovery

Expected recovery examples:  
• camera denied → settings/diagnostic state with retry  
• tracking worker fails → neutral pose \+ diagnostic error  
• invalid world manifest → skip package  
• world initialize fails → cleanup \+ safe selector/error state  
• corrupted settings → reject \+ defaults/recovery path  
• invalid projection input → retain safe neutral camera and surface fatal engine diagnostic rather than applying NaN matrices

# 34\. Logging and Diagnostics

Logging should be structured and local.

Design:  
• central logger interface  
• subsystem field  
• level  
• timestamp  
• error/event code where applicable  
• structured details  
• console sink in development  
• bounded in-memory recent-log ring for diagnostics  
• optional local rolling file sink if useful during Milestone 0

The standard diagnostic export is one UTF-8 JSON file containing a bounded recent log window, not full historical logs.

Approved bounded window for first implementation:  
• latest 200 structured log entries OR 256 KiB of serialized log content, whichever limit is reached first  
• per-frame render/tracking samples must not be logged as ordinary entries; they belong in summarized performance metrics  
• the cap may be tuned after typical diagnostic exports are measured

Raw webcam imagery is never included by default.

# 35\. Diagnostic JSON Builder

Diagnostic export should be created from a single DiagnosticSnapshotBuilder that queries subsystem snapshots without mutating runtime state.

Included sections:  
• schemaVersion  
• generatedAt  
• application version/build  
• Windows/system metadata  
• active world manifest/version  
• package-directory summary  
• display profile  
• calibration summary  
• camera capabilities/settings  
• tracking health  
• latest viewer state  
• filter/estimator identifiers  
• render/tracking/latency metrics  
• memory metrics where available  
• recent structured errors  
• bounded recent logs

The JSON schema should be versioned and unit-tested.

Export happens only through explicit user action and writes locally through the native host save/export command.

# 36\. Performance Instrumentation

Instrumentation must be cheap enough to remain enabled in diagnostic mode.

Collect rolling samples for:  
• render frame duration  
• world update duration  
• tracking inference duration  
• tracking update interval/rate  
• pose-filter processing duration  
• worker message/transfer timing where measurable  
• startup phases  
• world-load phases  
• memory snapshots where available

Percentiles should be calculated over bounded rolling windows rather than storing unlimited raw samples.

Motion-to-photon measurement cannot be inferred perfectly from ordinary software timestamps alone. Milestone 0 should distinguish:  
• internal pipeline latency metrics that can be measured in software  
• external end-to-end motion-to-photon measurements requiring a repeatable physical test method

Do not falsely label internal inference/render latency as true motion-to-photon latency.

# 37\. Test Architecture

Tests mirror subsystem boundaries and distinguish deterministic conformance from packaged-runtime proof. Expected test behavior follows the Testing Strategy Test / Oracle Ownership Policy: Class A routine deterministic tests may normally be authored by Luna from stable requirements; Class B integration/conformance expectations remain contract-derived and use Luna or Terra according to environment risk; Class C architecture-critical oracles require stronger-reasoning review before freeze. Implementation tasks consume the accepted oracle rather than redefining it.

Unit tests:  
• coordinate conversions  
• screen geometry  
• projection matrix invariants  
• perspective-strength transform  
• ViewerStateController transition timing against ManualClock  
• 349 ms loss-pending versus 350 ms confirmed-loss boundary  
• 5-second smoothstep neutral return, including intermediate and final positions  
• 300 ms reacquisition blend, including interruption/restart cases  
• invalid/non-finite pose rejection  
• filter behavior with deterministic traces  
• manifest/schema validation  
• settings reset on package version change  
• diagnostic JSON schema

Integration tests:  
• tracking observation → estimator → ViewerPoseSource/RawViewerPose  
• RawViewerPose → CalibrationTransform → PoseFilter → ViewerState → projection  
• persistence recovery  
• diagnostic snapshot assembly

Reusable world-package conformance:  
tests/conformance/ provides shared suites rather than diagnostic-world-specific copies:  
• world-manifest.conformance.ts  
• world-lifecycle.conformance.ts  
• world-settings.conformance.ts  
• world-assets.conformance.ts  
• world-isolation.conformance.ts

Conformance harness/testkit:  
• minimal fake WorldContext/asset service  
• controlled lifecycle callbacks/events  
• reusable world factory/adapter  
• resource sentinel helpers  
• test output references WPC requirement IDs where practical  
• diagnostic room and later production worlds use the same applicable suites  
• reference code does not override a higher-authority contract when a mismatch is found

Fixture-world catalog:  
tests/fixtures/worlds/ contains minimal packages for:  
• valid-minimal  
• invalid-manifest  
• duplicate-id  
• incompatible-api  
• path-traversal-entry  
• path-traversal-settings  
• init-failure  
• update-failure  
• dispose-failure  
• invalid-settings  
• asset-escape  
• resource-sentinel

Each failure fixture should isolate one intended condition and use stable recognizable failure text/codes where practical.

Static architecture-boundary verification:  
• verifies world source imports only the public world-facing surface plus permitted package-local/bundled dependencies  
• rejects imports/direct bypasses into world-host, engine-private tracking/pose/filter/calibration/projection, NativeHost/Tauri, application persistence/UI/state, media-device acquisition, another world’s private files, or required remote runtime services  
• runs as part of local verification and future CI  
• uses the simplest maintainable enforcement mechanism that reliably catches the boundary

Packaged tests remain separate because headless tests cannot prove Tauri/WebView2 behavior.

M0A packaged launch smoke:  
• production executable starts without Vite/localhost  
• application reaches the minimal ready condition  
• structured smoke result is emitted  
• process terminates predictably with success/failure status

M0C packaged synthetic smoke:  
• extends the M0A harness rather than introducing desktop GUI automation  
• initializes Three.js and the package-shaped diagnostic room through the temporary static bootstrap  
• uses SyntheticViewerPoseSource only  
• executes a fixed scripted pose sequence  
• verifies ViewerStateController/renderer readiness assertions  
• emits structured pass/fail output and terminates predictably  
• verifies only assets required by M0C

M0F packaged world conformance adds:  
• production package discovery/manifest validation  
• packaged local ESM import mechanism  
• diagnostic room loaded through the production package path  
• package-local asset resolver  
• representative invalid/incompatible fixture rejection/recovery  
• world switch/update/dispose path

Later packaged tests add:  
• camera permission/init  
• local MediaPipe assets  
• worker startup  
• full offline runtime with network blocked  
• full-screen startup  
• local diagnostic export

Manual/perceptual acceptance:  
• fixed-window illusion  
• stationary visual stability  
• tracking-loss behavior  
• reacquisition  
• responsiveness

Handoff-readiness verification:  
• The Testing Strategy owns the canonical pass/fail procedure for subsystem handoff-readiness, Verification Readiness, Reuse Readiness, and the M1 Architecture Freeze review. M0H applies that procedure to the handoff structure and architectural requirements defined by this TDS.  
• For the world-package subsystem, M0H evaluates the requirements already defined by this TDS, the Interface & Contract Specification, and the World Package Conformance Specification through the Testing Strategy procedure; this TDS does not maintain a second readiness checklist.  
• Readiness evidence requirements, command-result rules, conflict handling, and pass/fail semantics are defined by the Testing Strategy. Architectural requirements and canonical handoff fields remain owned by their governing TDS/interface/conformance sections.

# 38\. Projection Test Oracles

Projection tests are a high-value area for stronger reasoning/model review.

Minimum deterministic cases:  
• centered eye at known Z  
• eye shifted \+X  
• eye shifted \-X  
• eye shifted \+Y  
• eye shifted \-Y  
• eye moved closer  
• eye moved farther  
• asymmetric X+Y position  
• perspectiveStrength \= 0  
• perspectiveStrength \= 1  
• invalid ez ≤ 0 rejected

Tests should project each physical display corner and verify it lands on the expected normalized-device-coordinate boundary.

A separate visual diagnostic scene should contain:  
• grid floor/walls  
• cubes at known depths  
• vertical pillars near screen edges  
• depth markers  
• objects partially outside the aperture

This scene is designed to expose sign, scale, and parallax errors quickly.

# 39\. Milestone 0 Diagnostic World

The first world is a diagnostic room, not the fishtank.

It serves two purposes:  
1\. make projection/tracking defects visually obvious  
2\. act as the canonical reference implementation of a normal world package

Source location:  
worlds-dev/diagnostic-room/

Required package-shaped source structure from M0B (without claiming packaged-runtime conformance before M0F):  
• world.manifest.json  
• settings.schema.json  
• settings.ui.json  
• src/index.ts  
• src/DiagnosticWorld.ts  
• src/scene.ts  
• assets/  
• generated dist/world.js once the package build path exists

Required visual content:  
• physically scaled room/grid  
• distinct near/mid/far objects  
• strong straight lines  
• edge-adjacent objects  
• known object coordinates visible in diagnostics  
• optional viewer-reactive marker demonstrating read-only ViewerState use

Required public-contract exercise:  
• initialize/update/dispose  
• frame-scoped read-only ViewerState  
• resize() if supported by the host baseline  
• representative boolean, numeric, and enum/select settings  
• at least one package-local asset resolved through WorldAssetService by M0F  
• WorldLogger usage  
• representative world-owned resource cleanup

M0B/M0C loading:  
The package-shaped source may be imported statically through a narrow development/bootstrap adapter because the production loader does not yet exist. The adapter must construct the world through the normal public world contract and may not expose camera, MediaPipe, projection camera/controller, NativeHost, application persistence, or other private capability.

M0F transition:  
The same source implementation is bundled to dist/world.js, discovered from its manifest, validated, dynamically loaded, initialized, updated, and disposed through the production world-host path. The temporary static bootstrap is no longer the normal packaged path.

The world must pass all applicable reusable world-package conformance suites and static boundary checks. There must not be a second privileged diagnostic implementation.

The world remains deliberately simple so renderer/world complexity cannot mask tracking/projection problems.

# 40\. Build and Packaging

Build outputs:  
• packaged Windows Tauri application  
• locally packaged MediaPipe model/runtime assets  
• host frontend assets  
• reference diagnostic world runtime package generated from worlds-dev/diagnostic-room

Development build should use Vite for fast iteration.

Production host build must:  
• use production CSP  
• bundle/localize all core runtime assets  
• not rely on localhost  
• expose application version to diagnostics  
• eventually validate the complete required world/model/runtime asset set in M0G

World-package build:  
• scripts/build-world-package/ (or equivalent deterministic script) compiles/bundles world source to the runtime package layout  
• the diagnostic room build consumes worlds-dev/diagnostic-room/src and emits dist/world.js without creating a second implementation  
• manifest/settings/assets remain package-local and are copied/validated deterministically  
• the package build must fail on invalid manifest paths or boundary violations rather than silently producing a broadened package  
• world source is checked by scripts/check-world-boundaries.\* before/with package build  
• the canonical src/world-sdk export surface is checked by scripts/check-world-sdk-surface.\* before/with package build  
• produced packages are copied/installed into the configured local world directory for development/acceptance testing

Packaged smoke architecture:  
The generic packaged-launch harness is established in M0A and reused by later milestones. The harness is application-native, not desktop-GUI automation.

Harness activation:  
• environment variable WORLD\_VIEWER\_SMOKE\_MODE selects a bounded smoke mode  
• supported initial values are launch and synthetic  
• the thin Tauri native shell reads this value at startup and exposes the selected mode read-only to the frontend through a narrow startup-mode boundary  
• normal application startup is unchanged when the variable is absent

M0A launch mode:  
• start the packaged executable  
• initialize the minimum application shell required to declare readiness  
• emit a structured result  
• exit predictably

M0C synthetic mode:  
• initialize the Three.js renderer  
• use SyntheticViewerPoseSource  
• statically load the package-shaped diagnostic-room source through the temporary bootstrap  
• execute a fixed pose script  
• assert renderer/viewer-state readiness  
• emit a structured result  
• exit predictably  
• do not initialize webcam, MediaPipe, calibration, dynamic world loading, or the full offline verifier

M0F packaged world-loading mode/checks:  
• build the same diagnostic-room source into dist/world.js  
• install/copy the resulting package into the configured local world directory  
• discover and validate its manifest  
• dynamically load it using the production local-ESM mechanism  
• resolve at least one package-local asset  
• execute initialize/update/dispose through WorldManager  
• reject representative invalid/incompatible fixtures safely  
• emit structured pass/fail evidence suitable for evidence/milestone-0/world-package-conformance.json

Smoke result transport:  
The thin native boundary provides a smoke-completion command available only when a smoke mode is active. It accepts a validated result object, writes one machine-readable JSON result line to stdout, and terminates the process with zero for success or non-zero for failure.

Minimum result fields:  
• schemaVersion  
• mode  
• status  
• checks  
• durationMs  
• errors

The invoking script must enforce a timeout so a hung application fails rather than waiting indefinitely.

Automated scripts should make reference package creation, world-boundary checking, fixture validation, and packaged smoke execution deterministic.

# 41\. Dependency and Reuse Policy

World Viewer is reuse-first by default. When a mature component, standards-based primitive, or vetted reference implementation has already been approved for a capability, ordinary implementation agents must use that approved path rather than creating a bespoke replacement. The goal is not to maximize dependency count; it is to avoid spending project-specific code and model reasoning on solved infrastructure.  
Reuse decisions are part of implementation readiness. A bounded implementation task is not Ready when it still requires the implementation agent to decide whether to adopt, adapt, compose, or rebuild a capability.

## 41.1 Reuse Modes

Every implementation task that materially introduces or changes a capability must identify one of four Reuse Modes:  
Canonical terminology: use “Reuse Mode” for A/B/C/D throughout project artifacts. Use “Prohibited Reinvention” for the per-entry/task restriction that identifies mature behavior ordinary implementation must not replace, bypass, duplicate, or rebuild. Explanatory prose may still describe prohibited substitution/reimplementation behavior, but those phrases are not field names.  
A — Adopt directly  
Use a mature dependency/component substantially as provided, with only configuration and a narrow project adapter where needed.  
B — Adapt approved reference  
Use a vetted algorithm, official sample, academic/standards reference, or licensed implementation as the basis for a small project-owned adapter/port. Preserve provenance and do not expand adaptation beyond the approved custom-code boundary.  
C — Compose approved primitives  
Assemble mature lower-level APIs/components into a small project-specific integration layer when no single dependency cleanly solves the requirement.  
D — Project-specific custom implementation  
Write the capability ourselves only when no suitable mature solution exists, licensing/provenance is unusable, packaged/offline integration cost exceeds the benefit, or the behavior is genuinely specific to World Viewer. Mode D is an exception and requires explicit authorization; an ordinary implementation agent may not choose it merely because custom code appears straightforward.

## 41.2 Mandatory Reuse Gate

Before implementation begins, the task author or governing handoff/architecture source must resolve the Reuse Gate for every material dependency/reference choice involved in the task.  
The gate passes only when all applicable items are explicit:  
• requirement/capability being satisfied  
• approved Reuse Mode A/B/C/D  
• approved dependency, primitive, algorithm, official sample, or reference implementation, or an explicit approved statement that none is applicable  
• approval source: Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision; a subsystem handoff may reference the approved source but is never itself the approval authority  
• compatible license and provenance for copied/adapted source; reference-only material must be clearly distinguished from code we are licensed to copy  
• version/source constraint where reproducibility matters, including package version, upstream commit/tag, model/WASM version, paper/specification revision, or asset hash as appropriate  
• offline-runtime compatibility  
• packaged Tauri/WebView2 compatibility evidence or a named verification step when that environment is relevant  
• permitted custom-code boundary: the exact wrapper, adapter, glue, transformation, or project-specific behavior we are allowed to write  
• Prohibited Reinvention: the mature behavior the task must not replace with bespoke code  
• verification path proving that the adopted/adapted/composed solution satisfies the project contract  
If any required gate item is unresolved, the dependent implementation task is Proposed/Blocked rather than Ready. A separate bounded evaluation/spike may be authorized to resolve the missing evidence.

## 41.3 Reuse Authority and Agent Rules

Reuse authority follows the project source-of-truth hierarchy. Accepted ADRs and authoritative architecture/contracts outrank handoff notes and task specifications. Handoff notes and tasks record/consume approved choices; they do not silently supersede them.  
Ordinary implementation agents:  
• must use the approved dependency/reference/primitive when the task names one  
• must stay inside the permitted custom-code boundary  
• may add thin adapters, error mapping, type-safe wrappers, configuration, and project-specific orchestration only when those are inside the stated boundary  
• may not replace an approved mature component with a hand-written substitute  
• may not add a second competing library/implementation for the same canonical capability without explicit authorization  
• may not copy source from an unlicensed, incompatible, or provenance-unclear repository  
• may not silently vendor/fork a dependency when normal consumption was approved  
• may not change Reuse Mode A/B/C/D during implementation  
• must stop when the approved component/reference cannot satisfy a frozen requirement within the permitted custom-code boundary  
A blocked reuse choice is not permission to improvise. The agent reports the smallest evidence showing why the approved path is insufficient and requests review.

## 41.4 Evaluation Standard for New Reuse Choices

When no approved choice exists and a dedicated evaluation task is authorized, compare candidates using the smallest evidence needed for the actual requirement:  
• does it solve the current requirement without forcing unrelated architecture?  
• maturity/stability and maintenance quality  
• license compatibility and provenance clarity  
• TypeScript/API quality and documentation  
• ability to run fully offline  
• packaged Tauri/WebView2/WASM/worker compatibility where relevant  
• runtime size, startup/performance cost, and resource behavior  
• testability and deterministic verification  
• integration complexity and long-term maintenance burden  
• availability of official examples, conformance tests, or known-good reference implementations  
• whether the candidate narrows or increases the amount of project-specific code an AI agent must reason about  
Do not select a component merely because it is popular, nor reject a mature small custom/reference-based implementation merely to avoid all project-owned code. The deciding question is which option leaves the smallest reliable, maintainable, testable World Viewer-specific surface.

## 41.5 Approved Mature Reuse Baseline

The following mature capabilities are baseline reuse choices unless a later accepted decision supersedes them:  
• Tauri 2 for the desktop shell/native capability boundary  
• React \+ Vite for host application/settings UI and build tooling  
• Three.js/WebGLRenderer and Three.js loaders/utilities for rendering and supported asset loading  
• MediaPipe Tasks Vision / Face Landmarker for face tracking  
• Ajv for JSON Schema Draft 2020-12 validation  
• Vitest for unit/integration/conformance testing  
• JSON Schema Draft 2020-12 as the world-settings data contract format  
• glTF/GLB and the Three.js glTF ecosystem for 3D assets where appropriate  
• the published/proven One Euro filtering algorithm, using an approved implementation or adaptation selected through M0E rather than inventing new filtering mathematics  
These baseline choices do not imply that every feature exposed by the dependency should be wrapped or abstracted. Write only the thin project-specific code needed by World Viewer.

## 41.6 Reuse Choices Still Requiring Evaluation

The following remain evaluation-gated rather than pre-approved for direct adoption:  
• React JSON Schema Form for schema-driven settings UI  
• a structured logging library  
• a small semver compatibility library/utility  
While evaluation is pending, dependent implementation tasks must not fill the gap with a bespoke replacement unless an explicit reviewed exception authorizes that Mode D decision. In particular, do not hand-write general JSON Schema validation, semver parsing, rendering infrastructure, face tracking, or novel motion-filter mathematics merely to avoid selecting the mature reuse path.

## 41.7 Custom Implementation Exception

Mode D custom implementation is appropriate for genuinely project-specific behavior such as ViewerStateController semantics, screen/display geometry adapters, host-owned projection integration, world lifecycle policy, package isolation rules, diagnostics composition, and other thin glue that cannot be purchased from a mature library without importing unnecessary architecture.  
A custom implementation exception must record:  
• the requirement  
• why A/B/C does not provide a better fit  
• the expected project-owned code boundary  
• verification/oracle used to prove correctness  
• whether the choice is architecture-significant  
If architecture-significant, obtain explicit architecture review and an ADR when required before dependent implementation proceeds. If implementation-local and already inside an approved architecture, the bounded task/handoff may record the choice without creating an unnecessary ADR.

## 41.8 Reuse Gate and AI Task Authoring

The Task Specification & Definition of Done Template operationalizes this policy. Tasks must identify the approved reuse/dependency plan, approval source, Reuse Mode, version/source constraint where needed, permitted custom-code boundary, and Prohibited Reinvention.  
A strong Luna/Terra task should say, in effect: “Use this approved mature component/reference through this exact boundary and make these tests pass,” not “decide whether to use a library or build something.”  
The completion report must confirm that the approved reuse path was followed and that no mature component/reference was replaced or bypassed without explicit authority.

# 42\. AI-Assisted Development Design

The architecture is intentionally partitioned for agent execution. M0D is specifically decomposed so implementation and evidence-collection work can be handled by lower-cost models while stronger reasoning is reserved for experiment design and final interpretation.

## Oracle-first delegation pattern

World Viewer uses an oracle-first delegation pattern so lower-cost implementation models can work against explicit definitions of correctness instead of being asked to invent both the solution and the acceptance criteria.  
The Testing Strategy owns the Class A/B/C test-oracle classification and review policy. This TDS defines how that policy is applied to architecture and task execution.  
Standard sequence:  
1\. Requirement / ADR — Identify the authoritative requirement, interface/contract rule, accepted ADR, experiment specification, or other approved source that defines the intended behavior.  
2\. Oracle design — Define the executable or procedural evidence that will distinguish correct from incorrect behavior. The task must identify the oracle source and classify the changed expectation as Class A, B, or C under the Testing Strategy.  
3\. Stronger review where warranted — Class A routine deterministic tests and directly specified Class B integration/conformance tests do not require stronger-model review merely because they are tests. Class C architecture-critical oracles must receive stronger-reasoning review before freeze; Sol-High is the default planning assumption unless Logan performs equivalent direct review or another approved planning artifact specifies otherwise.  
4\. Oracle freeze — Record the accepted expectation, relevant fixtures/inputs, formulas or thresholds, tolerances, invalid-run conditions, and review outcome. Once frozen, ordinary implementation tasks have no authority to weaken, reinterpret, re-threshold, or replace the oracle.  
5\. Luna/Terra implementation — Assign implementation and routine harness work to the lowest-cost model appropriate to integration risk. Luna-Medium is preferred for bounded deterministic implementation; Terra-Medium is preferred when Tauri/WebView2, worker/native, packaging, live hardware, or other cross-boundary integration materially raises execution risk.  
6\. Verification — Run the exact deterministic, conformance, packaged, hardware, or evidence procedures named by the task. Implementation success is measured against the accepted oracle; code compilation alone is insufficient when an executable oracle exists.  
7\. Escalation — If implementation and oracle conflict, or satisfying the task appears to require changing the frozen requirement, accepted ADR, oracle classification, expected result, threshold/tolerance/formula, or subsystem boundary, ordinary implementation stops. The agent reports the smallest reproduction/evidence and requests the appropriate review rather than editing acceptance criteria to obtain a pass.  
Oracle-first does not mean every test is designed by a stronger model. Stronger reasoning is reserved for the small set of Class C expectations where an incorrect definition of correctness could select/reject architecture, drive an ADR, validate high-risk mathematics, or materially alter milestone/product acceptance. Routine Class A tests and contract-derived Class B conformance tests should remain Luna/Terra work when their governing requirements are explicit.  
Task-authoring requirements:  
• the Task Specification & Definition of Done Template must identify the implementation model/reasoning level, test/oracle source, Class A/B/C classification when applicable, review/freeze status, and oracle change authority  
• any task with a material dependency/reference choice must also pass the Section 41 Reuse Gate and identify the approved reuse/dependency plan, approval source, Reuse Mode, version/source constraint where needed, permitted custom-code boundary, and Prohibited Reinvention  
• when a required reuse choice remains evaluation-gated, the dependent implementation task is not Ready; use a separate bounded evaluation/spike or explicit reviewed Mode D exception rather than letting the implementation agent choose opportunistically  
• implementation-only tasks should normally set oracle change authority to none  
• when a Class C oracle is not yet reviewed/frozen, the implementation task is not Ready unless its explicit purpose is oracle/harness development under the required review path  
• a reference implementation may help construct or cross-check an oracle, but architecture-critical correctness must not depend blindly on copying the same implementation being tested  
• when practical, high-risk mathematical oracles should use an independent derivation/reference/invariant in addition to implementation-level tests  
• completion reports must state whether any accepted oracle changed; unauthorized oracle changes invalidate completion

## Production handoff architecture

The production handoff layer is a repo-local navigation and verification boundary between experimental Milestone 0 work and ordinary Milestone 1 implementation. Its purpose is to reduce architecture ambiguity for later agents without creating a second specification system.

Repository ownership:  
• docs/handoff/ contains one concise handoff note per stable subsystem or tightly coupled subsystem group  
• evidence/ contains measurements, experiment outputs, acceptance results, and the final readiness record  
• source interfaces/contracts, implementation code, automated tests/fixtures, ADRs, and evidence remain authoritative for their respective concerns  
• the World Package Conformance Specification is the compact normative implementation context for ordinary world-package tasks; it does not replace the higher-authority Interface & Contract Specification  
• handoff notes summarize status and point to those sources; they must not copy large normative contracts or measurement results into parallel prose

## Registry placement and ownership

World Viewer uses two lightweight repo-local registries as execution/navigation aids. They reduce context and agent ambiguity without creating parallel specifications.  
Placement:  
• docs/testing/oracle-registry.md — verification/governance navigation for reusable accepted correctness oracles  
• docs/reuse-register.md — cross-cutting architecture/dependency navigation for approved reuse paths and custom-code boundaries  
• docs/handoff/\<subsystem\>.md — subsystem consumption view that cites the relevant Oracle IDs and REUSE IDs  
• evidence/ — execution/readiness results proving that the referenced oracles/reuse paths were actually verified; evidence does not own the underlying decision  
Authority and ownership:  
• the Oracle Registry is owned by the project’s test/oracle governance defined in the Testing Strategy; the governing requirement/contract/ADR/experiment specification plus the authoritative test/procedure remain the actual source of correctness  
• the Reuse & Dependency Register is owned by the TDS/ADR/reuse-governance layer; accepted ADRs, authoritative TDS/interface/conformance decisions, accepted experiment results, and repository dependency manifests/lockfiles remain authoritative for the actual architecture/component/version being used  
• the registries may summarize status and point to authoritative sources, but must not restate long formulas, procedures, contract text, license terms, upstream documentation, or evidence interpretations in parallel prose  
• subsystem handoff notes consume registry IDs; they do not create new oracle/reuse authority  
Change rules:  
• path/name/reference corrections and other non-semantic metadata updates may be made in the same bounded implementation change when the authoritative source is unchanged and verification still passes  
• an Oracle Registry semantic change includes changing expected behavior, classification, threshold, tolerance, formula, interpretation, review/freeze status, or change authority; such changes require the review authority recorded by the oracle and must update the governing source/test first  
• a Reuse Register semantic change includes changing Reuse Mode A/B/C/D, approved component/reference, approval source, permitted custom-code boundary, Prohibited Reinvention, or another field that materially expands implementation authority; such changes must pass the Reuse Gate and architecture review when architecture-significant  
• dependency version/source metadata may be updated without an ADR when the architecture and public/cross-subsystem boundaries remain unchanged, but the required compatibility/verification must be rerun  
• no registry update may be used to bypass a frozen ADR, contract, oracle, handoff boundary, or approved dependency decision  
Drift/conflict handling:  
• if a registry entry conflicts with an authoritative source, the registry is stale; the authoritative source wins and dependent implementation is Blocked until the registry/handoff references are reconciled  
• agents must not guess which source is “probably current,” change status to make a task Ready, or create a new replacement implementation merely to resolve registry drift  
Lifecycle:  
• M0A creates both registry files from the approved design templates  
• M0B–M0G populate/update entries as subsystems and evidence-gated choices become real  
• M0H consumes Oracle/Reuse registry status through the Verification Readiness and Reuse Readiness procedures defined by the Testing Strategy  
• M1A revalidates all M1-required Oracle IDs/REUSE IDs against the actual starting commit before downstream M1 slices consume them  
• later changes update the authoritative source first, then the affected registry entry and handoff references in the same reviewed change  
Planning-document transition:  
• until the repository exists, the Google Drive Oracle Registry Design and Reuse & Dependency Register Design are planning sources  
• after M0A creates the repo files, the repo registries become the active execution/navigation artifacts; the Drive design docs remain planning/history references and must not be treated as a second live registry  
ADR threshold:  
• creating/updating a registry entry does not itself require an ADR  
• create or supersede an ADR only when the underlying choice materially changes runtime architecture, public/cross-subsystem boundaries, persistence/packaging/security behavior, or another accepted architectural decision  
• ordinary library selections/version changes remain governed by the Reuse Register, tests, dependency manifests/lockfiles, and handoff notes unless they cross that architecture threshold  
Canonical handoff-structure ownership:  
• this TDS defines the canonical semantic structure and required field set for subsystem handoff notes  
• M0A instantiates that structure in docs/handoff/README.md; once the repository exists, that repo-local template is the operational source for note shape/field ordering while remaining subordinate to this TDS for semantics  
• the Testing Strategy MUST NOT maintain a second handoff field schema; it defines pass/fail readiness checks against the current canonical TDS/repo template  
• the Milestone Roadmap owns when the handoff/readiness review occurs and which later milestone may consume a passing subsystem; it MUST NOT define a competing handoff schema or readiness-test definition  
• Oracle Registry and Reuse Register records remain separate navigation/status artifacts referenced by handoff notes; their fields are not copied wholesale into the handoff template beyond the IDs and summaries required below  
• when the canonical handoff structure changes intentionally, update this TDS first, then docs/handoff/README.md and any affected handoff notes in the same reviewed change; Testing Strategy checks should be updated only when the pass/fail verification logic changes  
Standard handoff note contents:  
• subsystem status and supported scope  
• stable public contract/interface paths  
• Oracle IDs: explicit ORC-\* entries from docs/testing/oracle-registry.md consumed by this subsystem, or “none” when no reusable registered oracle applies  
• authoritative tests/oracles: for each listed Oracle ID, the exact test suite, requirement ID, experiment specification, fixture/trace/golden case, or named procedure that defines accepted correctness for the subsystem  
• M1 oracle freeze status: identify which authoritative oracles are frozen/accepted for ordinary M1 consumption, their Class A/B/C classification when applicable, and any oracle that remains provisional or intentionally outside M1 scope  
• known-good reference implementation path, when one exists  
• REUSE IDs: explicit REUSE-\* entries from docs/reuse-register.md consumed by this subsystem, or “none” when no material registered reuse/dependency decision applies  
• approved dependency/reference implementation: for each listed REUSE ID, the mature library, algorithm, official sample, standards reference, or canonical project implementation M1 is expected to consume, plus the authoritative approval source  
• Reuse Mode: A adopt directly | B adapt approved reference | C compose approved primitives | explicitly authorized D project-specific custom implementation  
• version/source/provenance constraint where relevant to reproducibility or licensed adaptation  
• remaining project-specific custom-code boundary: the exact wrapper, adapter, glue, transformation, orchestration, or subsystem-specific behavior M1 may still implement without reopening architecture  
• Prohibited Reinvention: mature behavior M1 must not replace or bypass with bespoke code  
• deterministic test and reusable fixture paths  
• governing ADR references  
• relevant evidence references  
• known limitations and explicitly unsupported behavior  
• exact verification commands  
• escalation conditions  
Lifecycle:  
• M0A creates docs/handoff/README.md as the standard template/instructions, including required fields for Oracle IDs, authoritative tests/oracles, M1 oracle freeze status, REUSE IDs, approved dependency/reference implementation, Reuse Mode, and remaining project-specific custom-code boundary  
• M0B through M0G create or update the handoff notes for capabilities they make stable  
• M0H performs the cross-subsystem handoff-readiness review defined by the Testing Strategy  
• Milestone 1 may treat a subsystem as frozen only after that subsystem passes readiness review  
• later tasks that intentionally change a handoff-governed contract, authoritative test/oracle or M1 freeze status, approved dependency/reference implementation, Reuse Mode, permitted custom-code boundary, reference implementation, verification set, limitation, or escalation rule must update the handoff note in the same change

Escalation boundary:  
An ordinary implementation agent must stop and request the appropriate review when completing a task appears to require changing a frozen public interface, contradicting an accepted ADR, weakening/replacing/reclassifying a frozen oracle, substituting an approved dependency/reference implementation, expanding beyond the recorded project-specific custom-code boundary, changing the recorded Reuse Mode, or introducing a new cross-subsystem dependency. It must not resolve those conflicts silently.

The first version should not introduce a separate machine-readable handoff manifest or schema merely for completeness. Stable paths, repository scripts, tests, and the concise Markdown notes are sufficient until actual drift/automation needs justify more structure.

## Milestone 1 architecture freeze gate

Before Milestone 1 may consume an M0 capability as a stable dependency, every evidence-gated technical choice required by that capability must be resolved to an accepted baseline. “Resolved” does not require a dedicated ADR for every tuning value; it requires that the accepted choice be unambiguous in the appropriate authoritative artifacts and reflected by the subsystem handoff package.

Minimum M1-required freeze set:  
• production pose estimator — selected from M0D evidence; ADR-006.01 or a later superseding ADR records the architecture decision when a production estimator is accepted  
• baseline calibration approach/model — accepted from M0E evidence; any non-identity host correction beyond the approved simple measured model requires explicit architecture review  
• worker frame-transfer representation/mechanism — selected from packaged WebView2 compatibility/performance evidence and recorded in the tracking handoff; create/supersede an ADR if the choice is architecture-significant  
• packaged local ESM loading mechanism — proven by the M0F packaged spike and recorded in the world-package handoff; finalize by ADR when architecture-significant  
• production filtering implementation and baseline/default parameters — accepted from M0E deterministic replay, objective metrics, and perceptual evidence; implementation/defaults must be fixed in authoritative code/configuration and the handoff even when no separate ADR is warranted  
• world package-loading and lifecycle behavior — accepted through the World Package Conformance Specification, reusable conformance suites, minimal fixture catalog, static world/host boundary checks, canonical diagnostic reference world, packaged M0F evidence, and the world-package handoff

Freeze-gate rules:  
• a required choice that remains experimental, provisional, contradictory, or undocumented blocks Milestone 1 from treating that dependency as stable  
• a choice may remain unresolved only when Milestone 1 does not depend on it, and that non-dependency is documented  
• the handoff-readiness review and architecture-freeze review are complementary: handoff readiness proves that the implementation boundary is consumable; the freeze gate proves that M1 is not being asked to make unresolved architecture decisions  
• ordinary Milestone 1 implementation has no authority to choose, revise, or silently reconcile frozen architecture  
• if new evidence or a requirement conflict indicates that a frozen choice must change, implementation stops and explicit architecture review occurs first; architecture-significant changes use a new or superseding ADR before implementation resumes

## World-package compact context rule

For ordinary world-package implementation that does not change architecture, do not load the entire project document set by default. Supply:  
• a bounded task specification conforming to the Task Specification & Definition of Done Template  
• World Package Conformance Specification  
• relevant src/world-sdk contract files  
• relevant reusable conformance tests and fixture worlds  
• diagnostic reference-world files when an example is useful  
• exact verification commands  
• the world-package handoff note only when consuming the frozen M0 subsystem  
Every ordinary task must also declare Allowed Scope, Prohibited/Out-of-Scope Changes, exact Verification, and Escalation/Stop Conditions. If the bounded context exposes a real contract conflict or missing capability, stop and escalate rather than broadening context, modifying test oracles, or improvising architecture.

Luna-suitable tasks:  
• Zod/Ajv schemas  
• manifest validation  
• DTOs/contracts  
• screen-geometry utilities  
• persistence repositories  
• diagnostic JSON builder  
• log ring buffer  
• settings UI adapter  
• Class A routine deterministic tests/fixtures derived directly from frozen requirements  
• Class B reusable integration/conformance suite cases against already-frozen contract requirements  
• reusable world-package conformance suite cases against already-frozen WPC requirements  
• minimal fixture-world implementation/maintenance  
• static world-boundary rule implementation against already-frozen public/private contracts  
• diagnostic reference-world content/settings/assets after its public contract is fixed  
• M0C ViewerStateController implementation against the frozen clock/transition/easing contract  
• M0C packaged synthetic smoke extension against the established M0A harness  
• diagnostic-room geometry after contracts are fixed  
• calibration profile/schema/persistence work once contracts are frozen  
• calibration UI/camera-preview work against explicit UX contracts  
• One Euro adaptation from a vetted reference implementation  
• recorded-trace replay harness and bounded parameter-sweep execution  
• calibration/filter evidence collection and objective metric generation  
• M0D2 worker protocol/backpressure implementation against frozen protocol semantics  
• M0D3 TrackingObservation normalization/validation  
• M0D6 deterministic trace replay, fixed metrics, evidence schema, and evidence-bundle validation  
• M0D7 scripted live evidence collection under a frozen test matrix, including prescribed metric calculation, anomaly preservation, and completeness validation

M0D7 Luna boundary:  
The M0D7 agent is a test operator/evidence producer, not an experiment designer or reviewer. It must not:  
• alter estimator equations or calibration rules  
• change test duration, physical positions, metric formulas, or acceptance criteria  
• remove unfavorable samples or hidden outliers  
• rerun a trial merely because the result looks poor  
• tune either estimator  
• rank or recommend an estimator  
• decide whether solvePnP/OpenCV is required

M0D7 may rerun a trial only for predefined procedural invalidation such as wrong configuration, failed capture, application crash, or incomplete/corrupt evidence. Unexpected collection failures that require runtime/harness troubleshooting are escalated rather than broadly debugged by the collection agent.

Terra-suitable tasks:  
• Tauri package-directory integration  
• MediaPipe worker integration  
• packaged asset loading  
• M0C escalation only when the established packaged smoke harness exposes unexpected Tauri/WebView2 behavior  
• M0D1 MediaPipe worker boot/local WASM-model loading  
• M0D4 estimator A implementation from the frozen reference/formula  
• M0D5 estimator B implementation from the frozen reference/formula  
• M0D7 escalation for worker, packaged-runtime, environment, or harness defects that block prescribed evidence collection  
• dynamic world module loader  
• world lifecycle integration  
• packaged diagnostic-world transition from temporary static bootstrap to the production local-ESM path  
• package-local asset resolver integration in Tauri/WebView2  
• settings-form library integration  
• performance instrumentation  
• live RawViewerPose → CalibrationTransform → PoseFilter → ViewerStateController integration  
• troubleshooting cross-boundary calibration/filter integration when deterministic Luna-level tasks pass individually

Stronger reasoning model tasks:  
• Class C architecture-critical oracle design/review before freeze when the oracle can select/reject architecture, drive an ADR, validate high-risk mathematics, or materially change milestone/product acceptance  
• coordinate conventions  
• projection math/oracles when reference/oracle evidence conflicts  
• Pose Estimator Experiment Specification design before M0D4–M0D7  
• M0D8 comparative evidence interpretation and production-estimator decision  
• distinguishing measurement/harness limitations from implementation defects and estimator limitations  
• deciding whether ADR-006.01 is justified  
• deciding whether solvePnP/OpenCV or another estimator escalation is justified  
• calibration-model escalation only if the simple affine correction fails measured requirements  
• final interpretation of calibration/filter evidence when objective metrics and perceptual results conflict  
• latency interpretation  
• difficult cross-boundary failures unresolved by Terra

M0C planning target:  
• M0C1 ViewerStateController — Luna-Medium  
• M0C2 packaged synthetic smoke mode — Luna-Medium  
• Terra-Medium only for unexpected Tauri/WebView2 or packaged-harness escalation

M0D planning target:  
• M0D1 — Terra-Medium  
• M0D2 — Luna-Medium  
• M0D3 — Luna-Medium  
• M0D4 — Terra-Medium  
• M0D5 — Terra-Medium  
• M0D6 — Luna-Medium  
• M0D7 — Luna-Medium, with Terra-Medium only as a collection-blocking integration/harness escalation  
• M0D8 — Sol-High

This split is intentional: stronger reasoning defines the experiment once and interprets the final validated evidence once; implementation and procedural evidence work are then constrained enough for Luna/Terra.

M0E planning target:  
Luna-Medium for most bounded implementation/evidence tasks, Terra-Medium for the live integration seam, and stronger reasoning only as an evidence-review or escalation path—not as the default implementation model.

Milestone 1 planning target:  
Luna-Medium is the default implementation model only after the M1 Architecture Freeze Gate has passed and the task consumes handoff-ready M0 subsystems inside their frozen contracts. For ordinary world-package work, the preferred compact context is the task specification \+ World Package Conformance Specification \+ relevant src/world-sdk contracts \+ relevant conformance tests/fixtures \+ diagnostic reference-world files when useful, rather than the entire project document set. Terra-Medium is reserved for cross-boundary integration, Tauri/WebView2 behavior, lifecycle/package-loading defects, or other failures that cannot be resolved within one frozen handoff boundary. If a task exposes a need to choose, revise, or reconcile architecture, ordinary implementation stops; stronger reasoning and explicit architecture review own the decision before implementation resumes.

Implementation prompts should provide:  
• exact files/interfaces  
• forbidden scope  
• reference implementation/library  
• tests to pass  
• acceptance output format  
• for ordinary world-package tasks, the World Package Conformance Specification plus only the relevant src/world-sdk contracts, conformance tests/fixtures, and diagnostic reference-world files needed by the task  
• relevant docs/handoff/ package when the task consumes a handoff-ready subsystem  
• exact verification commands from that handoff package  
• explicit escalation conditions and a stop rule forbidding silent changes to frozen contracts, ADRs, test oracles, or cross-subsystem boundaries  
• for M0D tasks, the relevant frozen Pose Estimator Experiment Specification section and evidence-schema version

# 43\. Recommended Implementation Sequence

The approved low-risk implementation order is:

1\. Repository/Tauri/React/Three.js foundation, including the generic packaged-launch smoke harness, minimal launch smoke mode, evidence/ directory, and docs/handoff/ standard template.  
2\. Shared contracts \+ validation; establish src/world-sdk/ as the explicit public world-facing source boundary, src/world-host/ as host-private world infrastructure, the baseline static world-boundary check, and the public SDK API-surface guard.  
3\. Screen geometry \+ deterministic off-axis projection tests.  
4\. Create worlds-dev/diagnostic-room in package-shaped source form and render it using SyntheticViewerPoseSource through the temporary static bootstrap. The same source must implement the normal VirtualWorld/WorldContext/WorldFrame contract.  
5\. ViewerStateController with injected MonotonicClock, fixed 350 ms / 5-second / 300 ms transition semantics, smoothstep interpolation, and deterministic tests.  
6\. Extend the M0A packaged-launch harness with the application-native synthetic smoke mode; prove the packaged renderer \+ synthetic viewer \+ package-shaped diagnostic room before live camera integration.

M0D sequence:  
7\. Freeze the Pose Estimator Experiment Specification: estimator A/B methods, required inputs, estimator-intrinsic calibration inputs, RawViewerPose semantics, metric formulas, live test matrix, evidence schema, rerun rules, and M0D7/M0D8 boundaries.  
8\. M0D1 — local MediaPipe assets \+ tracking worker boot in packaged WebView2.  
9\. M0D2 — versioned worker protocol \+ latest-frame backpressure \+ lifecycle tests.  
10\. M0D3 — normalize MediaPipe output into TrackingObservation \+ deterministic fixtures.  
11\. M0D4 — implement estimator A from the frozen MediaPipe facial-transform reference/formula.  
12\. M0D5 — implement estimator B from the frozen calibrated facial-scale/interocular reference/formula.  
13\. M0D6 — deterministic recorded-trace replay \+ fixed metric calculations \+ versioned evidence schema \+ evidence-bundle validator.  
14\. M0D7 — execute the prescribed live hardware test matrix for both estimators; preserve anomalies and procedural invalidations; calculate only predefined metrics; validate the evidence bundle; do not tune, rank, or select.  
15\. M0D8 — review the validated evidence, select/provisionally select a production estimator or document why escalation is required, and create ADR-006.01 when evidence supports the decision.  
16\. Establish the M0D handoff as canonical RawViewerPose in millimeters plus representative recorded stationary and normal-motion traces.

M0E sequence:  
17\. Calibration contracts/profile persistence with identity host correction by default.  
18\. Calibration UI/camera preview/neutral-pose workflow.  
19\. One Euro filter adaptation from vetted reference \+ deterministic trace replay harness.  
20\. Live RawViewerPose → CalibrationTransform → PoseFilter → ViewerStateController integration.  
21\. Run prescribed calibration experiment; fit/evaluate only the simple per-axis scale \+ offset model unless evidence proves inadequate.  
22\. Run bounded filter parameter sweep; calculate objective jitter/lag metrics and shortlist candidates.  
23\. Perform perceptual comparison of shortlisted filter candidates and preserve evidence.

M0F — world-package proof:  
24\. Implement package-directory discovery \+ manifest/API/path validation under src/world-host/ using the minimal fixture-world catalog.  
25\. Establish the reusable world-package conformance harness and complete automated static world/host architecture-boundary enforcement plus the public SDK API-surface guard.  
26\. Execute the dynamic local ESM world-loading spike in packaged Tauri and settle the production loader mechanism.  
27\. Build the existing worlds-dev/diagnostic-room source into dist/world.js and move that same implementation through the production manifest/discovery/loader/lifecycle path; do not create a second diagnostic implementation.  
28\. Implement package-local WorldAssetService behavior and prove asset isolation with the diagnostic package plus asset-escape fixture.

M0G — settings/diagnostics/offline:  
29\. Implement world settings schema/UI/persistence and complete the reusable settings conformance suite.  
30\. Complete diagnostic JSON export, including world/package conformance context useful to troubleshooting.  
31\. Run full offline/static-asset completeness verification and packaged network-blocked smoke, including the diagnostic package through the production loader.

M0H — acceptance/freeze:  
32\. Run performance/jitter/latency/resource/startup/world-switch measurement pass.  
33\. Review evidence and lock selected estimator/filter/calibration/loader/lifecycle details through ADRs where architecture-significant.  
34\. Produce evidence/milestone-0/world-package-conformance.json and confirm reusable conformance suites, fixture catalog, static boundary checks, diagnostic reference-world conformance, and packaged-runtime checks pass.  
35\. Complete/update all required docs/handoff/ subsystem packages and run their documented verification commands. The world-package handoff uses the World Package Conformance Specification as its compact contract context.  
36\. M0H applies the handoff-readiness and M1 Architecture Freeze verification defined by the Testing Strategy to the architecture requirements defined by this TDS. Gate timing is governed by the Milestone Roadmap; readiness evidence and pass/fail recording follow the Testing Strategy. Every M1-required evidence-gated technical choice must have an accepted baseline before M1 consumes it; unresolved source conflicts or required architecture choices block Milestone 1\.  
37\. Milestone 1 begins only after handoff readiness and the M1 Architecture Freeze Gate pass; ordinary M1 implementation consumes frozen decisions and does not invent architecture.  
38\. Only after Milestone 1 exit criteria are satisfied begin the first real content world.

Projection and synthetic viewer work intentionally precede live tracking so geometry errors and tracking errors are not debugged simultaneously.

The diagnostic room is intentionally package-shaped before the loader exists so M0F changes the loading mechanism, not the world implementation. This prevents a mid-M0 rewrite and makes the same code useful as the canonical reference for Milestone 1 and later worlds.

M0C remains constrained so Luna-Medium can implement it: the state machine receives a fixed clock/easing/transition contract, and packaged smoke extends an already-proven M0A harness rather than requiring open-ended GUI automation or package-loader design.

M0D is decomposed so stronger reasoning is used only to freeze experiment design and interpret the validated evidence. Luna/Terra handle implementation, replay tooling, and scripted evidence collection within fixed boundaries. M0E uses the same pattern.

M0F intentionally converts architectural prose into executable boundaries: a public world-sdk surface with an automated export-surface guard, reusable conformance suites, minimal failure fixtures, static world/host boundary enforcement, the canonical diagnostic reference world, and packaged-runtime proof. This is the primary mechanism for lowering Milestone 1 model/reasoning requirements.

# 44\. Key Technical Risks and Mitigations

Risk: local dynamic ESM loading behaves differently in packaged WebView2.  
Mitigation: prove it with the same package-shaped diagnostic implementation already used in M0B/M0C; change the loading path in M0F rather than rewriting the world; do not build a package ecosystem first.

Risk: diagnostic reference world accidentally depends on private host internals.  
Mitigation: keep it top-level under worlds-dev/, expose only src/world-sdk/ to worlds, run static world-boundary checks from M0B onward, and require the diagnostic room to pass the same applicable conformance suites as later worlds.

Risk: reusable conformance tests become a second source of architecture rather than verification.  
Mitigation: World Package Conformance Specification and Interface & Contract Specification remain normative; tests carry WPC requirement references where practical; conflicts stop and escalate instead of weakening whichever artifact is inconvenient.

Risk: fixture-world infrastructure grows into a miniature content ecosystem.  
Mitigation: keep each fixture minimal and single-purpose; add fixtures in response to defined contract coverage or real regressions, not speculative completeness.

Risk: MediaPipe worker/frame transfer creates too much copy/latency.  
Mitigation: benchmark supported transferable frame paths; enforce latest-frame backpressure.

Risk: monocular Z estimate is unstable.  
Mitigation: freeze two baseline estimator methods and one versioned test procedure, evaluate both with deterministic replay plus equivalent scripted live evidence, preserve anomalies rather than tuning during collection, and escalate to solvePnP only if M0D8 concludes from validated evidence that neither simpler estimator is adequate.

Risk: filter removes jitter but adds lag.  
Mitigation: collect both jitter and latency metrics; tune from real traces.

Risk: physical/mm scene scale causes unusual Three.js near/far precision choices.  
Mitigation: projection tests \+ diagnostic world \+ explicit clip-plane policy.

Risk: world bundles duplicate Three.js/dependencies.  
Mitigation: accept initially; measure before introducing shared-runtime complexity.

Risk: JSON-Schema UI library adds excessive weight or fights custom UI hints.  
Mitigation: test with a small representative schema; fall back to a deliberately narrow renderer while keeping Ajv/JSON Schema authoritative.

Risk: Tauri CSP/WASM/worker/camera interactions only fail after packaging.  
Mitigation: establish the generic application-native packaged-launch harness in M0A, extend it with synthetic smoke in M0C, prove world loading/assets in packaged M0F, and reserve full offline/static-asset verification for M0G.

Risk: handoff documentation drifts from executable reality.  
Mitigation: keep handoff notes concise; point to authoritative contracts/tests/ADRs/evidence instead of duplicating them; require same-change updates when governed artifacts move/change; ensure the Testing Strategy readiness procedure treats stale/missing references or contradictory sources as failures.

Risk: lower-cost implementation agents bypass the intended world boundary to finish a task.  
Mitigation: make the boundary executable through src/world-sdk/ exports, static import/capability checks, reusable conformance tests, reference implementation, exact handoff verification commands, and explicit stop/escalation rules.

# 

# 45\. Decisions Deferred to ADRs or Experiments

The following should not be frozen only by this TDS revision:

• final pose estimator  
• final calibration math/required physical reference measurement  
• final One Euro implementation and parameters  
• exact tracking-loss debounce duration  
• exact reacquisition blend duration  
• exact near/far clipping defaults  
• exact dynamic local-module loading mechanism  
• whether React JSON Schema Form is retained  
• exact logging library/file sink  
• exact worker frame-transfer representation  
• whether world bundles continue to carry duplicate Three.js/runtime dependencies  
• whether later persistence needs SQLite  
• exact module/package specifier ultimately used by worlds to import the public world SDK  
• exact lint/build/test product used to enforce the static world/host boundary

The following are not deferred even though their implementation mechanics are:  
• worlds have one explicit public world-facing source/API boundary  
• host-private world infrastructure is not importable as part of the world API  
• the diagnostic room is package-shaped from M0B and the same implementation transitions from temporary static loading to production dynamic loading in M0F  
• reusable world conformance suites, minimal package fixtures, and static architecture-boundary checks are required before world-package handoff to Milestone 1  
• the diagnostic room receives no privileged capability and must pass the same applicable world conformance as later worlds

Deferred does not mean Milestone 1 may decide required items opportunistically. Any deferred technical choice required by Milestone 1 must be resolved to an accepted baseline during Milestone 0 and reflected in the relevant handoff package before the M1 Architecture Freeze Gate can pass. Architecture-significant outcomes should use a new/superseding ADR; implementation/default choices that do not warrant an ADR must still be fixed by authoritative code/configuration, tests, evidence, and the handoff package. A choice may remain unresolved only when Milestone 1 does not depend on it.

# 46\. Resolved TDS Decisions

Resolved for this revision:  
D-TDS-01 — Persistence: use small versioned JSON documents with atomic writes as the initial persistence mechanism. SQLite is deferred unless later requirements justify it.  
D-TDS-02 — World bundles: use prebuilt single-entry ESM world bundles from the configured local package directory. The exact Tauri local-module loading mechanism must be proven in a packaged Milestone 0 spike before broader package infrastructure is built.  
D-TDS-03 — World dependencies: each world package may bundle its own Three.js/runtime dependencies in the first version rather than introducing shared dependency injection, import maps, or a runtime package manager prematurely.  
D-TDS-04 — World settings validation/rendering: use Ajv for JSON Schema Draft 2020-12 validation and evaluate React JSON Schema Form before considering a custom renderer.  
D-TDS-05 — Diagnostic recent-log window: retain up to 200 structured log entries or 256 KiB of serialized log content, whichever limit is reached first. Per-frame telemetry is summarized separately rather than stored as ordinary log entries.  
D-TDS-06 — Tracking-loss grace: begin with a 350 ms loss-confirmation grace period. The already approved neutral return remains 5 seconds.  
D-TDS-07 — Reacquisition: begin with a 300 ms smooth blend back to the tracked pose, subject to Milestone 0 tuning.  
D-TDS-08 — Implementation order: synthetic projection first, packaged Tauri behavior second, live tracking third, runtime world-package loading before any real content world.  
D-TDS-09 — M0E calibration/filter implementation strategy: M0D hands off canonical RawViewerPose samples in millimeters plus recorded traces. M0E defaults to identity host correction, permits only measured per-axis scale \+ offset without further architecture review, adapts a proven One Euro implementation, tunes through deterministic replay and bounded parameter sweeps, and uses Luna-Medium for most bounded work with Terra-Medium reserved for live cross-boundary integration.  
D-TDS-10 — M0D estimator experiment implementation strategy: freeze the two baseline estimator methods, required TrackingObservation inputs, estimator-intrinsic calibration inputs, metric formulas, live hardware test matrix, evidence schema, and rerun rules before M0D4–M0D7. Use Luna-Medium for deterministic protocol/normalization/replay/evidence tooling and scripted M0D7 collection, Terra-Medium for worker integration and implementation of the two prescribed estimators, and Sol-High only for M0D8 comparative interpretation and the ADR-006.01 or escalation decision after the evidence bundle validates. M0D7 must not tune, rank, remove unfavorable samples, or alter the frozen experiment procedure.  
D-TDS-11 — M0C deterministic viewer-state design: ViewerStateController uses an injected monotonic clock, a fixed smoothstep interpolation function, explicit 350 ms loss confirmation, exact 5-second neutral return, and provisional 300 ms reacquisition semantics. Reacquisition remains an internal phase rather than a new public TrackingStatus. Invalid/non-finite poses are never applied.  
D-TDS-12 — Packaged smoke architecture: establish a generic application-native packaged-launch harness in M0A, selected by WORLD\_VIEWER\_SMOKE\_MODE. M0C extends that harness with a synthetic viewer/diagnostic-room mode and structured stdout result plus process exit status. M0C does not introduce desktop GUI automation or full offline verification; M0G owns complete offline/static-asset and network-blocked validation.  
D-TDS-13 — Production handoff architecture: use repo-local docs/handoff/ Markdown notes as concise navigation/verification packages for M0 subsystems that Milestone 1 will consume as stable. Each note must identify the stable contract; the ORC-\* IDs it consumes; the authoritative tests/oracles behind those IDs; which oracles are frozen/accepted for M1, including Class A/B/C classification where applicable; the known-good reference implementation; the REUSE-\* IDs it consumes; the approved dependency/reference implementation and approval source behind those IDs; Reuse Mode A/B/C/D; relevant version/source/provenance constraints; the remaining project-specific custom-code boundary; Prohibited Reinvention; governing ADRs; evidence; limitations; exact verification commands; and escalation conditions. Code/interfaces/tests/ADRs/evidence and the repo-local Oracle/Reuse registries remain authoritative; the handoff note must not become a duplicate source of truth. M0A creates the template, M0B–M0G update subsystem notes and registry links, M0H applies the Testing Strategy’s handoff-readiness, Verification Readiness, Reuse Readiness, and architecture-freeze procedures, and ordinary M1 work stops for review if a frozen interface/oracle, accepted ADR, approved reuse path, custom-code boundary, or cross-subsystem ownership boundary appears to require change. No separate machine-readable handoff manifest is introduced until demonstrated need justifies it.  
D-TDS-14 — Milestone 1 architecture freeze gate: before Milestone 1 consumes an M0 subsystem as stable, every evidence-gated technical choice required by M1 must have an accepted baseline. At minimum this covers the production pose estimator, baseline calibration approach/model, worker frame-transfer mechanism, packaged local ESM loading mechanism, production filtering implementation/defaults, and world package-loading/lifecycle behavior. A choice may remain unresolved only if M1 does not depend on it. Handoff readiness does not substitute for architecture resolution; both requirements are confirmed through the Testing Strategy’s M0H verification procedure. Ordinary M1 tasks may not invent, revise, or silently reconcile architecture; a required change stops implementation and escalates for explicit review and, when architecture-significant, a new or superseding ADR.  
D-TDS-15 — World source boundary: use src/world-sdk/ as the explicit public world-facing source boundary and src/world-host/ for host-private discovery/manifest/loading/lifecycle/assets/settings infrastructure. The SDK is initially an internal source boundary, not a separately published package or monorepo workspace. World source may depend on the SDK plus permitted package-local/bundled dependencies, not host-private source modules.  
D-TDS-16 — Diagnostic reference-world transition: create worlds-dev/diagnostic-room in package-shaped source form during M0B. M0B/M0C may load that same source statically through a narrow bootstrap while the production loader does not exist, but it receives only the normal public world contract. M0F builds the same source into dist/world.js and moves it through the production manifest/discovery/dynamic-loader/lifecycle path; no second privileged diagnostic implementation is created.  
D-TDS-17 — World conformance architecture: implement reusable world-manifest, lifecycle, settings, assets, and isolation conformance suites plus a minimal single-purpose fixture-world catalog. The diagnostic room and later production worlds run the same applicable suites. Packaged-runtime checks remain separate for Tauri/WebView2 behavior that headless conformance cannot prove.  
D-TDS-18 — Static world/host boundary enforcement: automatically enforce the public/private world dependency boundary during relevant local verification and future CI using the simplest maintainable lint/build/test mechanism that reliably catches forbidden imports/direct capability bypasses. The exact enforcement tool is an implementation choice; suppressions are review-only and are not a routine escape hatch.  
D-TDS-19 — Public world SDK API-surface guard: src/world-sdk/index.ts is the initial canonical public export entrypoint unless an equivalent entrypoint is explicitly selected during scaffolding. Automated local verification and future CI must compare the TypeScript-visible exported symbol set against an explicit approved allowlist/expected-export fixture or equivalent stable contract check. The guard fails when an unapproved public symbol appears, an expected public symbol disappears, or host-private capability is re-exported through the public entrypoint. It verifies names/origins rather than duplicating type definitions. Intentional public-surface changes require explicit contract review and corresponding test/fixture updates. This guard complements rather than replaces scripts/check-world-boundaries.\*.  
D-TDS-20 — Standard bounded task execution: ordinary implementation tasks use the Task Specification & Definition of Done Template (or an equivalent structure) to define Required Context, Allowed Scope, Prohibited/Out-of-Scope Changes, Deliverables, Verification, Escalation/Stop Conditions, Definition of Done, and Completion Report. The task is a derived execution artifact and cannot override accepted ADRs, authoritative interfaces/contracts, established test oracles, or subsystem handoff boundaries. If the bounded context exposes a genuine architecture conflict or missing capability, implementation stops and escalates rather than broadening scope or silently redesigning the system.  
D-TDS-21 — Oracle-first delegation: World Viewer implementation follows requirement/ADR → oracle design/classification → stronger review where warranted → oracle freeze → Luna/Terra implementation → verification → escalation. Class A routine deterministic and directly specified Class B integration/conformance expectations may be authored by Luna/Terra under frozen requirements. Class C architecture-critical oracles require stronger-reasoning review before freeze, with Sol-High as the default planning assumption unless equivalent direct review or another approved plan specifies otherwise. Ordinary implementation tasks have no authority to weaken, reinterpret, re-threshold, reclassify, or replace a frozen oracle to obtain a pass; conflicts stop and escalate.  
D-TDS-22 — Mandatory Reuse Gate: World Viewer is reuse-first by default. Before a bounded implementation task with a material dependency/reference choice may be Ready, it must identify an approved Reuse Mode (A adopt directly, B adapt approved reference, C compose approved primitives, or explicitly authorized D project-specific custom implementation), the approved dependency/reference and approval source where applicable, licensing/provenance and version/source constraints where relevant, offline/packaged compatibility expectations, the permitted custom-code boundary, Prohibited Reinvention, and the verification path. Ordinary implementation agents must use the approved mature path and may not silently replace, bypass, fork/vendor, or reimplement it. Unresolved reuse decisions block dependent implementation or require a separate bounded evaluation/spike; Mode D is an explicit exception, not an agent convenience choice.  
D-TDS-23 — Registry placement/ownership and ADR threshold: docs/testing/oracle-registry.md and docs/reuse-register.md are lightweight repo-local execution/navigation aids, not duplicate specification systems. The Oracle Registry is governed by Testing Strategy oracle ownership and points to authoritative requirements/contracts/ADRs/experiment specs/tests/procedures; the Reuse Register is governed by TDS/ADR/reuse policy and points to authoritative architecture decisions, approved references, dependency manifests/lockfiles, and verification. Handoff notes cite Oracle/REUSE IDs. Non-semantic metadata/path/version updates may occur inside bounded work with required verification, but semantic oracle/reuse changes require their recorded review authority. Creating/updating a registry entry does not itself require an ADR; a new/superseding ADR is required only when the underlying choice materially changes architecture or supersedes an accepted architectural decision.  
D-TDS-24 — Canonical reuse terminology and approval authority: “Reuse Mode” is the project-wide term for A/B/C/D and “Prohibited Reinvention” is the canonical field naming mature behavior ordinary implementation must not replace, bypass, duplicate, or rebuild. A reuse Approval Source must be an Accepted ADR, authoritative TDS/interface/conformance decision, accepted experiment result, or explicitly authorized non-architectural task decision. Handoff notes may cite/summarize that approval but do not create reuse authority.  
D-TDS-25 — Single-owner handoff schema: the TDS owns the semantic structure/required fields for docs/handoff/\<subsystem\>.md and M0A materializes that structure in docs/handoff/README.md. The Testing Strategy owns only readiness verification against the canonical structure, and the Milestone Roadmap owns only gate timing/consumption. Neither may maintain a competing field schema. Intentional handoff-structure changes update the TDS first, then the repo template/affected notes; pass/fail test logic changes update the Testing Strategy separately.

