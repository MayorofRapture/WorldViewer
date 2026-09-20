# World Viewer

## Project Vision / Charter

## Draft v0.2

# Document Status

Draft version: 0.2  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: Project Vision / Charter

This second working draft incorporates the initial charter decisions for platform, camera placement, world packaging, offline operation, calibration, naming, perspective controls, and reference hardware. It establishes the project’s purpose, boundaries, guiding principles, and technical direction so that later specifications can be written against a stable foundation. Detailed functional behavior, user experience, interface contracts, technical design, performance requirements, and milestone-level implementation decisions will be defined in later artifacts.

# Executive Summary

World Viewer is a reusable head-tracked “virtual window” application that makes a physical monitor appear to be a window into a virtual space. A camera observes the viewer’s head and face position, the engine estimates the viewer’s physical eye position relative to the display, and the renderer updates the scene using head-coupled off-axis perspective.

The project is not a fishtank application. The fishtank is one possible world running on top of the engine. Other worlds may include an ant farm, a miniature room or diorama, a landscape, a 2.5D painting or photograph, or interactive scenes whose inhabitants react to the viewer.

The project will follow a reuse-first strategy. Mature open-source components, official samples, established projection mathematics, and proven architectural patterns should be adopted or adapted wherever practical. Custom code should be limited to the integration and product-specific behavior that existing components do not already solve.

The initial technical direction is Tauri 2, TypeScript, React, Vite, imperative Three.js/WebGL2, and MediaPipe Face Landmarker. MediaPipe tracking should execute in a Web Worker. A DisplayXR/Kooima-style generalized off-axis projection should be adapted rather than independently derived. Viewer-pose smoothing should use a proven One Euro filtering approach. These choices remain subject to Milestone 0 feasibility testing rather than being treated as irreversible commitments.

# Vision

Create a lightweight platform that allows an ordinary monitor and webcam to convincingly behave like a physical window into many different virtual worlds.

World Viewer should make the user feel that the virtual scene exists spatially behind the display rather than merely being rendered on its surface. The illusion should respond naturally as the viewer moves left, right, up, down, closer to, or farther from the monitor.

The long-term value of the project is the reusable engine, not any single world.

# Problem and Opportunity

Most desktop 3D experiences assume a fixed viewer and a conventional symmetric perspective camera. That means the image may look three-dimensional, but the monitor still behaves like a flat picture.

Head-coupled perspective changes that relationship. If the renderer knows where the viewer is physically located relative to the display, the screen can be treated as a fixed aperture into a virtual space. This creates a strong depth illusion without requiring a headset, stereoscopic display, or specialized tracking hardware.

The opportunity is to package this established idea into a reusable, lightweight, local desktop platform built from modern web and open-source components.

# Project Goals

• Build a reusable Virtual Window Engine rather than a single-purpose simulation.  
• Produce convincing head-coupled perspective using a normal consumer webcam and physical monitor.  
• Support interchangeable 3D and 2.5D world modules without changing the engine’s tracking or projection core.  
• Keep world code isolated from viewer tracking, calibration, and camera projection.  
• Reuse mature open-source components and established algorithms wherever practical.  
• Minimize custom computer-vision and projection mathematics.  
• Keep the application lightweight, local-first, and usable without cloud services during normal operation.  
• Make the architecture strongly typed, testable, deterministic where possible, and suitable for AI-assisted development.  
• Structure work so that Luna and Terra can safely perform most implementation tasks after interfaces, tests, and reference implementations are defined.  
• Maintain clear source provenance and permissive licensing for any adapted code.

# Non-Goals

World Viewer is not intended, at least initially, to be:

• A general-purpose game engine.  
• A replacement for Three.js, Unity, Unreal, or other complete rendering engines.  
• A VR headset platform.  
• A stereoscopic display system.  
• A physics engine or entity-component-system framework.  
• A multiplayer or cloud-connected platform.  
• A world marketplace or mod distribution service.  
• A full computer-vision research project.  
• A general camera-calibration suite.  
• A polished fishtank in the first milestone.

These features may be reconsidered only when a concrete world or product requirement justifies them.

# Primary Experience

The primary experience is a single viewer sitting or standing in front of the reference Windows laptop, using the laptop’s fixed integrated webcam mounted above the display. Support for arbitrary external camera placement is deferred to a future version.

The viewer moves their head naturally. The scene updates so that the monitor behaves like a fixed opening into a virtual space. Moving left should reveal scene geometry that would physically become visible through the right side of the opening; moving right should produce the inverse effect. Vertical and depth movement should produce corresponding perspective changes.

The system should fail gracefully when tracking is lost and smoothly reacquire the viewer when tracking returns.

Support for multiple simultaneous viewers is explicitly outside the initial scope because a single conventional display cannot present independent correct perspectives to multiple viewers at the same time.

# Core Product Principles

Reuse first  
Before implementing a subsystem, ask: “Do we actually need to write this?” Prefer mature dependencies, licensed reference implementations, and established algorithms over custom reinvention.

Physical correctness before visual polish  
The window illusion depends on correct geometry. Projection behavior must be validated mathematically and experimentally rather than judged only by whether camera motion “looks cool.”

Engine/world separation  
Tracking, pose estimation, filtering, calibration, viewer state, projection, and the render camera belong to the engine. World modules own scene content and simulation behavior. A world may read viewer state to react to the viewer, but it must not control the head-tracked camera.

Thin abstractions  
Do not create wrappers that simply rename mature Three.js or MediaPipe APIs unless the wrapper establishes an important project boundary, test seam, or lifecycle rule.

Local-first operation  
Fully offline runtime operation is a hard product requirement. Tracking, rendering, world simulation, configuration, world assets, MediaPipe models, and WASM assets must be packaged or stored locally and must not depend on network access during ordinary use.

Evidence-driven complexity  
OpenCV, WebGPU, physics engines, ECS frameworks, React Three Fiber, and other additional technologies should be introduced only when measured requirements justify them.

Deterministic development paths  
A simulated viewer source and recorded tracking fixtures should allow most engine work to be developed and tested without requiring live webcam access.

Licensing and provenance  
Code may be directly adapted only from sources with verified compatible licenses. Unlicensed or ambiguously licensed projects may inform behavior and architecture but must not be copied.

# High-Level Scope

The engine is expected to contain the following conceptual capabilities:

• Desktop application shell and native integration.  
• Camera capture.  
• Face/head tracking.  
• Viewer-pose estimation in physical screen-relative coordinates.  
• Pose filtering and tracking-state handling.  
• Display and camera calibration.  
• Head-coupled off-axis projection.  
• Three.js rendering and render-loop ownership.  
• World lifecycle and world switching.  
• Settings and diagnostic UI, including manual physical display dimensions, simple calibration controls, and an optional artistic perspective-strength control.  
• Development instrumentation and simulated tracking.  
• World-accessible read-only viewer state.

World modules are expected to contain:

• Three.js scene content.  
• World-specific simulation and behavior.  
• World-specific assets and settings.  
• Optional reactions to the viewer.  
• Their own content lifecycle and cleanup.

The engine should not accumulate world-specific fish, ant, water, physics, or content-authoring systems.

# World Model

A “world” is an interchangeable, self-contained package hosted by the engine. Each world should contain its own scene content, assets, simulation logic, and world-specific settings. The sole intended user may add, update, or remove these packages as new worlds are planned and built; a marketplace or end-user distribution workflow is not required.

Possible world classes include:

• Fully 3D environments such as an aquarium, miniature room, diorama, or landscape.  
• Agent simulations such as an ant colony.  
• 2.5D layered paintings or photographs composed of textured planes at different virtual depths.  
• RGB-D or depth-map-driven images rendered through displaced geometry.  
• Interactive scenes where objects or creatures respond to the viewer’s physical position.

All of these should use the same viewer-dependent projection system. World Viewer should not contain a separate “2.5D parallax engine” if ordinary Three.js scene geometry and the virtual-window camera already provide the required parallax.

# Technical Direction

The preferred baseline stack for the Windows-only first version is:

• Tauri 2 for the Windows desktop shell.  
• TypeScript as the primary application language.  
• React for application, calibration, settings, and diagnostics UI.  
• Vite for frontend tooling.  
• Three.js WebGLRenderer for rendering.  
• MediaPipe Face Landmarker through @mediapipe/tasks-vision for tracking.  
• A module Web Worker for MediaPipe inference.  
• Zod for runtime configuration and schema validation.  
• Vitest for unit and integration testing.  
• Playwright-style end-to-end patterns where useful.  
• glTF/GLB and native Three.js loaders for 3D assets.

The engine core should use imperative Three.js rather than placing the critical projection/render loop inside React state management.

Rust should remain limited to Tauri/native-shell responsibilities unless a measured requirement later justifies moving additional work there.

WebGL2 is the baseline. WebGPU is a future optimization path, not a Milestone 0 requirement.

# Reuse Strategy

Research identified several mature components or reference implementations that should shape development:

• Google’s current MediaPipe web samples provide an Apache-2.0 Face Landmarker Web Worker pattern that should be adapted instead of recreated.  
• DisplayXR provides an Apache-2.0 implementation and mathematical reference for display-centric generalized off-axis projection based on established Kooima-style projection geometry. This should be the primary projection reference.  
• Three.js already provides the matrix, camera, rendering, GLTF, Draco, KTX2, loading, and scene-graph primitives needed by the engine. A second rendering or asset engine should not be built.  
• One Euro filtering is an established low-latency adaptive filtering approach well suited to noisy head-tracking input.  
• OpenCV solvePnP is a mature fallback if MediaPipe-derived viewer-position methods are not accurate enough, but OpenCV should not be added to the baseline until experiments justify the extra complexity.  
• Future world modules should reuse domain-specific prior art such as existing boids/flocking examples for fish and permissively licensed ant/pheromone simulation patterns rather than pushing those systems into the engine.

The development process should distinguish between direct dependencies, licensed code adaptation, composition of mature primitives, and genuinely project-specific code.

# Architecture Boundary

The most important architectural boundary is between the Virtual Window Engine and the active world.

The engine owns:

• Webcam access and tracking.  
• Physical viewer-position estimation.  
• Calibration profiles.  
• Filtering, confidence, lost-tracking, and reacquisition behavior.  
• Screen-relative coordinate conventions.  
• The render camera and projection matrix.  
• Frame timing and renderer ownership.  
• World lifecycle.  
• Read-only viewer state.

A world owns:

• A scene root or equivalent world-owned Three.js group.  
• Its visual assets.  
• Its simulation.  
• Its world-specific settings.  
• Optional viewer-reactive behavior.

The world should not receive mutable access to the engine camera. This should be enforced by the interface design rather than relying only on convention.

# Milestone 0 Charter

Milestone 0 is a technical feasibility milestone, not the first content milestone.

Its purpose is to answer one question:

Can the Lenovo ThinkPad E590’s fixed integrated webcam, combined with reusable tracking, filtering, simple calibration, and off-axis projection components, make its conventional display convincingly behave like a physical window?

Milestone 0 should include:

• A packaged Tauri application.  
• Local webcam acquisition and permission handling.  
• Locally packaged MediaPipe model/WASM assets.  
• MediaPipe Face Landmarker running in a Web Worker.  
• A simulated viewer source.  
• At least two viewer-position estimation strategies suitable for comparison.  
• One Euro filtering.  
• Display calibration data with manual physical display dimensions, a default synthetic test profile, and a deliberately simple user calibration workflow.  
• DisplayXR/Kooima-derived off-axis projection integrated with Three.js.  
• A simple diagnostic room made from primitive geometry.  
• Numerical projection tests.  
• Tracking and performance instrumentation.  
• Packaged-app smoke testing.

Milestone 0 should explicitly exclude fish, water, ant simulation, polished world selection, physics, ECS, WebGPU migration, and broad content tooling.

# Feasibility Questions

Milestone 0 must resolve or materially reduce the following uncertainties:

1\. Can MediaPipe’s facial transformation output provide a sufficiently stable and useful physical viewer-position estimate for this application?  
2\. Does a calibrated eye-separation/IPD-based estimator perform better or more predictably?  
3\. Is OpenCV solvePnP actually necessary?  
4\. What calibration workflow is the minimum needed to produce convincing perspective on ordinary webcams and monitors?  
5\. How much filtering can be applied before latency becomes perceptible?  
6\. Can tracking run independently at a lower rate while rendering remains smooth at display refresh rate?  
7\. Does Tauri/WebView2 reliably handle camera permissions, local MediaPipe WASM/model loading, workers, CSP, GPU rendering, and offline packaging?  
8\. Do the projection invariants hold numerically for centered and off-center viewer positions?  
9\. What physical operating range produces a convincing and stable illusion?

# Success Criteria

The project should advance beyond Milestone 0 only if the core illusion is technically credible.

Initial success evidence should include:

• Synthetic projection tests demonstrate that the physical display corners map correctly to the expected normalized-device-coordinate boundaries for centered and off-center viewer positions.  
• Head movement produces the expected physical-window behavior rather than merely rotating or translating a conventional camera.  
• The scene remains visually stable when the viewer is stationary.  
• Normal head movement feels responsive without obvious lag, jitter, or “swimming.”  
• Tracking loss and reacquisition do not produce abrupt camera jumps.  
• The packaged application operates fully offline with locally bundled tracking, rendering, world, and configuration assets and no runtime network dependency.  
• Camera permission denial and retry are handled safely.  
• The system can be exercised through a deterministic simulated viewer without webcam access.  
• At least one pose-estimation strategy demonstrates acceptable repeatability across normal seated viewing distances.  
• The diagnostic room creates a subjectively convincing window effect sufficient to justify building real worlds.

Provisional engineering targets may be used during Milestone 0, but final numerical acceptance thresholds should be set from measured hardware behavior rather than invented in advance.

# Major Risks

Monocular depth accuracy  
A single consumer webcam may estimate lateral position well while producing noisy or biased depth. This is the primary technical risk.

Calibration burden  
The illusion may require more physical calibration than is acceptable for ordinary users. The project should first attempt simple screen-dimension, camera-offset, and known-distance calibration before introducing full camera-intrinsic workflows.

Latency and jitter  
A mathematically correct projection can still feel wrong if tracking is delayed or noisy.

Platform WebView behavior  
Tauri uses platform WebViews, so camera permissions, WASM, workers, and GPU behavior must be verified in packaged builds rather than only in a browser dev server.

Coordinate-system errors  
Sign, axis, or transform mistakes can create an effect that looks plausible but is physically wrong. Numerical tests are mandatory.

License contamination  
Some closely related demonstrations have missing or ambiguous source licenses. They may be used for research and behavioral comparison only.

Premature architecture growth  
Adding OpenCV, physics, ECS, WebGPU, additional rendering frameworks, or custom asset infrastructure before a demonstrated requirement would increase implementation risk and make AI-assisted work harder to verify.

# AI-Assisted Development Strategy

The project should be designed so that expensive reasoning is concentrated at decision points while implementation is broken into narrow, testable assignments.

Luna should handle highly constrained scaffolding, schemas, adapters, deterministic utilities, UI implementation, basic tests, diagnostic geometry, and other work where the interface and expected behavior are already fixed.

Terra should handle bounded multi-API integrations such as adapting the MediaPipe worker, packaging local model assets, Tauri/WebView integration, pose-estimator implementations, and other tasks with moderate lifecycle or integration complexity.

A stronger reasoning model should be reserved primarily for:

• Freezing coordinate conventions and core contracts.  
• Designing numerical test oracles for off-axis projection.  
• Interpreting real-world pose-estimation experiments.  
• Deciding whether a more complex estimator such as solvePnP is justified.  
• Diagnosing failures that cross tracking, calibration, projection, and rendering boundaries.  
• Reviewing architecture at milestone boundaries.

The target work pattern is: define interface \+ provide licensed reference \+ provide tests \+ ask the implementation model to adapt the reference until the tests pass.

# Decision and Change Policy

This charter intentionally records principles and boundaries rather than every implementation detail.

Major changes should be documented when they affect one or more of the following:

• The purpose or scope of the engine.  
• The engine/world boundary.  
• The physical coordinate model.  
• The selected rendering or tracking platform.  
• The reuse/licensing policy.  
• A major dependency added to solve an experimental failure.  
• Milestone 0 feasibility conclusions.

Technical alternatives that are important enough to preserve should later be captured as Architecture Decision Records (ADRs).

Research findings are not automatically permanent architecture. Milestone 0 measurements take priority over assumptions.

# Next Artifacts

After this charter is reviewed and approved, the next planning artifacts should be developed in roughly this order:

1\. Product Specification / PRD.  
2\. Non-functional Requirements.  
3\. Interface / Contract Specification.  
4\. Technical Design Specification.  
5\. Architecture Decision Records for the major researched choices.  
6\. Testing Strategy.  
7\. Milestone Roadmap.  
8\. Detailed Functional and UX/UI Specifications as the relevant features approach implementation.  
9\. Data/Persistence specification if calibration, settings, or world metadata grow beyond a simple configuration model.  
10\. Task Specifications and Definition of Done derived from each implementation milestone.

The early Interface / Contract Specification is especially important because precise boundaries and executable tests are what will allow Luna and Terra to perform most implementation work safely.

# Resolved Charter Decisions

The following project-level decisions are now resolved and should be treated as charter constraints unless deliberately changed later.

1\. Platform: World Viewer is Windows-only. Cross-platform support is outside the current product scope.  
2\. Camera placement: the initial product assumes the integrated laptop camera fixed above the display. Arbitrary external camera placement and camera-offset calibration may be added in later versions.  
3\. World packaging: each virtual world will be its own self-contained package. The sole intended user will add, update, or remove world packages as they are planned and built; no marketplace or end-user distribution workflow is required.  
4\. Offline operation: fully offline runtime operation is a hard product requirement. Tracking models, WASM, world assets, configuration, and ordinary application behavior must not depend on network access.  
5\. Display dimensions: physical display width and height will be entered manually in Settings. Automated tests may use one default synthetic display profile.  
6\. Calibration complexity: calibration should remain deliberately simple. The product is optimized for one known user and reference laptop, but should not require an unnecessarily complex camera-calibration workflow.  
7\. Perspective strength: the UI should expose an optional artistic perspective-strength control in addition to the physically calibrated baseline.  
8\. Naming: the application/product is named World Viewer. The broader project remains Portal Sim for project organization.  
9\. Reference hardware: Milestone 0 will be developed and accepted on the Lenovo ThinkPad E590 (machine type/model 20NB005RUS) described below.

# Reference Development / Acceptance Hardware

Milestone 0 will use the following reference configuration. This is a development and acceptance baseline, not a general minimum-system-requirements specification.

Computer  
• Lenovo ThinkPad E590, machine type/model 20NB005RUS.  
• Windows 11 Pro, version 25H2.  
• Intel Core i5-8265U processor.  
• 16 GB RAM.  
• Intel UHD Graphics 620 integrated GPU.

Display  
• Internal 15.6-inch display.  
• 1920 × 1080 active resolution.  
• Approximately 59.98 Hz refresh rate.  
• 8-bit RGB SDR.  
• Physical active area: approximately 345.4 mm wide × 194.3 mm high.  
• Physical display dimensions will remain editable through Settings.

Camera assumptions  
• Integrated Lenovo laptop webcam in the upper display bezel.  
• Fixed relative to the display.  
• Nominal 720p camera.  
• Fixed-focus assumption for the reference profile.  
• Initial geometric assumption: camera is horizontally centered over the display.  
• Arbitrary camera placement is not required for the initial version.  
• Camera field of view must not be hard-coded because a reliable calibrated FOV is not established.  
• Actual capture resolution, frame rate, device identity, and exposed MediaStreamTrack settings/capabilities should be recorded by World Viewer at runtime during Milestone 0\.

Reference geometry  
• The screen-plane origin should be based on the physical center of the visible display area.  
• The display half-width is approximately 172.7 mm and half-height approximately 97.15 mm.  
• The webcam’s vertical offset above the display center may initially be represented by a simple reference-profile value and refined by one physical measurement if needed.  
• Automated projection tests should use a deterministic synthetic display profile independent of this physical laptop profile.

The remaining hardware values that should be recorded during Milestone 0 are Windows display scaling, the exact usable webcam capture modes reported at runtime, the camera-to-screen-center vertical offset if needed, and a normal seated viewing-distance range.

