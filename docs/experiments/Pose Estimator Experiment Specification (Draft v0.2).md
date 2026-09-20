# Pose Estimator Experiment Specification

## Draft v0.2

# Document Status

Draft version: 0.2  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Pose Estimator Experiment Specification  
Applies to: Milestone 0D (M0D4–M0D8)

Upstream artifacts:  
• Interface & Contract Specification, Draft v0.6  
• Technical Design Specification, Draft v0.18  
• Testing Strategy, Draft v0.15  
• Milestone Roadmap, Draft v0.15  
• Oracle Registry Design, Draft v0.2  
• ADR-006 — Pose Estimator Selected by Measurement, Not Assumption

Purpose of this document:  
Freeze the baseline pose-estimator methods, shared inputs, calibration inputs, replay format, metric formulas, live hardware procedure, evidence layout, rerun rules, collection restrictions, and interpretation boundary before estimator implementation and live evidence collection begin.

This document is intentionally prescriptive. Its purpose is to remove design ambiguity from M0D4–M0D7 so those tasks can be executed by lower-cost models without silently redesigning the computer-vision experiment. Draft v0.2 also classifies the architecture-selecting experiment semantics as Class C oracle material and requires stronger review plus an explicit Oracle Registry freeze before ordinary implementation or evidence collection consumes them.

# 1\. Experiment Objective

The experiment determines whether either of two simple monocular estimators can provide a sufficiently stable and repeatable RawViewerPose for World Viewer on the reference ThinkPad E590.

The two baseline candidates are:  
• Estimator A — MediaPipe facial-transformation-matrix estimator  
• Estimator B — calibrated facial-scale/interocular estimator

The experiment does not evaluate final filtered ViewerState quality. M0D compares estimator-raw pose output before M0E host-level CalibrationTransform and One Euro filtering.

The experiment must answer:  
• Does each estimator produce finite, correctly oriented screen-relative millimeter output?  
• Is depth stable and repeatable across the normal seated range?  
• Are lateral and vertical movements represented consistently?  
• How often does each estimator produce null/unusable samples or discontinuities?  
• What estimator processing cost is added beyond MediaPipe inference?  
• How much estimator-specific calibration is required?  
• Is either candidate suitable to hand to M0E for host calibration and filtering?  
• If neither candidate is suitable, is escalation to a more complex method such as solvePnP justified?

# 2\. Non-Goals

M0D does not:  
• tune One Euro filter parameters  
• apply final host-level per-axis scale/offset correction  
• redesign the ViewerPoseSource or RawViewerPose contracts  
• introduce arbitrary camera-placement calibration  
• introduce camera lens-distortion calibration  
• introduce OpenCV/solvePnP as a baseline dependency  
• optimize world rendering  
• decide final motion-to-photon acceptance  
• store raw webcam imagery in evidence  
• use a weighted “winner score” that can hide an important failure mode

# 3\. Reference Hardware and Fixed Environment

Primary hardware:  
• Lenovo ThinkPad E590, model 20NB005RUS  
• Windows 11 Pro  
• integrated fixed webcam in the upper display bezel  
• 15.6-inch 1920 × 1080 internal display  
• approximate active display area: 345.4 mm × 194.3 mm

Environment rules:  
• use the packaged application/runtime path, not a browser-only substitute  
• use the same camera device and capture mode for all captures in one experiment run  
• record actual capture width, height, nominal FPS, and camera capabilities reported at runtime  
• keep the laptop lid angle unchanged for the complete run  
• keep lighting reasonably stable  
• do not change MediaPipe confidence thresholds or model asset between candidate comparisons  
• estimator input uses the unmirrored camera coordinate stream; a mirrored preview may be used only for UI presentation  
• do not crop, rotate, or rescale the estimator input differently between candidates

The experiment manifest must record every configuration value that can affect output.

# 4\. Canonical Coordinate System

The experiment uses the project-wide canonical screen-relative coordinate system:

• origin: center of the active display surface  
• \+X: viewer’s right  
• \+Y: up  
• \+Z: outward from the screen toward the viewer  
• screen plane: Z \= 0  
• viewer: normally Z \> 0  
• units: millimeters  
• pose reference point: cyclopean eye, the midpoint between the two eyes

Camera origin is represented in this same screen-relative space:

cameraOriginScreenMm \= {  
  x: measured lateral camera offset from screen center,  
  y: measured vertical camera offset from screen center,  
  z: measured camera displacement outward from the display plane  
}

For the integrated E590 camera, X is expected to be near zero and Y is above the active display. Values are measured/recorded rather than hard-coded.

Baseline M0D assumes the integrated camera optical axis is approximately aligned with the display normal. No camera rotation correction is fitted in M0D. If evidence shows this assumption creates unacceptable systematic cross-axis error, that becomes an explicit architecture/escalation finding rather than an ad hoc M0D7 adjustment.

# 5\. MediaPipe Input Contract for the Experiment

The tracking worker remains the owner of MediaPipe Face Landmarker. M0D estimators consume normalized TrackingObservation values rather than direct MediaPipe objects.

For this experiment, TrackingObservation must expose enough data to reconstruct both estimators from the same observation:

Required:  
• monotonic observation timestamp  
• source frame width and height  
• normalized face landmark coordinates needed for indices 33, 133, 362, and 263  
• facial transformation matrix when MediaPipe provides one  
• face-present / no-face state  
• worker/inference timing fields already available to the host  
• configuration/source identifiers needed to reproduce the run

Optional fields may be preserved, but estimator logic must not depend on undocumented fields not frozen by this specification.

The observation adapter is responsible for validating finite values and matrix shape before estimator code receives the sample.

# 6\. Canonical Face Model Provenance

Both estimators reference MediaPipe’s canonical face model so they use a common facial scale basis.

Pinned source:  
google-ai-edge/mediapipe canonical face model from the repository version associated with the pinned @mediapipe/tasks-vision/model assets used by World Viewer.

Implementation requirements:  
• pin or vendor the canonical face-model data needed by the estimator build/test tooling  
• record source version/commit or package/model version  
• record SHA-256 of the canonical model asset used to derive constants  
• derive constants programmatically where practical rather than manually transcribing approximate values  
• generated constants must have a test that documents their upstream source/hash

The default MediaPipe canonical face model defines its metric unit as one centimeter. The Face Geometry design describes the face-pose transformation as the map from canonical face coordinates to runtime metric face coordinates. The JavaScript Face Landmarker API exposes the facial transformation matrix but does not expose the virtual-camera intrinsics used internally; therefore Estimator A includes one empirical neutral-depth scale calibration rather than assuming the raw matrix translation is perfectly calibrated for the physical E590 camera.

# 7\. Cyclopean Eye Landmark Definition

For the baseline experiment, eye centers are derived from stable eye-corner landmarks rather than iris landmarks so the estimator does not depend on iris/refinement behavior.

Landmark indices:  
• eye A corners: 33 and 133  
• eye B corners: 362 and 263

For normalized runtime image landmarks:  
L \= (P33 \+ P133) / 2  
R \= (P362 \+ P263) / 2  
C \= (L \+ R) / 2

C is the runtime cyclopean image point used by Estimator B.

For the canonical 3D face model:  
LC \= (P33C \+ P133C) / 2  
RC \= (P362C \+ P263C) / 2  
CC \= (LC \+ RC) / 2

CC is the canonical 3D cyclopean point transformed by Estimator A.

Canonical inter-eye-center distance:  
DcanonMm \= distance(LC, RC) × 10

The implementation must derive CC and DcanonMm from the pinned canonical model and store the derived values with source provenance. Do not substitute a generic human IPD constant when the canonical model value is available.

# 8\. Common Estimator Calibration Capture

Both estimators use one shared neutral calibration capture before evaluation trials.

Reference position:  
• target viewer depth from screen plane: ZrefScreenMm \= 600 mm  
• lateral target: centered as naturally as practical  
• vertical target: normal seated eye height  
• calibration capture duration: 3 seconds  
• settle time before capture: 2 seconds

The user measures/positions the cyclopean eye approximately 600 mm from the screen plane. The runner records the stated reference depth and cameraOriginScreenMm.

Camera-relative reference depth:  
ZrefCameraMm \= ZrefScreenMm \- cameraOriginScreenMm.z

Rules:  
• ZrefCameraMm must be finite and \> 0  
• the same calibration observation trace is used to derive both estimator calibrations  
• calibration is performed once per experiment run, not once per trial  
• calibration is not recomputed because later evidence looks poor  
• calibration trace is retained as part of the evidence bundle  
• evaluation trials are separate from the calibration capture

The 600 mm target is the Draft v0.2 proposed baseline. It becomes frozen only after the Class C review/freeze gate in Section 27 passes. Any material change after freeze requires a new experiment-procedure version before new evidence is collected.

# 9\. Estimator A — Facial Transformation Matrix

Estimator ID:  
mediapipe-facial-transform-v1

Input:  
• 4 × 4 facial transformation matrix M  
• canonical cyclopean point CC  
• cameraOriginScreenMm  
• Estimator-A neutral calibration scale

Matrix handling:  
The adapter must reconstruct the 4 × 4 matrix using the MediaPipe matrix container’s explicit row/column metadata and a unit test against a known upstream sample. Do not silently transpose the matrix to make results “look right.”

Canonical-to-runtime point:  
pRuntime \= M × \[CC.x, CC.y, CC.z, 1\]

MediaPipe Face Geometry metric space places the virtual camera at the origin looking toward negative Z. World Viewer screen-relative \+Z points toward the viewer. Therefore the baseline axis conversion is:

rawRelMm.x \= 10 × pRuntime.x  
rawRelMm.y \= 10 × pRuntime.y  
rawRelMm.z \= \-10 × pRuntime.z

Neutral depth calibration:  
Let zMedianRaw be the median rawRelMm.z across valid calibration samples.

scaleA \= ZrefCameraMm / zMedianRaw

The scale is uniform across X/Y/Z. M0D must not fit independent per-axis scales for Estimator A.

Calibrated estimator-relative point:  
relMm \= rawRelMm × scaleA

Screen-relative RawViewerPose:  
positionMm \= cameraOriginScreenMm \+ relMm

Invalid result conditions:  
• transformation matrix missing  
• matrix not 4 × 4  
• any required matrix/canonical/result value non-finite  
• pRuntime homogeneous result invalid  
• zMedianRaw non-finite or ≤ 0 during calibration  
• per-frame resulting Z ≤ 0

A per-frame invalid result returns null with a machine-readable reason; it is not clamped or repaired.

Rationale:  
The uniform one-point scale compensates for mismatch between MediaPipe’s internal virtual-camera assumptions and the physical webcam without hiding axis-specific or nonlinear estimator errors that the experiment is intended to measure.

# 10\. Estimator B — Facial Scale / Interocular

Estimator ID:  
interocular-scale-v1

Input:  
• normalized landmarks 33, 133, 362, 263  
• source frame width W and height H  
• canonical inter-eye-center distance DcanonMm  
• cameraOriginScreenMm  
• neutral calibration trace

Convert the four required normalized landmarks to pixel coordinates.

Left/right eye centers:  
Lpx \= (P33px \+ P133px) / 2  
Rpx \= (P362px \+ P263px) / 2

Cyclopean image point:  
Cpx \= (Lpx \+ Rpx) / 2

Observed inter-eye-center pixel distance:  
dPx \= EuclideanDistance(Lpx, Rpx)

Calibration:  
dRefPx \= median(dPx) across valid neutral calibration samples

Effective focal length:  
fEffPx \= (dRefPx × ZrefCameraMm) / DcanonMm

Principal point baseline:  
cx \= W / 2  
cy \= H / 2

Per-frame depth:  
ZcamMm \= (fEffPx × DcanonMm) / dPx

Equivalent depth form:  
ZcamMm \= (dRefPx × ZrefCameraMm) / dPx

Per-frame lateral/vertical position relative to camera:  
XcamMm \= (Cpx.x \- cx) × ZcamMm / fEffPx  
YcamMm \= \-(Cpx.y \- cy) × ZcamMm / fEffPx

Screen-relative RawViewerPose:  
positionMm.x \= cameraOriginScreenMm.x \+ XcamMm  
positionMm.y \= cameraOriginScreenMm.y \+ YcamMm  
positionMm.z \= cameraOriginScreenMm.z \+ ZcamMm

Assumptions:  
• square pixels / one effective focal length for the baseline  
• image principal point at frame center  
• camera axis approximately normal to the screen  
• canonical inter-eye distance approximates the user’s facial scale sufficiently for a raw baseline; M0E may later correct measured per-axis scale/offset

Invalid result conditions:  
• any required landmark missing/non-finite  
• W or H invalid  
• dPx ≤ 0  
• dRefPx ≤ 0  
• DcanonMm ≤ 0  
• fEffPx ≤ 0  
• resulting position non-finite or Z ≤ 0

Invalid samples return null with a machine-readable reason. No temporal smoothing is applied in M0D.

# 11\. Shared-Observation Comparison Requirement

Estimator A and Estimator B must be evaluated from the same captured TrackingObservation records whenever possible.

Preferred flow:  
camera → MediaPipe worker → normalized TrackingObservation trace → estimator A replay \+ estimator B replay

This avoids comparing two different head movements as though they were the same experiment.

The live runner may compute both estimators during capture for immediate diagnostics, but the authoritative comparison metrics are regenerated from the saved normalized observation trace through the deterministic replay harness.

If a trace lacks information required by one candidate, the trace is invalid for comparative evidence and must be flagged by the evidence validator.

# 12\. Trace Record Format

The evidence trace should preserve the minimum normalized information required to reproduce both candidates without storing webcam imagery.

Each observation record must include:  
• schemaVersion  
• sequence number  
• timestampMs  
• frameWidthPx  
• frameHeightPx  
• faceDetected  
• landmarks 33, 133, 362, 263 with normalized x/y/z  
• 4 × 4 facial transformation matrix or null  
• available worker/inference timing fields  
• capture/test segment identifier

Each replay output record must include:  
• schemaVersion  
• timestampMs  
• estimatorId  
• estimatorConfigId/hash  
• valid boolean  
• positionMm when valid  
• invalidReason when invalid  
• estimatorProcessingMs

Format:  
newline-delimited JSON (JSONL/NDJSON) is preferred for traces so large runs can be streamed and diffed without loading the complete file into memory.

Raw webcam frames are not part of the standard evidence bundle.

# 13\. Metric Definitions

All comparison metrics are computed by M0D6 tooling. M0D7 does not calculate them manually.

Stationary axis RMS jitter:  
For valid samples a\_i on one axis:  
mean \= average(a\_i)  
rms \= sqrt( average( (a\_i \- mean)^2 ) )

Report X, Y, and Z separately.

Trial median pose:  
For each stationary hold, calculate the median valid X, Y, and Z.

Repeatability RMS:  
For repeated trials at the same target, let m\_j be each trial median and G be the median of trial medians:  
repeatabilityRms \= sqrt( average( (m\_j \- G)^2 ) )

Reference error:  
When the target has a known physical coordinate/delta:  
error \= estimated trial median \- reference target  
Report signed error and absolute error.

Relative movement error:  
For lateral/vertical tests, compare the median displacement from the neutral hold to the prescribed displacement. This is preferred over absolute X/Y position when the neutral seated eye height/offset is difficult to measure precisely.

Cross-axis drift:  
For a prescribed single-axis target change, report the median change observed on each non-commanded axis relative to the associated neutral hold.

Valid rate:  
validRate \= validEstimatorSamples / faceDetectedObservationSamples

Null rate:  
nullRate \= nullEstimatorSamples / faceDetectedObservationSamples

Robust stationary outlier:  
For each stationary trial/axis:  
medianAxis \= median(a)  
MAD \= median(|a \- medianAxis|)  
robustSigma \= 1.4826 × MAD  
If MAD \> 0, flag a sample on that axis when |a \- medianAxis| \> 6 × robustSigma.  
A sample is an outlier sample if any axis is flagged.  
Report count/rate; do not delete flagged samples from other metrics.

Discontinuity summary:  
For consecutive valid poses, calculate Euclidean sample-to-sample step distance in millimeters and report median, p95, p99, and maximum. No sample is discarded based on this metric.

Estimator processing:  
Measure estimator-only duration around estimate() using the same high-resolution monotonic timer. Report median and p95.

Pose update cadence:  
Report valid pose count divided by test elapsed seconds and also report source observation cadence.

Calibration burden:  
Record number of manual measurements/inputs, required calibration capture time, and any candidate-specific steps. This is descriptive evidence, not a hidden score.

# 14\. Structural Failure Flags

The evidence tooling may mark structural failures, but it must not choose a winner.

Hard structural failure conditions:  
• estimator returns a non-finite position as valid  
• calibration cannot produce a finite positive required scale/focal value  
• coordinate direction repeatedly contradicts the canonical convention  
• near/neutral/far depth ordering is repeatedly reversed under valid captures  
• candidate cannot be replayed from the frozen TrackingObservation format  
• implementation requires changing the frozen experiment method to function

Directional checks:  
• left target should decrease X relative to neutral  
• right target should increase X  
• up target should increase Y  
• down target should decrease Y  
• near-screen target (450 mm) should have smaller Z than neutral (600 mm)  
• far target (750 mm) should have larger Z than neutral

A single procedural mistake does not create a structural failure. The evidence record must distinguish a procedurally invalid trial from estimator behavior.

# 15\. Live Test Matrix

All scenarios are captured once as normalized observations and replayed through both estimators.

Calibration capture:  
• target Z: 600 mm from screen plane  
• settle: 2 seconds  
• capture: 3 seconds  
• count: 1

Neutral stationary:  
• target Z: 600 mm  
• settle before each trial: 2 seconds  
• capture: 5 seconds  
• trials: 5

Near stationary:  
• target Z: 450 mm  
• settle: 2 seconds  
• capture: 5 seconds  
• trials: 3

Far stationary:  
• target Z: 750 mm  
• settle: 2 seconds  
• capture: 5 seconds  
• trials: 3

Left/right movement:  
• Z target: approximately 600 mm  
• lateral targets: approximately \-150 mm, neutral, \+150 mm relative to the neutral cyclopean position  
• cycles: 3  
• each target hold: 2 seconds  
• natural transitions are captured and segment markers identify target holds

Up/down movement:  
• Z target: approximately 600 mm  
• vertical targets: approximately \-100 mm, neutral, \+100 mm relative to neutral eye position  
• cycles: 3  
• each target hold: 2 seconds  
• natural transitions are captured

Approach/retreat:  
• depth sequence: 450 → 600 → 750 → 600 → 450 mm  
• cycles: 3  
• each target hold: 2 seconds  
• transitions captured continuously

Natural seated motion:  
• normal slow head movement within intended viewing range  
• duration: 30 seconds

Partial visibility / head turn:  
• remain near neutral position  
• rotate head naturally left/right to approximately 25–30 degrees without intentionally translating  
• duration: 15 seconds  
• purpose: measure null/outlier behavior, not infer precise ground-truth pose

Processing/cadence run:  
• remain in normal viewing range with light natural movement  
• duration: 60 seconds  
• purpose: inference cadence, estimator processing time, valid/null rates, backlog/replacement counters

Draft v0.2 retains the proposed target positions for the first experiment procedure. They become frozen only after the Class C review/freeze gate in Section 27 passes. Any deliberate material change after freeze increments experimentProcedureVersion and is documented before new evidence is collected.

# 16\. Physical Reference and Operator Tolerance

The test is intended to be repeatable without specialized motion-capture equipment.

Reference setup may use:  
• tape measure from screen plane for 450/600/750 mm depth targets  
• marked chair/floor positions  
• simple lateral/vertical visual reference marks  
• ruler/tape measurement for camera offset from screen center

The operator should aim for:  
• depth target within approximately ±20 mm  
• lateral/vertical target displacement within approximately ±20 mm

These tolerances are recorded as limitations; the experiment must not pretend manual positioning is laboratory-grade ground truth.

Stationary jitter and repeatability metrics do not depend on perfect absolute ground truth and therefore remain high-value measurements even when target placement has small error.

# 17\. M0D7 Runner Behavior

The live evidence runner must guide the user through the fixed procedure so the M0D7 model does not invent test timing.

Each step should display:  
• scenario name  
• target position/instruction  
• trial/cycle number  
• required settle countdown  
• capture countdown/duration  
• current camera/estimator experiment configuration  
• completion or procedural-error state

Example flow:  
Scenario: Neutral stationary  
Trial: 3 of 5  
Target: approximately 600 mm from screen plane, normal centered seated pose  
Settle: 2...1...  
Capture: 5.0 seconds  
Complete

The runner writes segment markers automatically. The operator/model does not manually edit timestamps afterward.

# 18\. M0D7 Restrictions

M0D7 is evidence execution, not experiment design.

M0D7 must not:  
• modify estimator equations  
• change canonical landmark definitions  
• change candidate calibration formulas  
• change MediaPipe model/confidence settings mid-run  
• change test duration or target positions  
• change metric formulas  
• apply temporal filtering to make output look better  
• remove poor/null/outlier samples  
• rerun because a result appears unfavorable  
• tune either estimator  
• rank the candidates  
• recommend a production candidate  
• decide to add solvePnP/OpenCV

If collection is blocked by a worker/runtime/harness defect, stop the affected procedure and escalate that defect to Terra-Medium. Resume collection only after the defect is fixed and the evidence run is restarted or explicitly versioned as required.

# 19\. Procedural Invalidation and Rerun Rules

A trial may be marked procedurally invalid and rerun only when one of the following occurs:  
• wrong test scenario/configuration loaded  
• wrong camera device/capture mode used  
• capture failed to start or file is incomplete/corrupt  
• application/worker crashed  
• operator moved before a stationary capture when the runner indicated settling was complete  
• target position was known to be materially wrong before/during capture  
• evidence validator identifies missing required fields  
• external interruption clearly invalidates the trial

A poor estimator result is not a rerun reason.

The original invalid record should be retained or referenced in the anomaly log where practical. The replacement trial receives a new attempt identifier rather than silently overwriting history.

# 20\. Evidence Directory Layout

Repository root:

evidence/  
  m0d/  
    estimator-experiment-v1/  
      run-\<timestamp\>/  
        manifest.json  
        environment.json  
        camera.json  
        calibration/  
          observation-trace.jsonl  
          candidate-a.json  
          candidate-b.json  
        observations/  
          \<scenario\>-\<trial\>.jsonl  
        estimator-a/  
          outputs/  
          summary.json  
        estimator-b/  
          outputs/  
          summary.json  
        metrics/  
          comparison-inputs.json  
          scenario-summary.json  
        anomalies.json  
        procedural-invalidations.json  
        validation.json  
        m0d8-review.json

Required manifest fields include:  
• experimentSpecVersion  
• experimentProcedureVersion  
• application build/commit  
• MediaPipe package/model version  
• canonical model source/hash  
• camera configuration  
• display profile  
• cameraOriginScreenMm  
• estimator IDs/config hashes  
• run start/end timestamps

Large unsuitable artifacts may be referenced rather than committed, but the standard normalized observation traces should be kept compact enough to remain source-controlled whenever practical.

# 21\. Evidence Bundle Validation

The validator must fail the M0D7 handoff when:  
• required manifest/environment/config files are missing  
• calibration trace is missing  
• required scenarios/trials are missing without explicit procedural invalidation  
• trace schema versions are unsupported  
• frame dimensions/camera configuration change unexpectedly within a run  
• candidate config/hash changes mid-run  
• required numeric values are non-finite  
• output trace sequence/timestamps are invalid  
• an estimator result claims valid=true without a finite position  
• summary metrics cannot be regenerated from saved traces  
• both candidates were not evaluated from the same authoritative observation traces  
• anomaly/procedural-invalidity references are internally inconsistent

validation.json must state:  
• validator version  
• evidence schema version  
• checks performed  
• pass/fail  
• failures/warnings  
• files/trials included

M0D8 must not begin until validation passes.

# 22\. M0D8 Interpretation Rules

M0D8 is performed with Sol-High after evidence validation.

Inputs:  
• this experiment specification  
• validated evidence bundle  
• M0D6 metric definitions/results  
• relevant NFRs  
• anomaly/procedural-invalidity records  
• implementation notes only when needed to explain a measured anomaly

Decision method:  
Do not use a single weighted score.

First, identify structural failures.  
For candidates without structural failure, compare:  
1\. depth repeatability and raw Z jitter across 450/600/750 mm  
2\. lateral/vertical repeatability and movement-direction consistency  
3\. cross-axis drift and pose-dependent/nonlinear error  
4\. null/outlier/discontinuity behavior  
5\. robustness under natural motion/head turn  
6\. estimator processing cost  
7\. calibration burden  
8\. absolute bias/scale error

Interpretation rule:  
A stable affine bias is less concerning than nonlinear, pose-dependent, or discontinuous behavior because M0E is explicitly allowed to apply measured per-axis scale \+ offset. M0D8 must not use that fact to excuse errors that cannot reasonably be corrected by the approved M0E model.

If both candidates are viable and materially similar, prefer the simpler method with lower calibration burden and fewer hidden assumptions.

If neither is viable, do not force a winner. Document why and recommend the smallest next experiment/escalation.

# 23\. ADR-006.01 Handoff

If M0D8 supports a production estimator, its review must contain enough evidence to create:

ADR-006.01 — Production Pose Estimator Selection

Minimum ADR evidence:  
• candidate methods compared  
• experiment spec/procedure versions  
• evidence run ID  
• principal metrics  
• important anomalies/limitations  
• why selected candidate is adequate  
• why rejected candidate is not preferred  
• calibration burden  
• expected M0E correction/filtering still required  
• whether solvePnP/OpenCV remains deferred

If no candidate is accepted, ADR-006 remains unsuperseded until a later evidence-backed decision is made.

# 24\. M0D → M0E Handoff

Before M0E begins, M0D must provide:  
• selected or explicitly provisional ViewerPoseEstimator  
• estimator ID/version/configuration  
• estimator-intrinsic calibration parameters  
• canonical RawViewerPose output in screen-relative millimeters  
• representative stationary RawViewerPose traces  
• representative natural-motion RawViewerPose traces  
• candidate evidence summary  
• known limitations/biases  
• M0D8 review result  
• ADR-006.01 when selection is accepted

M0E must not reinterpret MediaPipe landmarks or redesign estimator computer-vision math. M0E applies the approved host-level CalibrationTransform and PoseFilter downstream of this boundary.

# 25\. Class C Oracle Review and Model / Reasoning Allocation

Oracle classification:  
The estimator-comparison definition is architecture-critical because its results can select or reject the production pose-estimation approach under ADR-006. The parts of this specification that define what constitutes a valid comparison therefore contain Class C oracle material.

Class C oracle material includes, at minimum:  
• the estimator A/B reference methods and formulas, including coordinate/frame/unit interpretation and estimator-intrinsic calibration inputs  
• the required shared observation inputs needed to make both estimators comparable  
• the metric formulas and any structural-failure definitions used to judge estimator behavior  
• the live test matrix, target positions, physical/operator tolerances, run timing, invalid-run rules, and rerun rules  
• the evidence fields/validation rules whose presence or interpretation determines whether comparison evidence is complete and comparable  
• the M0D8 interpretation rules that can support selection, rejection, or architecture escalation

Routine implementation details that merely encode an already-frozen formula/schema/procedure are not promoted to Class C by themselves. Harness boilerplate, serialization plumbing, CLI/output formatting, and deterministic replay mechanics may be implemented by Luna/Terra after the governing Class C semantics are frozen.

Pre-freeze review requirement:  
• before M0D4, M0D5, M0D6, or M0D7 consumes this experiment definition, the Class C oracle material must receive stronger-reasoning review  
• Sol-High is the default planning assumption for that review unless Logan performs equivalent direct review or another approved planning artifact records an equivalent stronger-review path  
• the stronger review evaluates definition validity: formulas, coordinate/units interpretation, comparison fairness, metric meaning, target/tolerance practicality, invalid-run treatment, and the ability of the procedure to support ADR-006 without hidden tuning or post-hoc criterion changes  
• the stronger reviewer does not need to author ordinary harness boilerplate  
• any material issue found by review is corrected in this specification before freeze; implementation does not begin against a known-defective oracle

Freeze record:  
Before ordinary implementation/evidence collection begins, the approved Class C experiment must be represented by one or more current ORC-\* records in docs/testing/oracle-registry.md. The registry record(s) must identify this specification/revision as a governing source, the applicable Class C classification, approved review result/owner, frozen baseline, authoritative procedure/tests where available, and oracle-change authority.  
Publishing Draft v0.2 is not itself the freeze event. The oracle becomes consumable only after the required review is approved and the applicable ORC-\* record(s) are marked frozen.

Planned execution after oracle freeze:  
M0D4 — Estimator A implementation  
• Terra — Medium  
• adapt the exact frozen method in this specification  
• do not alter method/calibration formulas, coordinate semantics, or acceptance interpretation inside implementation

M0D5 — Estimator B implementation  
• Terra — Medium  
• adapt the exact frozen method in this specification  
• do not alter method/calibration formulas, coordinate semantics, or acceptance interpretation inside implementation

M0D6 — Replay/metrics/evidence tooling  
• Luna — Medium  
• implement deterministic schemas, replay, frozen metric formulas, evidence generation, and validator behavior  
• tooling may expose defects or ambiguities but may not repair them by changing a frozen formula, metric, validity rule, or procedure

M0D7 — Scripted live evidence collection  
• Luna — Medium  
• execute the frozen procedure, preserve evidence, validate completeness  
• Terra — Medium only if collection is blocked by a runtime/harness integration failure  
• no threshold, target, timing, metric, invalid-run, or candidate-method change is permitted because observed evidence is inconvenient

M0D8 — Evidence interpretation and estimator decision  
• Sol — High  
• compare the validated evidence against the frozen experiment definition, diagnose limitations, and determine ADR/escalation consequence  
• if evidence reveals that the frozen oracle itself may be invalid, stop and escalate; do not retroactively change the collection oracle and continue treating old/new evidence as equivalent

The model executing M0D4–M0D7 must not broaden scope because it believes another estimator/calibration method would be better. Proposed experiment changes return to oracle/design review rather than being silently implemented.

# 26\. Technical Reference Notes

MediaPipe reference basis used to design Draft v0.2:

1\. MediaPipe Face Landmarker options document that facial transformation matrices can be requested and are intended to transform the canonical face to the detected face:  
https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/FaceLandmarkerOptions

2\. MediaPipe Face Geometry / Face Mesh documentation describes:  
• normalized screen landmark semantics  
• right-handed metric 3D face space  
• canonical face model metric unit of centimeters  
• face pose transformation as canonical-to-runtime mapping:  
https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/face\_mesh.md

3\. MediaPipe face\_geometry.proto documents the face pose transform as a 4 × 4 transform containing uniform scale, rotation, and translation:  
https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face\_geometry/protos/face\_geometry.proto

4\. MediaPipe Face Landmarker implementation exposes face geometry pose transform matrices through the task result:  
https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/cc/vision/face\_landmarker/face\_landmarker.cc

5\. Known JavaScript API limitation: the Face Landmarker public API does not expose the virtual-camera intrinsics used to produce the transformation matrix. This is why Estimator A uses a recorded one-point neutral depth scale instead of assuming exact physical calibration:  
https://github.com/google-ai-edge/mediapipe/issues/5945

These references define the baseline method; implementation should pin exact dependency/model versions and retain relevant source/version provenance in evidence.

# 27\. Draft v0.2 Review / Oracle Freeze Conditions

Draft v0.2 is the governance-reconciled experiment definition. It preserves the v0.1 baseline methods/procedure unless an item below explicitly says otherwise; the new requirement is that architecture-critical experiment semantics receive stronger review and a recorded Class C freeze before implementation or evidence collection consumes them.

Before M0D4–M0D7 begin, confirm all technical prerequisites:  
• landmark indices and canonical-model extraction script produce finite plausible CC and DcanonMm  
• facial transformation matrix layout/handedness adapter is validated against upstream data  
• actual E590 camera capture mode is recorded  
• cameraOriginScreenMm measurement fields exist  
• 600/450/750 mm depth targets are practical  
• ±150 mm lateral and ±100 mm vertical target displacements are practical  
• normalized observation trace contains everything required by both estimators  
• evidence validator schema/version is agreed  
• no unresolved contract conflict exists with the Interface & Contract Specification

Before freeze, complete the Class C review:  
• identify the Class C material in Sections 6–22 that can select/reject the production estimator or materially affect evidence validity/comparability  
• stronger-review the candidate methods/formulas, coordinate and unit interpretation, shared inputs, metric formulas, structural-failure meaning, live test matrix, target/tolerance practicality, evidence-validity rules, rerun rules, and M0D8 interpretation boundary  
• record the reviewer/owner and result; default planning assumption is Sol-High unless Logan performs equivalent direct review or another approved review path is recorded  
• resolve every material review finding in the specification before freeze  
• where practical, retain an independent cross-check/reference for high-risk mathematical interpretation rather than using the production implementation as its own oracle  
• explicitly document known limitations and conditions that make a run procedurally invalid

Freeze conditions:  
• one or more applicable ORC-\* records exist in docs/testing/oracle-registry.md  
• Review status is approved for the required Class C review  
• Freeze status is frozen  
• the frozen baseline identifies the reviewed specification/procedure version and implementation baseline as applicable  
• oracle change authority is explicit and is normally none for M0D4–M0D7 implementation tasks  
• M0D4–M0D7 task specifications cite the applicable ORC-\* record(s) and may not begin while the required record is draft, pending, superseded, retired, stale, or contradictory

Procedure/version discipline:  
• Draft v0.2 does not by itself change experimentProcedureVersion merely because governance text was added  
• any stronger-review finding that changes a candidate formula, required input, metric formula, target/tolerance, live procedure, invalidation/rerun rule, evidence-validity requirement, or interpretation criterion must be incorporated before freeze and must increment experimentProcedureVersion when it changes the actual experiment procedure/evidence comparability  
• after freeze, any material oracle/procedure change requires a new reviewed specification/procedure version and corresponding Oracle Registry update/supersession before new evidence is collected  
• evidence produced under different material experimentProcedureVersion values must never be mixed as though the procedures were identical  
• M0D8 may recommend a new experiment version if the frozen procedure proves inadequate, but it must preserve and interpret the completed evidence under the version that actually produced it

Only after these technical checks, stronger Class C review, and Oracle Registry freeze are complete is the experiment implementation-approved for M0D4–M0D7.

