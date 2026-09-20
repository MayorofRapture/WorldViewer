# World Viewer

## Non-Functional Requirements

## Draft v0.2

# Document Status

Draft version: 0.2  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Non-Functional Requirements (NFR)  
Upstream artifacts:  
• World Viewer — Project Vision & Charter, Draft v0.2  
• World Viewer — Product Specification & PRD, Draft v0.2

This second draft incorporates the resolved balanced acceptance targets for stationary-pose jitter, motion-to-photon latency, memory-growth testing, startup/world-switch timing, tracking-loss neutral return, diagnostic export, and world-settings UI hints. Milestone 0 measurements will still be used to validate these thresholds on the reference hardware and to identify whether a documented revision is justified.

# 1\. Purpose and Requirement Conventions

These requirements govern performance, perceptual quality, reliability, offline behavior, privacy, maintainability, testability, packaging, diagnostics, data integrity, and world-package behavior.

Unless explicitly marked SHOULD or PROVISIONAL, each requirement is a MUST for the initial product.

Requirement prefixes:  
• NFR-PERF — performance and latency  
• NFR-VIS — perceptual/visual stability  
• NFR-REL — reliability and recovery  
• NFR-OFF — offline operation  
• NFR-PRIV — privacy and local data handling  
• NFR-SEC — security and trust boundaries  
• NFR-RES — resource efficiency  
• NFR-MAINT — maintainability and architecture  
• NFR-TEST — testability  
• NFR-OBS — diagnostics and observability  
• NFR-DATA — local persistence and integrity  
• NFR-WORLD — world-package isolation and lifecycle  
• NFR-PKG — packaging and deployment  
• NFR-LIC — licensing and software provenance  
• NFR-COMP — compatibility  
• NFR-AI — AI/agent-assisted development and support

# 2\. Quality Priorities

The product quality priorities, in order, are:

1\. Correct and convincing head-coupled window behavior.  
2\. Low perceived latency and stable viewer tracking.  
3\. Reliable fully offline operation.  
4\. Predictable failure/recovery behavior.  
5\. Simplicity of calibration and operation.  
6\. Reusable world/engine separation.  
7\. Deterministic testability and diagnosability.  
8\. Efficient use of the modest reference hardware.  
9\. Maintainability and suitability for AI-assisted development.  
10\. Visual richness within the limits established above.

A visually impressive world that compromises projection correctness, stability, or latency is not acceptable.

# 3\. Reference Acceptance Environment

The initial acceptance environment is:

• Lenovo ThinkPad E590, machine type/model 20NB005RUS.  
• Windows 11 Pro.  
• Intel Core i5-8265U.  
• 16 GB RAM.  
• Intel UHD Graphics 620\.  
• Internal 15.6-inch 1920 × 1080 display at approximately 59.98 Hz.  
• Approximate visible panel size: 345.4 mm × 194.3 mm.  
• Integrated 720p-class fixed webcam in the upper display bezel.

NFR-COMP-001 — All Milestone 0 performance and perceptual acceptance measurements shall be reproducible on this reference machine.

NFR-COMP-002 — The reference environment defines the acceptance baseline, not minimum system requirements for future releases.

NFR-COMP-003 — The initial production scope is Windows-only. Cross-platform behavior is not required.

NFR-COMP-004 — World Viewer shall not require a discrete GPU on the reference system.

# 4\. Performance and Latency

The virtual-window illusion is latency-sensitive. Rendering and tracking shall be decoupled so that a slower tracking cadence does not force the renderer to run at the same rate.

NFR-PERF-001 — The render loop shall target the display refresh rate on the reference 59.98 Hz panel during the Milestone 0 diagnostic world.

NFR-PERF-002 — PROVISIONAL: during the diagnostic world, at least 95% of rendered frames should complete within 20 ms after warm-up, excluding intentional blocking operations such as world loading.

NFR-PERF-003 — PROVISIONAL: the diagnostic world shall not sustain a rendered frame rate below 45 FPS during ordinary single-viewer use on the reference machine.

NFR-PERF-004 — Face/head tracking shall run independently from rendering and shall not block the render/UI thread.

NFR-PERF-005 — PROVISIONAL: useful viewer-pose updates should be produced at 15 Hz or better during normal tracking, with 20–30 Hz preferred if supported by the reference camera and hardware.

NFR-PERF-006 — Measured motion-to-photon delay from observable head movement to corresponding rendered perspective change shall target a median of 80 ms or less and a 95th percentile of 120 ms or less on the reference setup. Milestone 0 shall validate this balanced acceptance target using the real pipeline.

NFR-PERF-007 — Expensive tracking work, model inference, or image processing shall not execute synchronously on the main render/UI thread.

NFR-PERF-008 — World switching and startup shall not perform avoidable network waits because all required runtime assets are local.

NFR-PERF-009 — The system shall record timing data sufficient to separate camera capture delay, tracking/inference time, pose-filter delay, render-frame time, and world-update time when diagnosing latency.

NFR-PERF-010 — Any future world that cannot meet the host’s minimum interactive performance on the reference machine should degrade world-specific visual quality before compromising tracking/projection correctness.

NFR-PERF-011 — On the reference machine, cold application startup to an interactive restored/default world shall complete within 5 seconds under normal local conditions.

NFR-PERF-012 — On the reference machine, switching from one valid local world package to another shall complete to an interactive state within 5 seconds under normal local conditions. A 2-second switch is an engineering optimization target, not a release gate.

# 5\. Perceptual and Visual Stability

NFR-VIS-001 — A stationary tracked viewer shall not cause obvious continuous projection vibration, shaking, or “swimming” in the diagnostic world.

NFR-VIS-002 — Filtering shall reduce tracking noise without creating visibly delayed or rubber-band-like camera response during normal head movement.

NFR-VIS-003 — Lateral, vertical, and depth movement shall produce a coherent fixed-window effect rather than conventional orbit-camera rotation.

NFR-VIS-004 — Tracking loss shall not create an instantaneous camera snap.

NFR-VIS-005 — Once tracking is confirmed lost, the view shall transition smoothly toward the calibrated neutral pose over 5 seconds.

NFR-VIS-006 — When tracking resumes, the view shall blend smoothly from the neutral/current pose back to the tracked pose.

NFR-VIS-007 — The physically calibrated projection shall remain available as a known baseline even when the user applies the optional artistic perspective-strength adjustment.

NFR-VIS-008 — Perspective-strength adjustment shall not create invalid projection geometry or destabilize the camera.

NFR-VIS-009 — During a stationary 5-second sample after tracking/filter settling, viewer-pose jitter shall target RMS deviation of 3 mm or less on the screen-relative X and Y axes and 8 mm or less on the Z/depth axis. This numerical target complements, rather than replaces, the requirement that the rendered scene show no obvious objectionable vibration.

# 6\. Reliability and Recovery

NFR-REL-001 — Failure of the active world package shall not corrupt global World Viewer settings or calibration data.

NFR-REL-002 — If the last active world is missing, invalid, or fails to initialize, World Viewer shall fall back to a safe selection/error state rather than repeatedly crashing at startup.

NFR-REL-003 — Camera permission denial, camera unavailability, or tracking initialization failure shall produce a recoverable application state with diagnostics rather than an unrecoverable crash.

NFR-REL-004 — Invalid calibration/settings values shall not be allowed to produce NaN, infinite, singular, or otherwise invalid camera/projection state.

NFR-REL-005 — Repeated world load/unload cycles shall not leave world-owned update loops, event listeners, GPU resources, timers, or workers active after disposal.

NFR-REL-006 — A malformed world package shall be rejected before it can partially initialize into an undefined host state.

NFR-REL-007 — Local configuration corruption should recover through validated defaults, the reference profile, or an explicit error/recovery path.

NFR-REL-008 — World Viewer shall preserve enough local diagnostic information after recoverable errors to explain what failed.

NFR-REL-009 — The application shall support clean shutdown without requiring the user to terminate lingering camera, worker, or world processes manually.

# 7\. Fully Offline Operation

NFR-OFF-001 — Normal runtime operation shall require no network connection.

NFR-OFF-002 — Application startup, camera initialization, MediaPipe inference, calibration, world loading, world execution, settings, diagnostics, and diagnostic export shall all operate offline.

NFR-OFF-003 — MediaPipe model files, WASM assets, Three.js/runtime code, fonts required by the UI, and world assets shall be available locally.

NFR-OFF-004 — A packaged release shall not depend on CDN-hosted scripts, models, textures, fonts, schemas, or other runtime resources.

NFR-OFF-005 — The application shall remain functional when network access is unavailable or blocked.

NFR-OFF-006 — Automated acceptance testing shall include at least one packaged offline smoke test.

NFR-OFF-007 — Any future optional network capability must be architecturally separable from the offline core and must not silently become a startup/runtime dependency.

# 8\. Privacy and Local Data Handling

NFR-PRIV-001 — Webcam frames shall be processed locally.

NFR-PRIV-002 — World Viewer shall not transmit camera imagery, face landmarks, viewer pose, calibration data, configuration, logs, or diagnostic bundles during normal operation.

NFR-PRIV-003 — Raw webcam imagery shall not be persisted by default.

NFR-PRIV-004 — The AI/agent diagnostic export shall exclude raw webcam imagery by default.

NFR-PRIV-005 — If future diagnostic capture includes images or video, it must be an explicit user action and clearly distinguished from ordinary diagnostic export.

NFR-PRIV-006 — No telemetry service is required or enabled for the initial product.

NFR-PRIV-007 — All persisted user configuration and diagnostic data shall remain on local storage unless the user manually chooses to copy or share it.

# 9\. Security and Trust Boundaries

World Viewer is a single-user developer-oriented application, so the initial threat model is modest. World packages are locally added by the owner rather than downloaded from an untrusted marketplace.

NFR-SEC-001 — World packages shall still be validated against a defined manifest/compatibility contract before loading.

NFR-SEC-002 — World settings schemas and saved values shall be validated before use.

NFR-SEC-003 — A world package shall not be given ownership of webcam capture, calibration persistence, or the head-tracked projection camera.

NFR-SEC-004 — World packages shall not require network access for normal operation.

NFR-SEC-005 — Host APIs exposed to worlds shall be deliberately narrow rather than exposing unrestricted application internals.

NFR-SEC-006 — The packaged application should use a restrictive Content Security Policy compatible with the local MediaPipe/Three.js/Tauri runtime.

NFR-SEC-007 — Dependency additions shall be reviewed for necessity, maintenance status, source, and license before inclusion.

# 10\. Resource Efficiency

NFR-RES-001 — The host shall remain usable on the reference i5-8265U / Intel UHD 620 system without requiring dedicated graphics hardware.

NFR-RES-002 — The engine shall avoid duplicating large camera frames or 3D assets unnecessarily between subsystems.

NFR-RES-003 — Tracking cadence may be lower than render cadence; the engine shall interpolate/filter viewer state rather than forcing inference at display refresh rate.

NFR-RES-004 — Inactive worlds shall release world-owned GPU resources, textures, geometries, audio, timers, workers, and event handlers when disposed.

NFR-RES-005 — Memory-leak acceptance shall use a 25-cycle world-switch lifecycle test with cleanup opportunities. After the initial warm-up/cache growth, memory shall reach a stable plateau rather than grow proportionally with each switch. As balanced guardrails, post-settle JavaScript heap should remain within approximately 10 MB of the stabilized baseline, total process memory should remain within approximately 50 MB of the stabilized baseline, and the final 10 cycles shall not show a sustained positive memory slope greater than approximately 1 MB per cycle. World-owned Three.js resources, workers, timers, and listeners shall also return to expected baseline counts.

NFR-RES-006 — The engine shall prefer Three.js-native loading/caching/disposal mechanisms over duplicating those systems.

NFR-RES-007 — The addition of OpenCV, WebGPU, physics, ECS, or other heavy dependencies shall require measured justification.

# 11\. Maintainability and Architecture

NFR-MAINT-001 — Tracking, viewer-pose estimation, filtering, calibration, projection, rendering, world lifecycle, diagnostics, and persistence shall have clear ownership boundaries.

NFR-MAINT-002 — The head-tracked camera/projection implementation shall remain engine-owned and inaccessible for direct mutation by worlds.

NFR-MAINT-003 — World packages shall be independently replaceable without requiring changes to core tracking/projection code.

NFR-MAINT-004 — Public internal contracts shall be strongly typed.

NFR-MAINT-005 — Runtime configuration entering a subsystem boundary shall be validated where corruption or malformed values could cause unsafe behavior.

NFR-MAINT-006 — Thin adapters are preferred over large custom frameworks when mature library APIs already provide the required capability.

NFR-MAINT-007 — Custom algorithmic code shall be minimized, especially for face tracking, generalized projection, filtering, asset loading, and schema-driven settings.

NFR-MAINT-008 — Adapted third-party reference code shall retain clear source/provenance notes and licensing attribution where required.

NFR-MAINT-009 — A subsystem should be replaceable behind its interface when practical, particularly tracking source, pose estimator, and filtering implementation.

NFR-MAINT-010 — Engine code shall not accumulate fish-, ant-, water-, painting-, or other world-specific behavior.

# 12\. Testability

NFR-TEST-001 — Core projection behavior shall be testable without a physical webcam using deterministic synthetic viewer positions.

NFR-TEST-002 — Projection tests shall verify known geometric invariants for centered and off-axis viewer positions.

NFR-TEST-003 — Pose-estimator and filter behavior should be testable using recorded or synthetic landmark/pose fixtures.

NFR-TEST-004 — World lifecycle behavior shall be testable with a minimal diagnostic/test world.

NFR-TEST-005 — A test world shall be able to prove that world switching, initialization, disposal, and failure handling work without involving production fishtank content.

NFR-TEST-006 — Packaged Tauri behavior shall be smoke-tested separately from browser/dev-server behavior.

NFR-TEST-007 — Offline behavior shall be tested in a way that would reveal accidental CDN/model/network dependencies.

NFR-TEST-008 — Settings validation, corrupted-settings recovery, world-manifest validation, and diagnostic-bundle generation shall have automated tests.

NFR-TEST-009 — Performance tests shall use explicit warm-up periods and report the measurement environment rather than presenting local timings as universal hardware guarantees.

NFR-TEST-010 — Where behavior is perceptual and cannot be fully automated, the Testing Strategy shall define repeatable manual acceptance procedures.

# 13\. Diagnostics and Observability

NFR-OBS-001 — World Viewer shall provide a development/diagnostic mode without requiring a separate debug build.

NFR-OBS-002 — Diagnostic state shall include application version, active world identity/version, display profile, calibration state, camera identity/capture settings, tracking state, viewer pose, and key timing/performance measurements.

NFR-OBS-003 — Logs shall be local.

NFR-OBS-004 — Important errors shall include enough context to identify the failing subsystem and operation.

NFR-OBS-005 — Diagnostic output should favor structured or machine-readable fields over prose-only logging where practical.

NFR-OBS-006 — The user shall be able to export diagnostics as a single structured JSON file.

NFR-OBS-007 — The support bundle shall be designed to be easy to attach to an AI/agent coding session without requiring manual transcription.

NFR-OBS-008 — The structured diagnostic JSON shall identify its own schema/version so future tools and AI/agents can interpret older exports.

NFR-OBS-009 — The export process shall not automatically upload, email, or transmit the bundle.

NFR-OBS-010 — Raw webcam imagery shall be omitted from the standard support bundle.

NFR-OBS-011 — Performance instrumentation shall make it possible to distinguish host-engine cost from world-specific update/render cost where practical.

# 14\. Local Persistence and Data Integrity

NFR-DATA-001 — Display profiles, calibration values, perspective strength, global application settings, last active world, package-directory configuration, and world-specific setting values shall persist locally.

NFR-DATA-002 — Perspective strength shall be associated with the relevant display profile, not the active world.

NFR-DATA-003 — World-specific setting values shall be stored separately from the world package so package replacement/update does not overwrite user values.

NFR-DATA-004 — Persisted settings shall have a schema/version strategy sufficient to detect incompatible data.

NFR-DATA-005 — Writes to critical configuration should be atomic or otherwise resistant to leaving a partially written file after interruption.

NFR-DATA-006 — Corrupted or unsupported persisted data shall not be silently accepted.

NFR-DATA-007 — Human-readable formats are preferred for configuration and diagnostics where they do not undermine correctness or performance.

NFR-DATA-008 — Exact file formats, directories, migration rules, and backup behavior are deferred to the Data Model / Persistence Specification.

# 15\. World Package Quality and Isolation

NFR-WORLD-001 — Worlds shall be discovered from the configured local package directory.

NFR-WORLD-002 — Each world package shall be self-contained with respect to its world-specific code and assets.

NFR-WORLD-003 — Each world package shall expose compatible metadata sufficient for identity, versioning, compatibility checks, and lifecycle loading.

NFR-WORLD-004 — Worlds with user-facing options shall provide a declarative settings schema that the host can render.

NFR-WORLD-005 — World settings shall use standard JSON Schema for validation/data shape plus a separate host-defined UI-hints document for presentation metadata such as widget type, grouping, ordering, labels, descriptions, and units. Exact filenames and the supported schema/UI-hint subsets will be defined in the Interface / Contract Specification.

NFR-WORLD-006 — A world shall not require changes to the engine tracking/projection implementation merely to be installed or selected.

NFR-WORLD-007 — A world shall clean up all resources it owns when disposed.

NFR-WORLD-008 — A single malformed or failing world shall not make other installed worlds unusable.

NFR-WORLD-009 — World package loading shall remain compatible with the fully offline requirement.

NFR-WORLD-010 — World-specific settings rendering shall be host-controlled for consistent behavior, validation, and persistence.

# 16\. Packaging and Deployment

NFR-PKG-001 — World Viewer shall produce a packaged Windows application suitable for normal use outside the development environment.

NFR-PKG-002 — Required runtime tracking models, WASM, application assets, and other core dependencies shall be included or installed locally.

NFR-PKG-003 — The packaged application shall be smoke-tested on the reference machine.

NFR-PKG-004 — Packaged behavior shall not rely on localhost development servers.

NFR-PKG-005 — Application version information shall be available to diagnostics and support bundles.

NFR-PKG-006 — Build/package steps shall be documented and automatable.

NFR-PKG-007 — A release should be reproducible from the repository and declared toolchain/dependency versions to the extent practical.

NFR-PKG-008 — Early world-package installation may remain developer-oriented and consist of placing a validated package in the configured local package directory.

# 17\. Licensing and Software Provenance

NFR-LIC-001 — Direct dependencies and adapted code shall have licenses compatible with the intended project use.

NFR-LIC-002 — MIT, BSD-family, and Apache-2.0 dependencies are preferred.

NFR-LIC-003 — GPL, AGPL, LGPL, noncommercial, source-available, custom, missing, or ambiguous licenses shall be explicitly reviewed before use.

NFR-LIC-004 — Code shall not be copied from repositories with no usable license.

NFR-LIC-005 — When a project is useful only as an unlicensed or incompatible reference, it may inform behavior or testing but shall not be copied into the codebase.

NFR-LIC-006 — Adapted reference implementations shall include enough provenance to identify the source project/version and the nature of the adaptation.

NFR-LIC-007 — Dependency selection should favor mature, documented components over obscure packages that merely reduce a small amount of code.

# 18\. AI/Agent-Assisted Development and Support

NFR-AI-001 — Module boundaries and contracts shall be designed so bounded implementation tasks can be delegated independently.

NFR-AI-002 — Tasks intended for Luna or Terra should have explicit inputs, outputs, file scope, reference implementation/library, and automated acceptance tests whenever practical.

NFR-AI-003 — Stronger reasoning models should be reserved primarily for ambiguous architecture, coordinate-system design, numerical projection oracles, experiment interpretation, and difficult cross-subsystem failures.

NFR-AI-004 — Diagnostic support bundles shall be structured so an AI/agent can inspect environment, version, configuration, logs, and performance context without requiring the user to manually recreate that context.

NFR-AI-005 — Machine-readable diagnostic content should use stable keys and schema versions so agent prompts and tools can consume it reliably.

NFR-AI-006 — Generated code shall be held to the same automated tests, typing, licensing, and review requirements as manually written code.

NFR-AI-007 — The codebase should prefer explicit, local contracts and deterministic fixtures over hidden global state because those make both human and AI debugging more reliable.

# 19\. Milestone 0 Measurement Plan

Milestone 0 shall establish measured baselines rather than prematurely freezing hardware-independent performance claims.

The first performance/quality report should capture:

• Actual camera capture resolution and frame rate.  
• Face-tracking/inference cadence.  
• Viewer-pose update cadence.  
• Camera-to-pose processing delay where measurable.  
• Pose/filter-to-render delay.  
• Render FPS and frame-time distribution.  
• CPU/GPU utilization where practical.  
• Memory behavior during steady state and repeated world switching.  
• Stationary-pose jitter characteristics.  
• Tracking-loss detection and the 5-second neutral-return blend behavior.  
• Cold startup and first-world-ready timing, with a 5-second maximum acceptance threshold.  
• Packaged offline behavior.  
• Diagnostic bundle completeness.

NFR-M0-001 — All provisional thresholds in this document shall be reviewed after this measurement pass.

NFR-M0-002 — A threshold may be relaxed only when the measured result still produces an acceptable virtual-window experience and the reason is documented.

NFR-M0-003 — A threshold may be tightened if the reference hardware demonstrates substantial margin and the tighter value improves regression detection.

# 20\. Definition of Non-Functional Acceptance for Milestone 0

Milestone 0 is non-functionally acceptable when all of the following are true:

• The packaged application operates fully offline on the reference laptop.  
• The diagnostic world renders smoothly enough to preserve the illusion.  
• Live tracking does not block the render/UI thread.  
• Head movement feels responsive and coherent.  
• A stationary viewer does not cause obvious objectionable jitter.  
• After confirmed tracking loss, the view returns smoothly to the calibrated neutral pose over 5 seconds, and reacquisition is smooth.  
• Projection tests pass for deterministic synthetic geometry.  
• Camera, tracking, calibration, projection, and rendering failures are diagnosable.  
• Diagnostics can be exported locally as a single structured, versioned JSON file and meaningfully inspected by an AI/agent.  
• A 25-cycle world-switch lifecycle test reaches a stable memory/resource plateau and stays within the defined balanced leak guardrails.  
• Invalid package/configuration inputs fail safely.  
• All necessary runtime models/assets are local.  
• No product requirement requires the reference user to perform an expert camera-calibration workflow.

The balanced latency, jitter, memory-growth, and startup/world-switch thresholds in this draft are the initial acceptance limits. Milestone 0 shall validate them on the reference hardware; any change shall be documented with measured evidence and a rationale.

# 21\. Resolved NFR Decisions

The following non-functional decisions are now resolved for this revision:

D-NFR-01 — Stationary-pose jitter: use the balanced target. During a stationary 5-second sample after filter settling, RMS viewer-pose deviation shall be 3 mm or less on X/Y and 8 mm or less on Z/depth, while also satisfying the subjective requirement of no obvious objectionable scene vibration.

D-NFR-02 — Motion-to-photon latency: use the balanced target of median 80 ms or less and p95 120 ms or less on the reference ThinkPad E590.

D-NFR-03 — Tracking-loss neutral return: once tracking is confirmed lost, the rendered view shall return smoothly to the calibrated neutral pose over 5 seconds. The exact loss-confirmation debounce/grace interval remains a lower-level implementation/tuning decision.

D-NFR-04 — Memory-growth testing: use the balanced lifecycle criteria. Run 25 complete world-switch cycles with cleanup opportunities; require a stable plateau rather than proportional growth; target post-settle JavaScript heap within approximately 10 MB of stabilized baseline, process memory within approximately 50 MB, and no sustained positive slope above approximately 1 MB per cycle over the final 10 cycles. Resource counts for world-owned Three.js objects, workers, timers, and listeners shall also return to expected baselines.

D-NFR-05 — Startup and switching: cold startup to an interactive restored/default world shall be 5 seconds or less, and switching to another valid world shall become interactive within 5 seconds. A 2-second world-switch time remains an optimization target rather than a release gate.

D-NFR-06 — Diagnostic export format: diagnostic export shall be a single structured, versioned JSON file for the initial product.

D-NFR-07 — World-settings UI hints: world settings shall use standard JSON Schema for validation/data shape plus a separate host-defined UI-hints document supporting presentation concerns such as sliders, groups, ordering, labels, descriptions, and units.

These values are the initial acceptance requirements. Milestone 0 measurements may justify a future revision, but changes must be supported by measured evidence and documented rationale.

