# World Viewer

## Interface / Contract Specification

## Draft v0.6

# Document Status

Draft version: 0.6  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Interface / Contract Specification  
Upstream artifacts:  
• World Viewer — Project Vision & Charter, Draft v0.2  
• World Viewer — Product Specification & PRD, Draft v0.2  
• World Viewer — Non-Functional Requirements, Draft v0.2  
Companion implementation/verification artifacts:  
• Technical Design Specification, Draft v0.18  
• Testing Strategy, Draft v0.15  
• World Package Conformance Specification, Draft v0.4

This sixth draft formalizes the host/world capability boundary required for conformance-driven development. It explicitly classifies the public world-facing surface versus host-private contracts, makes the world-facing import boundary enforceable, clarifies that compilation alone does not establish world-package conformance, and links the public contract to the World Package Conformance Specification, reusable conformance suites, and canonical diagnostic reference world without expanding the capabilities available to worlds.

# 1\. Contract Design Goals

The contracts in this specification are designed to achieve the following:

• Keep webcam/tracking implementation details out of world packages.  
• Keep world-specific content out of the engine core.  
• Allow the live viewer-pose implementation to be replaced by deterministic simulation during tests.  
• Allow multiple pose-estimation approaches to be compared behind one stable interface.  
• Keep the head-tracked projection camera engine-owned and read-only to worlds.  
• Make the public world-facing capability boundary explicit enough to enforce automatically in tests/build tooling.  
• Use explicit units and coordinate conventions to prevent sign/scale errors.  
• Validate data at package, configuration, persistence, and diagnostic boundaries.  
• Make individual modules small enough to be implemented and tested independently.  
• Keep runtime operation fully offline.  
• Make diagnostic output straightforward for an AI/agent to inspect.  
• Prefer versioned data contracts over implicit conventions.

# 2\. Dependency Direction

The intended high-level dependency flow is:

Camera / deterministic simulator  
        ↓  
Tracking source  
        ↓  
Pose estimator  
        ↓  
Pose filter / tracking-state controller  
        ↓  
Canonical ViewerState  
        ↓  
Projection controller ─────→ Engine-owned Three.js camera  
        ↓  
Read-only viewer snapshot  
        ↓  
Active world package

World packages may depend only on the explicitly designated public world-facing contracts plus their own permitted bundled dependencies. They must not import other host contracts merely because those types/modules exist in the repository. The engine core must not depend on a specific world implementation.

The renderer and projection controller may depend on Three.js. World packages may use Three.js scene primitives through the world context and may bundle permitted world runtime dependencies according to the accepted world-dependency policy. Tracking, pose-estimation, calibration, projection, persistence, native-host, and application-state contracts are host-private with respect to worlds and must not depend on world code.

# 3\. Canonical Spatial Coordinate System

This draft proposes one canonical screen-relative coordinate system for all engine geometry.

Draft decision:  
• Coordinate system: right-handed.  
• Origin: physical center of the visible display area.  
• \+X: to the viewer’s right across the display.  
• \+Y: upward.  
• \+Z: outward from the display toward the viewer.  
• The physical screen plane is Z \= 0\.  
• A viewer in front of the display has Z \> 0\.  
• Virtual content intended to appear behind the display normally occupies Z \< 0\.

This convention intentionally matches the common Three.js orientation where a camera at positive Z looks toward negative Z.

Canonical screen corners for width W and height H:

lowerLeft  \= (-W/2, \-H/2, 0\)  
lowerRight \= ( W/2, \-H/2, 0\)  
upperLeft  \= (-W/2,  H/2, 0\)  
upperRight \= ( W/2,  H/2, 0\)

All transformations from camera/tracker coordinates into the engine must terminate in this canonical screen-relative frame before projection code consumes the pose.

# 4\. Units and Scale

Decision: World Viewer shall use millimeters throughout canonical engine and world geometry.

Rationale:  
• Physical display measurements, camera offsets, viewer pose, calibration, and acceptance thresholds are naturally expressed in millimeters.  
• Using one physical unit end-to-end removes avoidable conversion boundaries between tracking, calibration, filtering, projection, diagnostics, and world behavior.  
• Imported assets whose native conventions use meters, including many glTF assets, must be converted explicitly at the asset/world boundary rather than changing the engine’s canonical unit.

Contract rule:  
• All physical spatial values exposed by engine/world contracts use millimeters unless a field explicitly declares another unit.  
• Spatial field names use the \*Mm suffix where practical.  
• Velocity uses \*MmPerSec.  
• Angles use radians.  
• No contract may use an unlabeled numeric field named only width, height, x, y, z, distance, or position where physical units are ambiguous.

Example:  
physicalWidthMm: 345.4  
screenWidthMmm: 345.4

# 5\. Time and Identifier Conventions

Time:  
• Monotonic timestamps used for runtime tracking/render calculations shall be represented in milliseconds from a monotonic clock.  
• ViewerStateController timing shall depend on an injected MonotonicClock abstraction rather than wall-clock time, arbitrary sleeps, or timer callbacks.  
• Wall-clock timestamps used in persisted diagnostics shall be ISO 8601 strings.  
• Delta time supplied to world updates shall be seconds.

Identifiers:  
• Stable package/profile identifiers shall be lowercase machine-readable strings using letters, numbers, dots, hyphens, and underscores.  
• Display profiles, world packages, estimator implementations, and diagnostic schemas shall have stable IDs independent of display labels.  
• Human-readable names shall never be used as primary persistence keys.

Versioning:  
• Public host/world API versions shall use semantic versioning.  
• JSON data contracts shall include an explicit schemaVersion.

Clock abstraction:

# 

interface MonotonicClock {  
  nowMs(): MonotonicMs;  
}

# 

Rules:  
• production implementations use a host monotonic source such as performance.now() or an equivalent monotonic clock.  
• test implementations may provide a manually advanced clock.  
• engine state machines consume MonotonicClock rather than wall-clock time.  
• MonotonicClock is an internal engine/testability contract and is not exposed to world packages.

# 

# 6\. Core Scalar and Vector Types

Conceptual TypeScript contracts:

type Millimeters \= number;  
type Seconds \= number;  
type MonotonicMs \= number;  
type Confidence \= number; // validated 0.0–1.0

interface Vec3Mmm {  
  x: Millimeters;  
  y: Millimeters;  
  z: Millimeters;  
}

interface Vec3MmmPerSec {  
  x: number;  
  y: number;  
  z: number;  
}

interface Size2Mm {  
  width: Millimeters;  
  height: Millimeters;  
}

These aliases are documentation/type-intent boundaries; the final implementation may use branded numeric types if that materially improves safety without making the code cumbersome.

# 7\. Tracking State Contract

Tracking state is separate from numeric pose so downstream systems never infer tracking health from NaN values or ad hoc confidence checks.

type TrackingStatus \=  
  | "unavailable"  
  | "initializing"  
  | "acquiring"  
  | "tracked"  
  | "degraded"  
  | "lost";

interface TrackingHealth {  
  status: TrackingStatus;  
  confidence: number | null;  
  sinceMonotonicMs: number;  
  reasonCode?: string;  
}

Required semantics:  
• unavailable — no usable source exists, permission denied, or source failed.  
• initializing — source/model/camera startup is in progress.  
• acquiring — source is operating but has not yet established a reliable viewer.  
• tracked — pose is considered reliable for normal projection.  
• degraded — a pose may exist but confidence/quality has fallen below the normal tracked condition.  
• lost — a previously tracked viewer is no longer reliable and neutral-return behavior applies.

Reacquisition is an internal ViewerStateController transition phase and is not added to TrackingStatus. When the tracking source has again established a reliable pose, TrackingHealth.status may be tracked while effectivePositionMm is still blending toward the newly tracked pose.

The precise loss-confirmation and reacquisition durations remain implementation/tuning details owned by the TDS; the public state semantics above remain contract-level. The 5-second neutral-return behavior remains part of the viewer-state contract.

# 8\. Tracking Observation Contract

The pose estimator should not receive raw application/UI state. It receives a normalized tracking observation produced by a tracking source.

Conceptual contract:

interface TrackingObservation {  
  timestampMs: MonotonicMs;  
  sourceId: string;  
  frame: {  
    widthPx: number;  
    heightPx: number;  
  };  
  confidence: number | null;  
  face?: FaceObservation;  
}

interface FaceObservation {  
  normalizedLandmarks?: readonly NormalizedLandmark\[\];  
  facialTransformMatrix?: readonly number\[\];  
}

interface NormalizedLandmark {  
  x: number;  
  y: number;  
  z?: number;  
  visibility?: number;  
}

Rules:  
• TrackingObservation is immutable after publication.  
• It may expose only the tracker outputs required by pose estimators.  
• It must not expose camera DOM objects, MediaPipe task objects, or mutable tracker internals.  
• Optional fields allow estimators to use different available MediaPipe outputs without forcing one algorithm on the contract.

The exact landmark representation may be narrowed during the Technical Design Specification after the selected MediaPipe APIs are verified.

# 9\. Tracking Source Contract

A TrackingSource owns the mechanism that produces TrackingObservation values.

Conceptual contract:

interface TrackingSource {  
  readonly id: string;  
  readonly kind: "live-camera" | "recorded" | "synthetic";

  start(): Promise\<void\>;  
  stop(): Promise\<void\>;  
  getHealth(): Readonly\<TrackingHealth\>;  
  subscribe(listener: (observation: TrackingObservation) \=\> void): () \=\> void;  
}

Required behavior:  
• start/stop are idempotent or fail with a defined contract error.  
• stop releases owned camera/tracker/worker resources.  
• listeners receive monotonically ordered observations.  
• the implementation controls backpressure/dropped frames; consumers are not guaranteed every captured frame.  
• live tracking must remain off the main render/UI thread for expensive inference.

Initial implementations:  
• MediaPipeLiveTrackingSource.  
• A deterministic synthetic/fixture source for tests.  
• A recorded source may be added if useful for regression reproduction.

Decision: the production pipeline shall expose ViewerPoseSource as the main estimator/source boundary. The live implementation composes tracking \+ pose estimation internally behind that boundary, while synthetic/recorded implementations may emit canonical RawViewerPose samples directly. In the normal M0E pipeline, ViewerPoseSource feeds CalibrationTransform and PoseFilter before ViewerStateController.

# 10\. Viewer Pose Estimator Contract

A ViewerPoseEstimator converts tracker observations into physical viewer position in the canonical screen-relative coordinate system.

Decision: ViewerPose.positionMmm represents the midpoint between the viewer’s left and right eyes (“cyclopean eye”), because the product renders one monoscopic head-coupled view.

Conceptual contract:

interface RawViewerPose {  
  timestampMs: MonotonicMs;  
  positionMm: Vec3Mm;  
  confidence: Confidence;  
  estimatorId: string;  
}

interface ViewerPoseEstimator\<TCalibration \= unknown\> {  
  readonly id: string;  
  readonly version: string;

  validateCalibration(value: unknown): TCalibration;  
  estimate(  
    observation: TrackingObservation,  
    context: PoseEstimationContext\<TCalibration\>  
  ): RawViewerPose | null;  
}

interface PoseEstimationContext\<TCalibration\> {  
  display: Readonly\<ScreenGeometry\>;  
  camera: Readonly\<CameraGeometry\>;  
  calibration: Readonly\<TCalibration\>;  
}

Rules:  
• An estimator either returns a finite canonical RawViewerPose or null.  
• RawViewerPose.positionMm is already expressed in the canonical screen-relative coordinate system and millimeters; M0E must not reinterpret MediaPipe landmarks or redo estimator computer-vision math.  
• Estimator-specific calibration required to produce physical-ish millimeters remains owned by the estimator/M0D boundary.  
• The estimator may not mutate calibration/display/camera state.  
• It owns validation of estimator-specific calibration parameters.  
• M0D should hand M0E both the selected/provisional estimator and reusable recorded RawViewerPose traces.  
• At least two estimators may be implemented during Milestone 0 for comparison without changing downstream contracts.

# 11\. Pose Filter and Viewer State Contracts

The M0D→M0E boundary is explicit: the selected estimator outputs RawViewerPose in canonical screen-relative millimeters after any estimator-intrinsic calibration required to produce physical-ish X/Y/Z. M0E then applies a host-level CalibrationTransform, followed by pose filtering. The pose filter therefore consumes calibrated—not estimator-raw—pose samples.

interface CalibratedViewerPose {  
  timestampMs: MonotonicMs;  
  positionMm: Vec3Mm;  
  confidence: Confidence;  
  estimatorId: string;  
}

interface CalibrationTransform {  
  apply(  
    sample: RawViewerPose,  
    profile: Readonly\<CalibrationProfile\>  
  ): CalibratedViewerPose;  
}

interface PoseFilter {  
  readonly id: string;  
  reset(initial?: CalibratedViewerPose): void;  
  update(sample: CalibratedViewerPose): FilteredViewerPose;  
}

interface FilteredViewerPose {  
  timestampMs: MonotonicMs;  
  positionMm: Vec3Mm;  
  velocityMmPerSec: Vec3MmmPerSec;  
  confidence: Confidence;  
}

The viewer-state controller combines filtered pose and tracking health:

interface ViewerState {  
  timestampMs: MonotonicMs;  
  tracking: Readonly\<TrackingHealth\>;  
  trackedPositionMm: Vec3Mm | null;  
  effectivePositionMm: Vec3Mm;  
  neutralPositionMm: Vec3Mm;  
  velocityMmPerSec: Vec3MmmPerSec;  
  confidence: number | null;  
}

Semantics:  
• trackedPositionMm is the current filtered tracked eye position when one is valid and finite.  
• NaN, Infinity, or otherwise non-finite pose coordinates are not valid viewer poses and must never be copied into trackedPositionMm or effectivePositionMm.  
• effectivePositionMm is the actual position being used by projection after neutral-return/reacquisition blending.  
• neutralPositionMm comes from the active calibration/display profile.  
• When tracking is confirmed lost, effectivePositionMm transitions from its current value toward neutralPositionMm over exactly 5 seconds.  
• During internal reacquisition, tracking.status may already be tracked while effectivePositionMm continues a deterministic no-snap blend toward the latest valid tracked pose.  
• ViewerState is immutable/read-only to world packages.

ViewerStateController input boundary:

# 

interface ViewerStateControllerInput {  
  tracking: Readonly\<TrackingHealth\>;  
  filteredPose: Readonly\<FilteredViewerPose\> | null;  
  neutralPositionMm: Vec3Mm;  
}

# 

interface ViewerStateController {  
  reset(neutralPositionMm: Vec3Mm): void;  
  update(input: Readonly\<ViewerStateControllerInput\>): Readonly\<ViewerState\>;  
}

# 

Contract rules:  
• the controller receives its MonotonicClock dependency at construction/factory time; update() does not accept or derive wall-clock time.  
• filteredPose may be null when no usable finite pose exists.  
• non-finite pose coordinates are rejected before they can affect trackedPositionMm or effectivePositionMm.  
• reset clears transition history and restores the effective viewer position to the supplied neutral position.  
• loss-confirmation, neutral-return, and reacquisition interpolation details are owned by the TDS while preserving the observable ViewerState semantics in this specification.  
• reacquisition remains internal to the controller and does not add a public tracking state.

# 

# 12\. Display Profile Contract

Display profiles hold user-entered physical display information plus display-scoped product settings.

interface DisplayProfile {  
  schemaVersion: number;  
  id: string;  
  name: string;

  physicalWidthMm: Millimeters;  
  physicalHeightMm: Millimeters;

  perspectiveStrength: number;  
  calibrationProfileId: string;

  isReferenceProfile?: boolean;  
}

Rules:  
• perspectiveStrength \= 1.0 means the physically calibrated baseline.  
• perspectiveStrength is scoped to the display profile, not to a world.  
• the exact allowed artistic range is deferred to UX/Technical Design.  
• width/height must be positive finite values within defensible validation bounds.  
• the reference ThinkPad E590 profile begins at approximately 345.4 mm × 194.3 mm.

Derived screen geometry:

interface ScreenGeometry {  
  widthMm: Millimeters;  
  heightMm: Millimeters;  
  centerMm: Vec3Mm; // canonical origin; expected {0,0,0}  
  lowerLeftMm: Vec3Mm;  
  lowerRightMm: Vec3Mm;  
  upperLeftMm: Vec3Mm;  
  upperRightMm: Vec3Mm;  
}

# 13\. Camera and Calibration Contracts

The reference version assumes the integrated camera is rigidly attached above the display. Camera geometry is still explicit so a future arbitrary-camera feature does not require redefining the engine coordinate model.

interface CameraGeometry {  
  cameraId: string;  
  positionScreenMm: Vec3Mm;  
  horizontalFovRad?: number;  
  verticalFovRad?: number;  
  captureWidthPx?: number;  
  captureHeightPx?: number;  
  captureFps?: number;  
}

interface CalibrationProfile {  
  schemaVersion: number;  
  id: string;  
  displayProfileId: string;

  cameraGeometry: CameraGeometry;  
  neutralViewerPositionMm: Vec3Mm;

  estimator: {  
    id: string;  
    version: string;  
    parameters: JsonObject;  
  };  
  poseCorrection: {  
    scale: { x: number; y: number; z: number };  
    offsetMm: Vec3Mm;  
  };  
}

Rules:  
• camera FOV must remain optional because the reference webcam’s calibrated FOV is not assumed known.  
• estimator-specific parameters are opaque to the host outside validation and persistence.  
• poseCorrection defaults to identity scale {1,1,1} and zero offset.  
• Milestone 0 host-level correction is deliberately limited to independent per-axis scale \+ offset. A more complex/nonlinear correction model requires measurement evidence and an architecture review.  
• CalibrationTransform is pure and deterministic: it may not modify tracking state, confidence, timestamps, or estimator identity.  
• initial reference camera X offset is 0 by assumption.  
• camera Y offset may be supplied by a simple physical measurement if needed.  
• M0E does not add checkerboard, lens-distortion, or full intrinsic-camera calibration unless M0D/M0E evidence demonstrates that the simple model cannot meet requirements.  
• arbitrary external-camera placement is not an initial product requirement.

# 14\. Projection Controller Contract

Projection is engine-owned. Worlds never receive mutable access to the head-tracked camera or its projection matrix.

Conceptual contract:

interface ProjectionInput {  
  viewer: Readonly\<ViewerState\>;  
  screen: Readonly\<ScreenGeometry\>;  
  perspectiveStrength: number;  
  nearMm: Millimeters;  
  farMm: Millimeters;  
}

interface ProjectionResult {  
  effectiveEyeMm: Vec3Mm;  
  projectionMatrix: readonly number\[\];  
  viewMatrix: readonly number\[\];  
}

interface ProjectionController {  
  compute(input: ProjectionInput): ProjectionResult;  
  applyToEngineCamera(result: ProjectionResult): void;  
}

Contract invariants:  
• centered and off-center viewer positions must map the physical screen corners to the expected clip-space edges.  
• no world code may call applyToEngineCamera.  
• projection input must reject non-finite or geometrically invalid eye/screen combinations.  
• projection uses effectivePositionMm, not raw tracker data.  
• exact generalized-projection implementation belongs in the Technical Design Specification and ADR, but the geometry contract is fixed here.

# 15\. Frame Timing Contract

The engine owns the render/update loop.

interface EngineFrame {  
  frameNumber: number;  
  timestampMs: MonotonicMs;  
  deltaSeconds: Seconds;  
  viewer: Readonly\<ViewerState\>;  
  viewport: Readonly\<ViewportState\>;  
}

interface ViewportState {  
  pixelWidth: number;  
  pixelHeight: number;  
  devicePixelRatio: number;  
}

Rules:  
• deltaSeconds is bounded/sanitized after long pauses so worlds do not receive extreme simulation steps.  
• worlds receive one host update callback per engine update frame unless paused/loading.  
• tracking updates and render frames are independent cadences.  
• ViewerState supplied for a frame is a stable snapshot for that frame.

# 16\. World Package Directory Contract

Worlds are discovered from one configured local package directory.

Draft discovery rules:  
• Each immediate child directory is treated as one package candidate.  
• Discovery is not recursively nested.  
• A candidate is eligible only if it contains a valid world.manifest.json.  
• Package IDs must be unique within the configured package directory and use reverse-domain style identifiers, for example local.logan.aquarium.  
• Invalid packages are skipped and reported through diagnostics rather than crashing discovery.  
• Discovery/loading requires no network access.  
• The package directory is host configuration and may be changed by the user.

Proposed package shape:

worlds/  
  aquarium/  
    world.manifest.json  
    dist/  
      index.js  
    assets/  
      ...  
    settings.schema.json      (optional)  
    settings.ui.json          (optional)

The exact executable module-loading mechanism remains a Technical Design decision because Tauri/WebView security and bundling behavior must be validated before it is frozen.

# 17\. World Manifest Contract

Proposed world.manifest.json structure:

{  
  "schemaVersion": 1,  
  "id": "local.logan.aquarium",  
  "name": "Aquarium",  
  "version": "0.1.0",  
  "engineApi": "^1.0.0",  
  "entry": "dist/index.js",  
  "description": "Optional human-readable text",  
  "settings": {  
    "schema": "settings.schema.json",  
    "ui": "settings.ui.json"  
  }  
}

Required fields:  
• schemaVersion  
• id  
• name  
• version  
• engineApi  
• entry

Rules:  
• version and engineApi use semantic-version syntax.  
• package ID is a stable reverse-domain identifier across updates.  
• entry must resolve inside the package boundary.  
• referenced settings/assets must not escape the package directory through path traversal.  
• unknown manifest fields may be retained/ignored according to schema-version policy; required incompatibilities must fail validation.  
• manifest validation occurs before executable world code is loaded.

# 18\. VirtualWorld Lifecycle Contract

Conceptual host/world interface:

interface VirtualWorld {  
  initialize(context: WorldContext): Promise\<void\> | void;  
  update(frame: WorldFrame): void;  
  resize?(viewport: Readonly\<ViewportState\>): void;  
  onSettingsChanged?(settings: Readonly\<JsonObject\>): void;  
  dispose(): Promise\<void\> | void;  
}

interface WorldFrame {  
  frameNumber: number;  
  timestampMs: MonotonicMs;  
  deltaSeconds: Seconds;  
  viewer: Readonly\<ViewerState\>;  
}

Lifecycle:  
1\. Host validates package/manifest/settings.  
2\. Host creates a fresh world-owned root.  
3\. initialize is called exactly once.  
4\. update begins only after successful initialization.  
5\. settings changes are validated before delivery.  
6\. resize is optional and only receives viewport state.  
7\. dispose is called during switch/shutdown after updates stop.  
8\. after disposal the host removes the world root and verifies host-tracked resources as practical.

If initialize fails, update must never start.

Failure/lifecycle rules:  
• a failed initialization/activation must not be persisted as the successfully active world.  
• partial host-owned/world-root state created for a failed activation must be cleaned best-effort.  
• if update throws/fails, normal updates for that world stop and the host transitions to the defined recoverable world-error/safe path before cleanup.  
• if dispose throws/fails, the error is reported but host-owned root removal and other host cleanup continue best-effort.  
• each activation receives a fresh world-owned root; stale scene ownership must not carry across activations.

# 18A. World Resource Ownership Contract

World-owned runtime resources must be releasable when a world is switched, fails, or the application shuts down.

Rules:  
• resources created by a world are world-owned unless a public host capability explicitly documents otherwise.  
• world-owned resources include, where applicable, Three.js geometry, materials, textures, render targets, audio resources, timers, subscriptions, listeners, and similar runtime objects.  
• dispose() is the world’s lifecycle opportunity to release/dispose/unsubscribe those resources as appropriate.  
• the host removes the world-owned scene root after disposal or failed disposal as a defense-in-depth cleanup step.  
• host root removal does not relieve a world from disposing resources that Three.js/browser/runtime semantics require explicit release for.  
• repeated activation/switch/disposal must not depend on stale world-owned resources from a prior activation.  
• additional public cleanup/cache helpers may be introduced only after a demonstrated cross-world need and must become explicit world-facing contracts before worlds may rely on them.

The exact resource-tracking instrumentation and leak-detection implementation belong in the Technical Design Specification and Testing Strategy.

# 19\. WorldContext Contract

A world receives the minimum capabilities needed to create content without being able to control engine-owned tracking/projection.

Conceptual contract:

interface WorldContext {  
  readonly worldId: string;  
  readonly root: WorldSceneRoot;  
  readonly assets: WorldAssetService;  
  readonly logger: WorldLogger;  
  readonly settings: Readonly\<JsonObject\>;  
  readonly host: Readonly\<WorldHostInfo\>;  
}

interface WorldHostInfo {  
  engineApiVersion: string;  
  displayProfileId: string;  
}

WorldSceneRoot represents a world-owned Three.js Group or equivalent scene root.

The context does NOT expose:  
• mutable engine camera  
• projection controller  
• webcam  
• MediaPipe  
• calibration repository  
• unrestricted filesystem access  
• unrestricted Tauri/native APIs  
• other worlds’ scene roots/settings

Viewer state is supplied only through WorldFrame so it remains frame-scoped, read-only, deterministic, and easy to reproduce in tests. WorldContext does not expose a separate getViewerState() accessor.

# 19A. Public World Surface and Host-Private Surface

The host/world boundary is explicit. A type or service being present in the repository does not make it available to world packages.

Public to worlds  
The public world-facing surface consists of the contracts and data intentionally needed to implement a world:

• VirtualWorld  
• WorldContext  
• WorldFrame  
• ViewerState as read-only frame-scoped data  
• ViewportState when delivered through resize()  
• WorldSceneRoot  
• WorldAssetService  
• WorldLogger  
• WorldHostInfo  
• validated read-only world settings data  
• world.manifest.json, settings.schema.json, and settings.ui.json contracts  
• any future world-facing SDK/module that exposes only approved equivalents of the above

Host-private with respect to worlds  
The following contracts/capabilities are not part of the world-facing API and must not be imported, injected, or accessed by world code:

• TrackingObservation / TrackingSource  
• ViewerPoseSource internals  
• ViewerPoseEstimator  
• RawViewerPose / calibrated-pose pipeline internals except where a future public contract explicitly says otherwise  
• CalibrationTransform  
• PoseFilter  
• ViewerStateController  
• DisplayProfile and CalibrationProfile repositories/stores  
• ProjectionController  
• the mutable Three.js projection camera  
• webcam/media capture  
• MediaPipe and tracking-worker internals  
• NativeHost and unrestricted Tauri/native APIs  
• application persistence stores  
• package discovery/loader internals  
• host application UI/state-management internals  
• packaged-smoke/test-control capabilities  
• another world’s scene root, settings, assets, or private state

Boundary rules:  
• A world package must use the documented public surface rather than reaching into host-private source modules.  
• Relative paths, TypeScript aliases, workspace/package links, or direct platform APIs must not be used to bypass the public surface.  
• The public surface defines the engine API compatibility boundary for worlds. Host-private refactoring does not by itself change engineApiVersion unless it changes observable public world behavior.  
• Static/build-time architecture-boundary checks should mirror this classification so forbidden imports/capability bypasses fail automatically.  
• Runtime host validation and CSP/permissions provide defense in depth; they do not replace the source/import boundary.  
• A world package is not API-conformant merely because it compiles or renders. It must satisfy the World Package Conformance Specification and the applicable reusable conformance suites. Full World Viewer conformance additionally requires the applicable packaged-runtime checks.  
• The diagnostic room is subject to this same public/private boundary. It receives no privileged world-facing capability.

This classification is intentionally capability-oriented rather than tied to final repository paths. The Technical Design Specification may choose module/package names and enforcement tooling without changing the boundary itself.

# 20\. World Asset Service Contract

World packages should access their own local assets through a host-provided package-relative resolver/service.

Conceptual contract:

interface WorldAssetService {  
  resolve(relativePath: string): string;  
}

Rules:  
• relativePath must remain inside the package root.  
• network URLs are rejected for normal world assets.  
• path traversal outside the package is rejected.  
• the returned representation may be a Tauri/local asset URL chosen by the implementation.  
• Three.js native loaders remain preferred; this service resolves package-local paths rather than reimplementing asset loading.

• a world may resolve only assets belonging to its own validated package root; cross-world private asset access is not part of this contract.  
• missing/corrupt assets must fail through the bounded world/package error path rather than broadening filesystem capability.

Additional cache/disposal helpers may be added only if a demonstrated cross-world need emerges.

# 21\. World Settings Schema Contract

Worlds may define user-facing settings without supplying their own settings UI.

Proposed files:  
• settings.schema.json — JSON Schema Draft 2020-12 data/validation contract.  
• settings.ui.json — World Viewer UI presentation hints.

Example settings.schema.json:

{  
  "$schema": "https://json-schema.org/draft/2020-12/schema",  
  "type": "object",  
  "additionalProperties": false,  
  "properties": {  
    "fishCount": {  
      "type": "integer",  
      "minimum": 1,  
      "maximum": 100,  
      "default": 20,  
      "title": "Fish Count"  
    }  
  }  
}

Initial supported value types should be intentionally small:  
• boolean  
• string  
• number  
• integer  
• enum  
• flat or modestly nested object groups

Arrays and complex conditional schemas should not be assumed supported until needed.

# 22\. World Settings UI-Hints Contract

settings.ui.json controls presentation without changing validation semantics.

Proposed structure:

{  
  "schemaVersion": 1,  
  "controls": {  
    "/fishCount": {  
      "widget": "slider",  
      "group": "Population",  
      "order": 10,  
      "label": "Fish Count",  
      "unit": "fish",  
      "description": "Number of active fish"  
    }  
  }  
}

JSON Pointer paths identify schema properties.

Initial proposed widgets:  
• auto  
• checkbox  
• text  
• number  
• slider  
• select

Rules:  
• UI hints may influence presentation only.  
• JSON Schema remains authoritative for allowed values.  
• unsupported hints fall back to host default rendering.  
• ordering/grouping do not alter persistence shape.  
• host controls actual widgets to maintain a consistent UI and validation model.

# 23\. World Settings Persistence Contract

World package contents are immutable from the perspective of normal settings changes. Saved settings are reset to the package’s current defaults whenever the package version changes.

Conceptual interface:

interface WorldSettingsStore {  
  read(worldId: string): Promise\<JsonObject\>;  
  write(worldId: string, value: JsonObject): Promise\<void\>;  
  reset(worldId: string): Promise\<JsonObject\>;  
}

Rules:  
• saved settings are keyed by stable world ID, not package folder name.  
• saved values are validated against the active package schema before delivery.  
• when the installed package version changes, previously saved world settings are discarded/reset and the new package version starts from its current schema defaults.  
• within the same package version, incompatible saved values produce validation/recovery behavior rather than silent acceptance.  
• exact filenames/paths/migrations belong in the Data Model / Persistence Specification.  
• WorldSettingsStore is a host-internal persistence contract. World packages receive validated read-only settings through WorldContext/onSettingsChanged; they do not receive the store itself.

# 24\. Host Settings/Persistence Boundaries

Conceptual host repositories:

interface DisplayProfileStore {  
  list(): Promise\<readonly DisplayProfile\[\]\>;  
  get(id: string): Promise\<DisplayProfile | null\>;  
  save(profile: DisplayProfile): Promise\<void\>;  
}

interface CalibrationStore {  
  get(id: string): Promise\<CalibrationProfile | null\>;  
  save(profile: CalibrationProfile): Promise\<void\>;  
}

interface AppStateStore {  
  getLastActiveWorldId(): Promise\<string | null\>;  
  setLastActiveWorldId(id: string | null): Promise\<void\>;  
  getWorldPackageDirectory(): Promise\<string | null\>;  
  setWorldPackageDirectory(path: string): Promise\<void\>;  
}

These are logical interfaces only. The persistence specification may combine them physically in one file/database if that provides a simpler implementation.

DisplayProfileStore, CalibrationStore, AppStateStore, and other application persistence repositories are host-private with respect to world packages. A world receives only the narrow data intentionally surfaced through WorldContext/WorldFrame.

# 25\. Native Host Boundary

Browser/renderer code should not receive unrestricted native filesystem access.

Conceptual NativeHost capabilities:

interface NativeHost {  
  chooseDirectory(): Promise\<string | null\>;  
  listWorldPackageCandidates(root: string): Promise\<readonly PackageCandidate\[\]\>;  
  readPackageText(packageId: string, relativePath: string): Promise\<string\>;  
  writeAppDataAtomic(relativePath: string, text: string): Promise\<void\>;  
  exportDiagnosticJson(suggestedName: string, json: string): Promise\<string | null\>;  
}

Rules:  
• native capabilities are explicit and narrow.  
• world packages do not receive NativeHost directly.  
• package-relative reads are contained within validated package roots.  
• diagnostic export requires an explicit user action.  
• exact Tauri commands and permission scopes belong in the Technical Design Specification.  
• host-internal packaged-smoke startup/completion capabilities are test infrastructure, are not part of NativeHost, are unavailable to world packages, and must not expand the normal world-facing capability surface.

# 26\. Error Contract

Subsystem errors should be structured so they can be shown to the user, logged, and exported to an AI/agent.

type ErrorSeverity \= "info" | "warning" | "error" | "fatal";

interface WorldViewerError {  
  timestamp: string;  
  code: string;  
  subsystem:  
    | "camera"  
    | "tracking"  
    | "pose"  
    | "calibration"  
    | "projection"  
    | "world"  
    | "settings"  
    | "persistence"  
    | "native"  
    | "rendering";  
  severity: ErrorSeverity;  
  message: string;  
  details?: JsonObject;  
  recoverable: boolean;  
}

Rules:  
• error code is stable/machine-readable.  
• message is human-readable.  
• details must not contain raw webcam imagery.  
• implementation-specific stack traces may be logged/exported separately.  
• expected recoverable errors should not be represented only by thrown strings.  
• a world/package failure must not corrupt global display, calibration, package-directory, or other-world settings.  
• package validation/boundary failures must not be “recovered” by broadening filesystem, native, camera, projection, or network capability.  
• world initialize/update/dispose failures must leave the host able to enter a defined safe/recovery path when the error is marked recoverable.

# 27\. Diagnostics JSON Contract

Diagnostic export is one structured, versioned JSON document.

Proposed top-level structure:

{  
  "schemaVersion": 1,  
  "generatedAt": "ISO-8601 timestamp",  
  "application": {},  
  "system": {},  
  "world": {},  
  "displayProfile": {},  
  "calibration": {},  
  "camera": {},  
  "tracking": {},  
  "viewer": {},  
  "performance": {},  
  "settingsSummary": {},  
  "recentErrors": \[\],  
  "logs": \[\]  
}

Required contract characteristics:  
• valid JSON encoded as UTF-8.  
• no raw camera frame data by default.  
• schemaVersion required.  
• application/world versions required where available.  
• camera capture settings/capabilities included where available.  
• tracking status and latest viewer state included.  
• current display/calibration identifiers and relevant values included.  
• performance samples/summaries included.  
• recent structured errors and a bounded recent log window included.  
• export is local only and never automatically transmitted.

The diagnostic schema should later be formalized as JSON Schema so agents/tests can validate it. Full historical logs are not embedded in the standard diagnostic export; only a bounded recent window is included to keep the file compact and AI-friendly.

# 28\. Performance Sample Contract

To support NFR measurement and AI-assisted troubleshooting, timing samples should use stable field names.

Conceptual structure:

interface PerformanceSnapshot {  
  timestampMs: MonotonicMs;

  render: {  
    fps: number;  
    frameTimeMsP50?: number;  
    frameTimeMsP95?: number;  
  };

  tracking: {  
    updateHz?: number;  
    inferenceMsP50?: number;  
    inferenceMsP95?: number;  
  };

  latency?: {  
    motionToPhotonMsP50?: number;  
    motionToPhotonMsP95?: number;  
  };

  world?: {  
    updateMsP50?: number;  
    updateMsP95?: number;  
  };

  memory?: {  
    jsHeapBytes?: number;  
    processBytes?: number;  
  };  
}

Unsupported metrics may be omitted rather than fabricated.

# 29\. Package/API Compatibility Rules

Draft compatibility policy:

• engineApiVersion follows semantic versioning.  
• a world declares a compatible semantic-version range in world.manifest.json.  
• the host validates compatibility before executing world code.  
• incompatible worlds are skipped with a structured diagnostic error.  
• adding backward-compatible fields/methods increments minor/patch versions as appropriate.  
• breaking world-contract changes increment the engine API major version.  
• package manifest schemaVersion is separate from engine API version.  
• settings schema and UI-hints schema versions are separate from engine API version.  
• engineApiVersion governs the public world-facing capability/behavior surface, not arbitrary host-private implementation modules.  
• adding backward-compatible public world capabilities may require a minor version increment; breaking removal/change of a public world capability requires a major version increment.  
• refactoring host-private tracking, calibration, projection, persistence, native, loader, or UI internals does not by itself require an engine API version change unless observable world-facing behavior/contracts change.

The first real implementation should avoid elaborate migration infrastructure until there is an actual second incompatible version.

# 30\. Contract Validation Responsibilities

Boundary validation ownership:

World package discovery:  
Host validates manifest before module load.

World settings:  
Host validates saved/default values against the package JSON Schema before initialize/onSettingsChanged.

Display profile:  
Host validates dimensions and perspective-strength range before deriving ScreenGeometry.

Calibration:  
Host validates generic shape; selected estimator validates estimator-specific parameters.

Tracking:  
Tracking source guarantees structurally valid TrackingObservation values.

Pose:  
Estimator guarantees finite canonical coordinates or returns null.

Projection:  
Projection controller validates geometric preconditions before producing matrices.

Diagnostics:  
Exporter validates/constructs the defined diagnostic schema before writing the file.

Persistence:  
Stores reject unsupported schema versions rather than silently coercing them.

World-facing dependency boundary:  
Static/build-time verification checks that world source depends only on the designated public world-facing surface and permitted package-local/bundled dependencies. Forbidden host-private imports/direct platform bypasses are contract violations even if the code compiles.

World-package conformance:  
Compilation/type compatibility is necessary but insufficient. Structural, behavioral, and packaged-runtime conformance are verified according to the World Package Conformance Specification and Testing Strategy. The diagnostic reference world must satisfy the same applicable world-facing contract as production worlds.

# 31\. Deterministic Test Contracts

The interface design must allow deterministic tests without camera hardware.

Synthetic viewer source:  
A test helper may bypass face tracking and supply canonical viewer poses along scripted paths.

Example conceptual contract:

interface ViewerPoseSource {  
  start(): Promise\<void\>;  
  stop(): Promise\<void\>;  
  sample(timestampMs: MonotonicMs): RawViewerPose | null;  
}

A live implementation may internally compose TrackingSource \+ ViewerPoseEstimator; a synthetic implementation can emit poses directly.

Required deterministic scenarios:  
• centered viewer.  
• viewer left/right/up/down.  
• viewer closer/farther.  
• stationary jitter fixture.  
• tracking degradation/loss, including recovery before the configured loss-confirmation threshold.  
• with the current M0 default configuration, 349 ms loss-pending versus 350 ms confirmed-loss boundary behavior.  
• 5-second neutral return, including start, deterministic intermediate positions under the TDS-defined easing function, and exact neutral completion.  
• reacquisition, including the current M0 300 ms default, interruption, restart from the current effective pose, and no-snap behavior.  
• tracking.status may be tracked during internal reacquisition while effectivePositionMm is still blending.  
• invalid/non-finite filtered pose input.  
• controller reset to neutral with transition history cleared.  
• world initialization failure.  
• repeated world switching.  
• invalid settings/manifest.

ViewerPoseSource is the primary production pose-source abstraction. Live, synthetic, and recorded sources conform to this RawViewerPose boundary; the normal M0E path then applies CalibrationTransform and PoseFilter before ViewerStateController.

Deterministic clock helper:

# 

interface ManualClock extends MonotonicClock {  
  setMs(value: MonotonicMs): void;  
  advanceMs(deltaMs: number): void;  
}

# 

Production engine code depends only on MonotonicClock. ManualClock is test-only and exists so transition boundaries can be tested without sleeps or wall-clock timing.

# 

Packaged smoke result contract:

# 

type PackagedSmokeMode \= "launch" | "synthetic";  
type PackagedSmokeStatus \= "pass" | "fail";

# 

interface PackagedSmokeCheck {  
  id: string;  
  status: PackagedSmokeStatus;  
  detail?: string;  
}

# 

interface PackagedSmokeError {  
  code: string;  
  message: string;  
}

# 

interface PackagedSmokeResult {  
  schemaVersion: 1;  
  mode: PackagedSmokeMode;  
  status: PackagedSmokeStatus;  
  checks: readonly PackagedSmokeCheck\[\];  
  durationMs: number;  
  errors: readonly PackagedSmokeError\[\];  
}

# 

Smoke-result rules:  
• check IDs are stable machine-readable identifiers and unique within one result.  
• durationMs is finite and non-negative.  
• status is pass only when all required checks pass and errors is empty.  
• launch mode proves the packaged application can start, reach its defined readiness condition, emit a result, and terminate.  
• synthetic mode uses SyntheticViewerPoseSource and the normal ViewerStateController/projection/renderer path without camera or MediaPipe dependencies.  
• successful smoke completion maps to process exit code 0; failure maps to a non-zero exit code.  
• this contract is host-internal test infrastructure. It is not exposed through WorldContext, VirtualWorld, or NativeHost and does not expand the world-package API.

World-package contract testability:  
• the public world-facing surface must be testable with synthetic/fake WorldContext, WorldFrame, settings, and asset-service implementations without granting private host capabilities.  
• reusable conformance suites should be able to execute against more than one world implementation/package.  
• the diagnostic room is the canonical reference implementation but is not itself normative; if reference code conflicts with this specification, the reference code is corrected.  
• fixture packages may intentionally violate one contract rule at a time so validation, failure, and recovery semantics can be tested deterministically.  
• static world/host boundary checks complement these runtime/headless tests by proving world source did not bypass the public interface through private imports/direct platform APIs.  
• packaged-runtime checks remain necessary for contracts that only Tauri/WebView2 can prove, including the production local-module loading and package-asset path.

# 

# 32\. Contract Traceability

Key PRD/NFR requirements mapped to this specification:

• FR-TRK-004/005/009 → TrackingObservation, TrackingSource, TrackingHealth.  
• FR-VIEW-001–009 → RawViewerPose, ViewerState, ProjectionController.  
• FR-CAL-001–009 → DisplayProfile, CameraGeometry, CalibrationProfile.  
• FR-WORLD-001–008 → package directory, manifest, VirtualWorld, WorldContext, explicit public/private world capability boundary, and World Package Conformance Specification.  
• FR-SET-001–009 → display/settings stores, JSON Schema, UI-hints, WorldSettingsStore.  
• FR-DIAG-001–010 → error, performance, diagnostic JSON contracts.  
• NFR-MAINT-001–010 → explicit ownership/dependency direction.  
• NFR-TEST-001–010 → deterministic pose/world contracts.  
• NFR-DATA-001–008 → versioned logical stores and validation.  
• NFR-WORLD-001–010 → package isolation, compatibility, lifecycle, world resource ownership/cleanup, static dependency-boundary enforcement, and packaged-runtime conformance.  
• NFR-AI requirements → structured errors, versioned diagnostics, narrow independently testable interfaces, reusable conformance suites, and compact world-package context suitable for bounded implementation agents.

# 33\. Decisions Deferred to the Technical Design Specification

This contract draft intentionally does not yet decide:

• exact Tauri command/plugin implementation.  
• exact MediaPipe worker message protocol.  
• exact MediaPipe model assets/paths.  
• exact pose-estimation algorithm selected after comparison.  
• exact One Euro filter implementation/package and tuning.  
• exact off-axis projection code/library adaptation.  
• exact Three.js renderer initialization/configuration.  
• exact local dynamic-module loading strategy for world packages.  
• exact repository/module/package name used to expose the public world-facing SDK/contracts.  
• exact lint/build/test mechanism used to enforce the static world/host architecture boundary.  
• exact persistence technology/file paths.  
• exact logging library/rotation policy.  
• exact UI framework components for schema-rendered settings.  
• exact pixel-ratio/render-quality policy.

Those decisions may change without changing the product-level contracts above as long as the observable contract remains compatible.

# 34\. Resolved Contract Decisions

The following contract decisions are resolved for this revision:

D-IC-01 — Canonical spatial units: use millimeters throughout engine/world physical geometry. Imported assets using other unit conventions must be explicitly converted at the asset/world boundary.

D-IC-02 — Viewer pose reference point: ViewerPose.positionMm represents the midpoint between the viewer’s two eyes (“cyclopean eye”).

D-IC-03 — Viewer source abstraction: ViewerPoseSource is the primary production pose-source boundary and emits canonical RawViewerPose samples. The live implementation composes tracking \+ pose estimation internally; synthetic and recorded sources may emit canonical poses directly. CalibrationTransform and PoseFilter sit downstream of this boundary before ViewerStateController.

D-IC-04 — World package discovery: world.manifest.json is the manifest filename, and each immediate child directory of the configured package directory is one package candidate. Discovery is non-recursive.

D-IC-05 — World settings schema: use JSON Schema Draft 2020-12 in settings.schema.json plus settings.ui.json using JSON Pointer keys for host-rendered presentation hints.

D-IC-06 — World package identifiers: use stable reverse-domain identifiers, for example local.logan.aquarium.

D-IC-07 — World setting persistence across package versions: when the installed package version changes, previously saved world settings reset to the new version’s current schema defaults. Settings are preserved only while the package version remains unchanged.

D-IC-08 — Viewer state access: worlds receive viewer state only through the frame-scoped WorldFrame supplied to update(). World Viewer shall not expose a separate getViewerState() accessor in the initial contract. This keeps world behavior deterministic, frame-coherent, and easier to test and debug.

D-IC-09 — Diagnostic logging: the structured diagnostic JSON contains a bounded recent log window rather than full historical logs, keeping exports compact and AI/agent-friendly.

D-IC-10 — M0D/M0E viewer-pose boundary: M0D outputs RawViewerPose in canonical screen-relative millimeters after estimator-intrinsic calibration. M0E applies a pure host-level CalibrationTransform, limited initially to per-axis scale \+ offset, before PoseFilter. PoseFilter consumes CalibratedViewerPose. Recorded RawViewerPose traces must be reusable for deterministic M0E replay and tuning.  
D-IC-11 — Viewer-state timing/testability: ViewerStateController depends on an injected MonotonicClock, and deterministic tests may use ManualClock. Reacquisition remains an internal controller phase; TrackingStatus is unchanged. Non-finite pose coordinates are never valid viewer-state inputs.

D-IC-12 — Packaged smoke contract: packaged launch/synthetic smoke modes use a versioned host-internal PackagedSmokeResult contract with deterministic pass/fail and exit-code semantics. Smoke-only startup/completion capabilities are not part of NativeHost and are never exposed to world packages.  
D-IC-13 — Public/private world capability boundary: worlds may use only the explicitly designated public world-facing surface (VirtualWorld, WorldContext, WorldFrame, read-only ViewerState, viewport/root/assets/logger/host-info/settings contracts and approved equivalents). Tracking, estimation, calibration, filtering, projection/camera, NativeHost, application persistence, package-loader internals, application UI/state, and smoke-control capabilities are host-private with respect to worlds.  
D-IC-14 — World-package conformance: compilation or successful rendering alone does not establish API/conformance correctness. A world package must satisfy the World Package Conformance Specification and applicable reusable conformance suites; full World Viewer conformance additionally requires applicable packaged-runtime verification.  
D-IC-15 — Diagnostic reference world parity: the diagnostic room is subject to the same public world-facing contract as production worlds and receives no privileged camera/projection/tracking/native/persistence capability. It may be temporarily statically wired during early M0 only without widening the world API, and by the package-loading milestone it must use the production package path.  
D-IC-16 — World resource ownership: resources created by a world are world-owned unless an explicit public host contract says otherwise. dispose() is the world cleanup boundary, while host scene-root removal remains defense in depth and does not replace explicit disposal/unsubscription required by Three.js/browser/runtime semantics.  
D-IC-17 — World lifecycle failure isolation: failed initialization never enters update or becomes the successfully active world; update failure stops normal updates and enters the defined safe/recovery path; dispose failure is reported but does not prevent host-owned root removal and best-effort cleanup.

