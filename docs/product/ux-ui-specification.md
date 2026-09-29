# World Viewer

## Calibration UX/UI Specification

## Draft v0.1

# Document Status

Draft version: 0.1
Date: September 28, 2026
Artifact: Calibration UX/UI Specification
Status: Draft/readiness artifact for M0E2; pending stronger readiness review and not approved or frozen.

This first revision specifies the user-observable M0E calibration flow only. It does not attempt to define the complete future application UI, M0G settings/diagnostics, or a specialist camera-calibration product.

# 1. Product and interaction boundaries

The initial product uses one fixed integrated camera attached to the display. The user is the project owner, normally seated in front of the screen, and the flow must remain understandable without checkerboards, lens-calibration software, or computer-vision expertise.

The flow consumes and produces the existing display-profile and calibration-profile contracts. It does not reinterpret estimator math, expose estimator selection, or reopen estimator-intrinsic calibration. The normal runtime pipeline remains:

```text
RawViewerPose -> CalibrationTransform -> PoseFilter -> ViewerStateController
```

All physical dimensions and camera geometry shown to the user use millimeters and explicit physical directions. The UI must not hide units or rely on an unexplained sign convention when a direction can be named.

# 2. Entry and navigation

The host provides a clearly labeled route to start calibration and a visible route back to host controls from every calibration step. Back/cancel behavior must not trap the user in a camera or capture screen.

At entry, the flow works on a draft in-memory calibration session. Previously valid persisted profiles remain unchanged until the user completes a valid flow and confirms save. Leaving by Cancel discards the in-memory session without silently corrupting or replacing the previously valid persisted state.

The flow may show the current display/calibration profile values for confirmation. It must distinguish values loaded from an existing profile from values not yet saved in the current session.

# 3. Calibration flow

## 3.1 Display dimensions

The display step lets the user enter or confirm:

- physical display width in millimeters; and
- physical display height in millimeters.

The labels, fields, helper text, and validation messages explicitly say `mm`. Values must be finite and strictly positive. Empty, non-numeric, non-finite, zero, and negative values remain on the step with a specific correction message and cannot proceed.

The step does not invent an artistic perspective-strength range. The physically calibrated baseline remains `perspectiveStrength = 1.0`; any separately authorized artistic control is not part of this calibration flow's required input.

## 3.2 Fixed camera identity and preview

The camera step identifies the fixed integrated camera selected by the host and shows useful status, including the camera identity when available and whether capture is initializing, active, denied, unavailable, or failed.

The user can see a live transient camera preview while calibrating. Preview startup and permission handling are recoverable:

- permission denial explains the required permission and offers retry or a route back to host controls;
- unavailable hardware or an initialization failure identifies the failure, offers retry, and does not destroy a previously valid profile; and
- a stopped preview is not treated as a successful neutral-pose capture.

The initial product does not offer arbitrary external-camera selection or positioning. Camera capture width, height, and FPS may be displayed as status when known, but they are not required user-entered calibration values.

## 3.3 Camera-to-screen geometry

Where the current fixed-camera setup requires a user measurement, the flow allows the user to enter or confirm camera position relative to the screen coordinate system. Each value includes millimeter units and a physical direction label that matches the canonical screen-relative convention.

The instructions should say what is being measured physically, for example the camera's location relative to the screen plane and screen center, rather than presenting unexplained positive/negative signs. The reference integrated-camera setup may retain the established X-origin assumption where applicable; a measured Y offset may be supplied when required by the selected estimator/contract.

FOV is not a required input. The flow does not turn this step into a full camera-intrinsics workflow.

## 3.4 Neutral-pose capture

The neutral-pose step instructs the user to assume an ordinary seated neutral pose in front of the display. The capture represents the neutral cyclopean-eye position in canonical screen-relative millimeters.

The user must be able to:

- start and complete a neutral capture;
- see whether capture succeeded or failed;
- retry the capture without restarting the whole flow; and
- reset calibration-owned values safely.

The UI reports a capture result/status, not a false precision claim about physical ground truth. A failed or cancelled capture does not overwrite the last valid persisted profile. The flow does not expose or repeat estimator-intrinsic calibration.

## 3.5 Review and save

Before save, the flow presents a concise review of the display dimensions, fixed camera identity/status, camera geometry values used, and neutral-pose result. It indicates whether the values are valid and ready to save.

A valid completed flow creates or updates:

- one display profile; and
- one associated calibration profile.

Save goes through the approved narrow native-host persistence boundary. The UI reports success only after the persistence operation succeeds. Validation or atomic-write failure leaves the previously valid persisted state intact and gives the user a diagnosable retry/back route.

# 4. Reset, retry, cancel, and back behavior

These actions are intentionally distinct:

- `Retry neutral capture` repeats only the neutral-pose capture and keeps valid display/camera entries in the current draft.
- `Reset calibration values` clears or restores calibration-owned in-memory values to the documented defaults/reference values after an explicit confirmation. It does not silently delete the previously persisted valid profile.
- `Back` returns to the previous calibration step while retaining the current draft where safe.
- `Cancel` exits the flow and discards unsaved draft changes. It never silently writes a partial calibration.

The exact confirmation copy may be refined during UI implementation, but the state distinction must remain observable and deterministic.

# 5. Privacy and data handling

The camera preview is transient. Raw webcam images and video are not persisted by default. The calibration profile stores camera identity, geometry, neutral pose, estimator identity/parameters, and host correction values, not raw preview media.

If a future diagnostics feature intentionally records media, that requires separate product, privacy, and persistence authority; this flow does not create that behavior.

# 6. Engineering-only settings

One Euro parameters are engineering/tuning configuration for the M0E filter experiment and implementation. They are not normal user-facing calibration controls and must not appear as routine fields in this flow.

The flow also does not expose user-facing estimator selection or host model selection. The selected estimator identity is persisted as required by the calibration-profile contract, but selection remains an engineering/architecture boundary.

# 7. Failure and recovery requirements

The flow must remain usable after recoverable failures. Each failure state provides the smallest useful next action: retry capture/preview, correct invalid input, go back, cancel, or return to host controls. Failure handling must not turn a transient camera problem into deletion or corruption of a previously valid profile.

At no point may invalid user input create NaN/Infinity runtime geometry or enable Save. Persistence errors are reported separately from input errors so the user can distinguish correction from retry.

# 8. Explicitly out of scope

This revision excludes:

- checkerboard calibration;
- lens-distortion workflow;
- full camera-intrinsics workflow;
- arbitrary external-camera positioning;
- nonlinear pose-calibration controls;
- user-facing estimator selection;
- One Euro parameter-tuning UI; and
- general M0G settings/diagnostics UX except the safe access/back-navigation behavior required above.

# 9. Readiness status and implementation handoff

This is a draft/readiness artifact for M0E2. It has not received stronger review and is not approved or frozen merely because it has been authored. The next readiness review should determine whether this flow is sufficiently concrete for implementation without inventing product behavior. M0E2 remains blocked until that review establishes the repository's required readiness state.
