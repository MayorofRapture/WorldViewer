# World Viewer

## Product Specification / Product Requirements Document

## Draft v0.2

# Document Status

Draft version: 0.2  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Product Specification / Product Requirements Document (PRD)  
Upstream artifact: World Viewer — Project Vision & Charter, Draft v0.2

This second working product specification incorporates the resolved startup, full-screen, display-profile, world-settings, package-directory, camera-preview, tracking-loss, and diagnostic-export decisions. It translates the approved charter into product behavior, scope, and traceable product requirements while leaving detailed implementation contracts, numerical performance thresholds, UI layouts, and persistence schemas to later artifacts.

# 1\. Product Summary

World Viewer is a Windows desktop application that makes a conventional laptop display behave like a head-tracked window into a virtual world.

The application uses the laptop’s fixed integrated webcam to observe a single viewer, estimates that viewer’s position relative to the physical screen, and updates the rendered perspective so that moving the viewer’s head changes what is visible through the display as though the display were a real opening into another space.

World Viewer is a host platform rather than a single simulation. The fishtank is one intended world, but the product must support independently contained worlds such as an ant farm, miniature room, landscape, 2.5D painting, or other interactive scene without requiring changes to the core tracking and projection behavior.

# 2\. Target User and Usage Context

The sole intended user is the project owner. The product does not need account management, multi-user profiles, cloud synchronization, marketplace distribution, onboarding for a broad consumer audience, or remote administration.

The initial operating context is a Lenovo ThinkPad E590 running Windows 11 with its integrated webcam fixed above the internal display. The user is normally seated or standing directly in front of the laptop at a conventional viewing distance.

World Viewer is intended to be used locally and offline. New worlds may be created and added over time by the project owner as separate self-contained packages.

# 3\. Product Goals

G-01 — Create a convincing “window into another world” illusion using a conventional display and webcam.

G-02 — Keep head tracking, calibration, viewer pose, filtering, and projection reusable across many different worlds.

G-03 — Allow different 3D and 2.5D worlds to be added without redesigning the core engine.

G-04 — Operate fully offline during normal use.

G-05 — Keep setup and calibration simple enough that the single intended user can configure the system without a specialist camera-calibration workflow.

G-06 — Reuse mature libraries and proven algorithms rather than building unnecessary custom rendering, tracking, filtering, asset, or simulation infrastructure.

G-07 — Keep the architecture sufficiently modular, strongly typed, and testable that most implementation work can be delegated safely to Luna and Terra once interfaces and tests are defined.

G-08 — Provide enough diagnostics to distinguish tracking, pose-estimation, calibration, projection, rendering, and world-specific problems during development.

# 4\. Product Non-Goals

NG-01 — World Viewer is not a general-purpose game engine.

NG-02 — World Viewer is not a VR-headset or stereoscopic display platform.

NG-03 — The initial product does not support multiple simultaneous tracked viewers.

NG-04 — The initial product does not support arbitrary external camera placement. The fixed integrated camera above the laptop display is the reference geometry.

NG-05 — The product does not require a world marketplace, public plugin ecosystem, installer for third-party worlds, or nontechnical world-authoring workflow.

NG-06 — The product does not require cloud services, accounts, telemetry, remote storage, or network-delivered runtime assets.

NG-07 — The core engine does not provide fish AI, ant simulation, physics, ECS, water simulation, or other world-specific systems unless a later cross-world requirement proves they belong in the platform.

NG-08 — Milestone 0 does not deliver a polished fishtank. It proves the virtual-window experience and supporting engine assumptions.

# 5\. Product Principles

P-01 — Physical window behavior first. Correct screen-relative perspective is more important than visual complexity.

P-02 — Engine owns the viewer. Worlds may read viewer state for reactive behavior, but worlds must not own or directly manipulate the head-tracked projection camera.

P-03 — Reuse before invention. Before implementing a subsystem, determine whether a mature dependency, official sample, licensed reference implementation, or established algorithm already solves it.

P-04 — Offline means offline. Normal runtime behavior must not require a network connection.

P-05 — Simple calibration first. Add calibration complexity only when measured accuracy requires it.

P-06 — Thin platform. Do not add large frameworks or abstractions without a demonstrated product need.

P-07 — Deterministic development. Core behavior should be testable with simulated viewer input and recorded fixtures, not only a live camera.

P-08 — Package boundaries matter. A world should be replaceable without changing the tracking/projection core, and the core should be maintainable without knowing the internals of any specific world.

# 6\. Product Scope

The first complete product scope contains five user-visible capability areas:

• World viewing — render one selected virtual world using viewer-dependent perspective.  
• World selection — choose among locally available self-contained world packages.  
• Display and calibration settings — configure the physical display geometry and the minimum calibration data needed for tracking.  
• Tracking and perspective controls — use the integrated webcam, show tracking status, recover from tracking loss, and optionally adjust artistic perspective strength.  
• Diagnostics — expose enough runtime information to validate camera input, tracking, pose estimation, projection, and rendering during development.

World-specific creation tools are not part of the World Viewer application. Worlds are developed as separate software packages and then made available to the host application.

# 7\. Core User Flows

UF-01 — Launch and view a world  
The user launches World Viewer, the application loads local configuration and available world packages from the configured local package directory, initializes the integrated camera and tracking pipeline, restores the last active world when it is still available, and enters full-screen world viewing by default. If the last active world is unavailable or fails to load, the application falls back to a safe world-selection/error state. Once tracking is valid, head movement changes perspective continuously.

UF-02 — Select another world  
The user opens the world selector, chooses another installed local world package, and World Viewer cleanly disposes the current world and activates the new one without restarting the application.

UF-03 — Configure display geometry  
The user opens Settings and manually enters or edits the physical visible display width and height. The application validates and stores the values locally.

UF-04 — Perform simple calibration  
The user completes a deliberately minimal calibration workflow sufficient to establish the reference relationship between webcam tracking and screen-relative viewer position. The workflow should avoid full camera-intrinsic calibration unless later measurements prove it necessary.

UF-05 — Adjust perspective strength  
The user may leave perspective at the physically calibrated baseline or apply an artistic strength adjustment. Perspective strength is stored globally per display profile rather than per world, and the control must be reversible to the physically calibrated baseline.

UF-06 — Recover from tracking loss  
If tracking is lost, World Viewer avoids an abrupt projection jump and smoothly returns the view toward the calibrated neutral pose. When tracking becomes reliable again, the application blends smoothly from neutral/current pose back to the tracked viewer position.

UF-07 — Diagnose or export a problem  
The user enables diagnostics and can inspect camera/tracking state, viewer pose, confidence/status, frame/update rates, current display profile, active world, and projection-relevant state without modifying the world package. The user can export a local machine-readable diagnostic bundle designed to be easy to provide to an AI/agent for troubleshooting.

# 8\. Functional Product Requirements

The requirements in this section are product-level requirements. Exact APIs, algorithms, data schemas, thresholds, and UI layouts will be specified later.

## 8.1 Application and Platform

FR-APP-001 — World Viewer shall support Windows as its only required operating system for the initial product.

FR-APP-002 — World Viewer shall be able to run as a packaged desktop application without requiring a development server.

FR-APP-003 — World Viewer shall support a full-screen viewing mode appropriate for the virtual-window illusion and shall provide a reliable way to exit or return to application controls.

FR-APP-004 — World Viewer shall load all required runtime code, models, WASM, configuration, and world assets from local storage.

FR-APP-005 — World Viewer shall not require a user account, sign-in, cloud connection, or remote service to launch or use installed worlds.

## 8.2 Camera and Tracking

FR-TRK-001 — World Viewer shall use the integrated laptop webcam as the initial supported tracking camera.

FR-TRK-002 — The initial product shall assume the camera is fixed relative to the laptop display and located in the upper display bezel.

FR-TRK-003 — World Viewer shall enumerate or inspect the actual camera capture settings available at runtime rather than assuming undocumented field-of-view or frame-rate values.

FR-TRK-004 — World Viewer shall detect and track a single viewer sufficiently to derive a screen-relative viewer pose.

FR-TRK-005 — World Viewer shall expose tracking state at minimum as unavailable/not initialized, acquiring, tracked, low-confidence/degraded, and lost or equivalent states.

FR-TRK-006 — Tracking loss shall not cause an abrupt camera/projection jump; the view shall transition smoothly toward the calibrated neutral pose.

FR-TRK-007 — Reacquisition shall blend smoothly from the neutral/current pose back to the tracked viewer position.

FR-TRK-008 — Webcam frames and tracking data shall remain local during normal operation.

FR-TRK-009 — Live-camera input shall be replaceable in development by a deterministic simulated viewer source so that projection and world behavior can be tested without a webcam.

## 8.3 Viewer Pose and Projection

FR-VIEW-001 — The engine shall maintain a viewer state that represents the tracked viewer in physical, screen-relative coordinates or an equivalent calibrated coordinate model.

FR-VIEW-002 — The engine shall derive the rendered perspective from viewer position relative to the fixed physical display plane.

FR-VIEW-003 — The projection behavior shall support lateral, vertical, and depth movement.

FR-VIEW-004 — The physically calibrated projection shall be the baseline behavior.

FR-VIEW-005 — The user shall be able to apply an optional artistic perspective-strength adjustment without permanently altering the underlying physical calibration.

FR-VIEW-006 — Viewer input shall be filtered sufficiently to reduce visible jitter without introducing unacceptable lag.

FR-VIEW-007 — The engine shall own projection and the head-tracked camera state. World packages shall not directly control that camera.

FR-VIEW-008 — World packages may receive read-only viewer state so that world content may react to the viewer independently of camera projection.

FR-VIEW-009 — Projection behavior shall be independently testable using synthetic viewer positions and known screen geometry.

## 8.4 Display Geometry and Calibration

FR-CAL-001 — World Viewer shall allow the user to enter physical visible display width and height manually in the Settings UI.

FR-CAL-002 — The reference ThinkPad E590 profile shall begin with approximately 345.4 mm width × 194.3 mm height.

FR-CAL-003 — Automated tests shall use a deterministic synthetic display profile that is independent of the physical development laptop.

FR-CAL-004 — Calibration shall be designed for the reference fixed-camera geometry before any support for arbitrary camera placement is considered.

FR-CAL-005 — The initial calibration workflow shall avoid unnecessary camera-intrinsic or distortion-calibration steps.

FR-CAL-006 — If a physical camera-to-screen offset measurement is required, the product should prefer a small number of understandable manual measurements rather than a complex calibration procedure.

FR-CAL-007 — Calibration and display settings shall be stored locally and restored on subsequent launches.

FR-CAL-008 — The user shall be able to reset calibration/settings to known defaults or the reference development profile.

FR-CAL-009 — The calibration workflow shall be able to show a live camera preview to assist with positioning and tracking validation.

## 8.5 World Packages

FR-WORLD-001 — Each virtual world shall be contained as a distinct package separate from the engine core.

FR-WORLD-002 — A world package shall declare enough identity and compatibility metadata for World Viewer to identify and load it safely, and may declare a machine-readable settings schema for host-rendered world settings.

FR-WORLD-003 — A world package shall own its scene content, assets, simulation behavior, world-specific settings definition, and cleanup. Persisted user values for those settings shall be host-managed so package updates do not require modifying package contents.

FR-WORLD-004 — The host shall provide a defined lifecycle for at least loading/initialization, update/runtime, resize/display changes where needed, and disposal.

FR-WORLD-005 — Switching worlds shall not require restarting the World Viewer application.

FR-WORLD-006 — A failure to load one world package shall not corrupt global application settings or prevent the host from reporting the problem and returning to a safe state.

FR-WORLD-007 — The initial package mechanism shall use a configured local package directory because the project owner is the only intended user. A polished third-party installation workflow is not required.

FR-WORLD-008 — World Viewer shall discover eligible worlds from the configured local package directory. The exact manifest names, module-loading mechanism, validation rules, and compatibility contract are deferred to the Interface / Contract Specification and Technical Design Specification.

## 8.6 World Selection and Viewing

FR-UI-001 — World Viewer shall provide a simple way to view the locally available worlds and select one.

FR-UI-002 — The active world shall be visually dominant during normal viewing; application chrome should not unnecessarily weaken the window illusion.

FR-UI-003 — The user shall be able to return from full-screen/world viewing to application controls without terminating the process.

FR-UI-004 — The application shall remember the last active world and restore it on the next launch when that package remains valid and available.

FR-UI-005 — Loading, initialization, or world-package errors shall be presented clearly enough for the sole user/developer to diagnose the failure.

FR-UI-006 — When a valid world is restored or selected, full-screen world viewing shall be the default viewing mode.

## 8.7 Settings

FR-SET-001 — Settings shall include physical display width and height.

FR-SET-002 — Settings shall include calibration values required by the selected viewer-pose approach.

FR-SET-003 — Settings shall include perspective strength with a clearly identifiable physically calibrated/default value. Perspective strength shall be stored globally per display profile, not per world.

FR-SET-004 — Settings shall include only controls that provide meaningful product or diagnostic value; low-level implementation tuning should not automatically become permanent user-facing configuration.

FR-SET-005 — Settings shall be stored locally.

FR-SET-006 — Invalid settings shall be rejected or corrected safely rather than producing an invalid projection state.

FR-SET-007 — A world package may provide a declarative settings schema. World Viewer shall render the corresponding world-specific settings UI from that schema rather than requiring each world to implement its own host settings interface.

FR-SET-008 — The initial schema format should use a standard machine-readable format suitable for validation and generated forms; JSON Schema is the preferred direction, with the exact filenames and supported schema subset deferred to the Interface / Contract Specification.

FR-SET-009 — World-specific setting values shall be persisted locally by World Viewer and associated with the relevant world package.

## 8.8 Diagnostics and Development Support

FR-DIAG-001 — World Viewer shall expose a development/diagnostic mode.

FR-DIAG-002 — Diagnostics shall be able to display the active camera identity and actual capture settings available from the runtime and shall be able to show a live camera preview.

FR-DIAG-003 — Diagnostics shall be able to display current tracking state and viewer-pose values.

FR-DIAG-004 — Diagnostics shall be able to display render/update timing information sufficient to identify latency or performance problems.

FR-DIAG-005 — Diagnostics shall identify the active world package and relevant version/compatibility metadata.

FR-DIAG-006 — Diagnostics shall make the current physical display/calibration profile visible.

FR-DIAG-007 — Diagnostic information shall be local and shall not require telemetry or a remote logging service.

FR-DIAG-008 — The application should support replayable or deterministic test inputs where practical so that a failure can be reproduced without relying on the exact live-camera session.

FR-DIAG-009 — The user shall be able to export a local machine-readable diagnostic bundle suitable for sharing with an AI/agent. At minimum, the bundle should be capable of containing application/world versions, active display/calibration profile, camera capabilities/settings, tracking state, relevant configuration, performance/timing samples, and local logs. Raw webcam imagery shall not be included by default.

FR-DIAG-010 — Diagnostic export shall remain fully local and shall not automatically transmit the bundle anywhere.

## 8.9 Offline and Privacy Behavior

FR-OFF-001 — A network connection shall not be required to launch the application, initialize tracking, load a world, render a world, change settings, or perform calibration.

FR-OFF-002 — MediaPipe model files, WASM, Three.js assets, application code, and world assets required for use shall be available locally.

FR-OFF-003 — Normal runtime shall not upload webcam frames, landmarks, viewer pose, configuration, logs, or world data.

FR-OFF-004 — If a future feature would introduce optional network behavior, it must be separable from the offline core and explicitly approved as a later product change.

# 9\. World Package Product Contract — Conceptual

The exact TypeScript interfaces will be defined later, but the PRD establishes these product-level boundaries:

The host provides:  
• A managed Three.js rendering environment or equivalent world rendering context.  
• World lifecycle callbacks or services.  
• Read-only viewer state.  
• Display/viewport information that a world legitimately needs.  
• Host-rendered world settings generated from the package’s declarative settings schema when one is provided.  
• Local persistence for world-specific setting values.  
• Approved asset/settings services where required.

The world provides:  
• Identity and compatibility metadata.  
• Scene/content creation.  
• World-owned simulation/update behavior.  
• A declarative world-settings schema if user-facing settings are needed.  
• Cleanup/disposal.

The world must not:  
• Replace or directly manipulate the head-tracked projection camera.  
• Access the webcam simply to duplicate engine tracking.  
• Modify global calibration behind the host’s settings/calibration system.  
• Depend on internet access for normal operation.  
• Leave world-owned resources active after disposal.

The contract should remain small enough that a new world can be implemented without understanding the internals of tracking or projection.

# 10\. Initial Reference Hardware Profile

The first product feasibility and acceptance work uses:

• Lenovo ThinkPad E590, machine type/model 20NB005RUS.  
• Windows 11 Pro.  
• Intel Core i5-8265U.  
• 16 GB RAM.  
• Intel UHD Graphics 620\.  
• Internal 15.6-inch 1920 × 1080 display at approximately 59.98 Hz.  
• Approximate physical visible display area: 345.4 mm × 194.3 mm.  
• Integrated 720p-class webcam in the upper bezel, treated as fixed and horizontally centered for the initial geometry.

The product must not hard-code undocumented webcam field of view or actual capture frame rate. Those values/capabilities should be inspected at runtime where available.

This reference profile defines the development and acceptance environment. It is not a general minimum-system-requirement statement.

# 11\. Product Quality Expectations

Detailed numerical thresholds belong in the Non-functional Requirements and Testing Strategy, but the product is not acceptable if any of the following are true during normal reference-hardware use:

• The scene visibly jitters while the viewer remains still.  
• Perspective movement noticeably lags normal head motion.  
• Head movement behaves like a conventional camera rotation instead of a fixed-screen window.  
• Tracking loss causes abrupt disorienting jumps.  
• The rendered scene cannot remain smooth enough for the illusion on the reference laptop.  
• The application requires internet access after installation.  
• Changing worlds leaks resources or requires restarting the host.  
• A world can silently take control of tracking, calibration, or the projection camera.  
• Calibration requires an unnecessarily complex expert workflow for the sole intended user.

Precise acceptance thresholds will be based on Milestone 0 measurements rather than invented before the tracking pipeline is exercised on the reference hardware.

# 12\. Product Success Criteria

SC-01 — On the reference ThinkPad E590, a diagnostic world with geometry at clearly different depths produces a convincing fixed-window illusion as the viewer moves laterally and vertically.

SC-02 — At least one practical viewer-pose estimation approach provides stable enough position data to justify continuing to real world development.

SC-03 — The user can configure physical display dimensions and complete calibration without an expert camera-calibration procedure.

SC-04 — The application can run completely offline with the camera/tracking model and diagnostic world.

SC-05 — Tracking loss and reacquisition are visually controlled rather than abrupt.

SC-06 — The same engine can load at least two substantially different test worlds/packages without changing the tracking/projection core.

SC-07 — A world can read viewer state for reactive behavior but cannot own the projection camera.

SC-08 — Core projection behavior is verifiable using deterministic synthetic inputs.

SC-09 — The packaged application performs acceptably on the modest reference CPU/GPU without requiring dedicated graphics hardware.

SC-10 — The architecture produces well-bounded implementation tasks with strong tests and reference implementations suitable for Luna/Terra execution.

# 13\. Milestone 0 Product Scope

Milestone 0 is a feasibility milestone and should contain only the minimum product surface needed to validate the core experience.

Included:  
• Packaged Windows/Tauri application.  
• Integrated-camera access.  
• Local MediaPipe assets and face tracking.  
• Simulated viewer source.  
• Candidate viewer-pose estimators.  
• Pose filtering.  
• Manual display dimensions and simple calibration.  
• Viewer-dependent off-axis projection.  
• Perspective-strength control sufficient for testing.  
• Diagnostic 3D room with depth cues.  
• Diagnostic overlay/panel, camera preview, and local AI/agent-friendly diagnostic export.  
• Fully offline runtime.  
• Numerical projection tests and packaged smoke testing.

Excluded:  
• Fishtank production content.  
• Ant simulation.  
• Polished world library management beyond configured local package-directory discovery.  
• Third-party package installer or marketplace.  
• Arbitrary external camera calibration.  
• Cross-platform support.  
• Physics/ECS.  
• WebGPU migration.  
• Broad content-authoring tools.

Milestone 0 is successful when the product-level success criteria for the core illusion are credible enough to justify building the reusable engine and first real world.

# 14\. Future Product Scope

The following are plausible future capabilities but are not commitments for the initial product:

• Arbitrary external camera placement and camera-offset calibration.  
• Additional Windows display/laptop profiles.  
• More sophisticated calibration if simple calibration proves insufficient.  
• Optional solvePnP/OpenCV-based pose estimation if justified by measurements.  
• World package discovery/installation tools.  
• World package version migration tooling.  
• Additional user-facing graphics quality settings.  
• WebGPU-backed rendering or compute where a world benefits materially.  
• More advanced 2.5D workflows based on depth maps or offline depth estimation.  
• Additional input devices or tracking sources.  
• Multi-display or dedicated display installations.

Each future capability should be added only when a concrete requirement outweighs the added complexity.

# 15\. Assumptions and Constraints

A-01 — One viewer is tracked at a time.

A-02 — The integrated webcam remains fixed relative to the reference display.

A-03 — The user is willing to manually enter physical display dimensions.

A-04 — The sole intended user can tolerate developer-oriented world package management.

A-05 — The reference machine provides sufficient WebView2/WebGL2 support for Tauri \+ Three.js.

A-06 — The integrated camera provides adequate face visibility under normal indoor lighting.

A-07 — Physical screen dimensions are more trustworthy than an inferred monitor size and are therefore user-configurable.

A-08 — A physically correct projection is the baseline, but the user may intentionally exaggerate or reduce the effect.

A-09 — All required production dependencies and adapted code must have compatible licensing and clear provenance.

A-10 — Product behavior must remain usable without internet access.

# 16\. Decisions Deferred to Later Artifacts

This PRD deliberately leaves the following for later specification:

• Exact viewer-pose coordinate system and sign conventions — Interface / Contract Spec and Technical Design Spec.  
• Exact world package TypeScript interface and discovery/loading mechanism — Interface / Contract Spec.  
• Exact calibration workflow screens and control placement — Functional and UX/UI Specifications.  
• Numerical latency, jitter, tracking-rate, and render-rate thresholds — Non-functional Requirements and Testing Strategy.  
• Exact pose-estimation algorithm selected after comparison — Technical Design / ADR.  
• Exact filter parameters and lost-tracking timing — Technical Design / Testing Strategy.  
• Local settings persistence schema and file locations — Data Model / Persistence Spec if needed.  
• Version-compatibility policy for world packages — Interface / Contract Spec.  
• Exact diagnostic overlay layout — UX/UI Specification.  
• Milestone sequencing after feasibility — Milestone Roadmap.

These are deferred intentionally so the product specification can remain stable even if implementation details change during Milestone 0\.

# 17\. Resolved Product Decisions

The following product decisions are now resolved for this PRD revision:

D-01 — Startup behavior: World Viewer shall restore the last active world when that package remains available and valid. If it cannot be restored, the application shall fall back to a safe selection/error state.

D-02 — Default viewing mode: a valid restored or newly selected world shall enter full-screen viewing by default.

D-03 — Perspective strength scope: perspective strength is a global setting associated with the active display profile. It is not stored per world.

D-04 — World-specific settings: worlds may expose user-facing settings through a declarative machine-readable settings schema. World Viewer shall render the settings UI from that schema and persist the user’s values separately from the package. JSON Schema is the preferred direction because it is standardized, supports validation, and fits generated settings forms; exact filenames and the supported schema subset are deferred to the Interface / Contract Specification.

D-05 — Local world discovery: early versions shall use a configured local package directory. This best fits the single-user, offline, developer-oriented goal because worlds can remain self-contained and independently developed without requiring a marketplace, installer, registry, or build-time registration. Each eligible package will be discovered and validated from that directory according to a later-defined manifest/compatibility contract.

D-06 — Camera preview: the live camera preview shall be available during both calibration and diagnostics.

D-07 — Tracking loss: when tracking is lost, the rendered view shall transition smoothly toward the calibrated neutral pose. Reacquisition shall blend smoothly back to the tracked pose.

D-08 — Diagnostic export: diagnostic data shall be exportable locally in a machine-readable support bundle intended to be easy to provide to an AI/agent. The bundle shall capture enough application, world, configuration, camera, tracking, calibration, timing/performance, and log context to support troubleshooting. Raw webcam imagery shall not be included by default.

These decisions should be treated as product requirements unless deliberately revised in a later PRD version.

