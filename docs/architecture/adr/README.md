# Architecture Decision Records — Index

## Draft v0.4

# Document Status

Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
ADR folder: https://drive.google.com/drive/folders/1SOAX740CX8-dWQ1PSnq9G\_TmEvW6NDpQ

This index is the navigation and status register for architecture decisions. Individual ADR documents in the ADRs subfolder are the authoritative decision records. The previous combined ADR draft was split into individual records to reduce context size, token usage, and irrelevant architectural context during human and AI-assisted development.

# 1\. Governance

• Once implementation begins, an Accepted ADR is locked and its historical decision text is not rewritten.  
• A material replacement is recorded in a new superseding ADR while the original remains for history.  
• Direct replacements use derivative numbering: ADR-006.01 supersedes ADR-006; another replacement on that decision line would use ADR-006.02.  
• New architectural decisions that do not directly replace an earlier ADR receive the next whole-number ADR.  
• The index may be updated as statuses and supersession links change without modifying locked ADR content.

Statuses: Accepted; Accepted — validate in Milestone 0; Accepted — tune in Milestone 0; Experimental; Deferred; Superseded.

# 2\. Decision Register

ADR-001 | Accepted | Windows Desktop Application Using Tauri 2  
Repo-local record: [ADR-001](ADR-001%20%E2%80%94%20Windows%20Desktop%20Application%20Using%20Tauri%202.md)
Document: https://docs.google.com/document/d/1vRwMeAAJPKbx6i8d8dMBpzGx8yfKd1sh\_BqdfpBFreg/edit?usp=drivesdk  
ADR-002 | Accepted | Imperative Three.js Engine; React for Application UI  
Repo-local record: [ADR-002](ADR-002%20%E2%80%94%20Imperative%20Three.js%20Engine%3B%20React%20for%20Application%20UI.md)
Document: https://docs.google.com/document/d/15qFG6B9z7\_9QoPYMF5y9ta7IAQ9XBEC5ppR1HRSTngc/edit?usp=drivesdk  
ADR-003 | Accepted | Canonical Screen Coordinate System and Millimeter Units  
Repo-local record: [ADR-003](ADR-003%20%E2%80%94%20Canonical%20Screen%20Coordinate%20System%20and%20Millimeter%20Units.md)
Document: https://docs.google.com/document/d/1fLQnWItGnGoOwtTHoj6Gj6Ae4mfuZyhV3efHU5DPAyA/edit?usp=drivesdk  
ADR-004 | Accepted | ViewerPoseSource as the Primary Viewer-Input Boundary  
Repo-local record: [ADR-004](ADR-004%20%E2%80%94%20ViewerPoseSource%20as%20the%20Primary%20Viewer-Input%20Boundary.md)
Document: https://docs.google.com/document/d/1p-HSB3\_484CFXyKvKI89ihpuFPsDZohqcIa22W5jbSc/edit?usp=drivesdk  
ADR-005 | Accepted — validate in Milestone 0 | Worker-Based MediaPipe Tracking with Latest-Frame Backpressure  
Repo-local record: [ADR-005](ADR-005%20%E2%80%94%20Worker-Based%20MediaPipe%20Tracking%20with%20Latest-Frame%20Backpressure.md)
Document: https://docs.google.com/document/d/1x5kTtCnB3\_NDnR0OVcnJ0LPb2-OTNBpO6DuzLg3cb7g/edit?usp=drivesdk  
ADR-006 | Experimental | Pose Estimator Selected by Measurement, Not Assumption  
Repo-local record: [ADR-006](ADR-006%20%E2%80%94%20Pose%20Estimator%20Selected%20by%20Measurement%2C%20Not%20Assumption.md)
Document: https://docs.google.com/document/d/1zfuWKr7bmWbFHxS6lbmZeS50bhORUbI\_TZp\_TKtnrfo/edit?usp=drivesdk  
ADR-007 | Accepted — tune in Milestone 0 | One Euro Filtering as Baseline Pose Smoothing  
Repo-local record: [ADR-007](ADR-007%20%E2%80%94%20One%20Euro%20Filtering%20as%20Baseline%20Pose%20Smoothing.md)
Document: https://docs.google.com/document/d/1U9guWE4Yg7SemU84T310B62qpFMYx46fiZGcopEyGX4/edit?usp=drivesdk  
ADR-008 | Accepted | Engine-Owned Off-Axis Projection  
Repo-local record: [ADR-008](ADR-008%20%E2%80%94%20Engine-Owned%20Off-Axis%20Projection.md)
Document: https://docs.google.com/document/d/1HwOmESZ\_x9YV-odhDRZQbLd7Id4H1u3AYHaApkAJ1nk/edit?usp=drivesdk  
ADR-009 | Accepted | Simple Fixed-Camera Calibration First  
Repo-local record: [ADR-009](ADR-009%20%E2%80%94%20Simple%20Fixed-Camera%20Calibration%20First.md)
Document: https://docs.google.com/document/d/1wwRszRFPEh4YcjjIi06pIb\_qIjyGPUORzxOnX1\_7XWU/edit?usp=drivesdk  
ADR-010 | Accepted | Self-Contained Local World Packages  
Repo-local record: [ADR-010](ADR-010%20%E2%80%94%20Self-Contained%20Local%20World%20Packages.md)
Document: https://docs.google.com/document/d/18SfvGi4D2jP7m3Zu66ySqL9U5dDBS87sFDv91plejKw/edit?usp=drivesdk  
ADR-011 | Accepted — validate in Milestone 0 | Prebuilt ESM World Bundles Loaded at Runtime  
Repo-local record: [ADR-011](ADR-011%20%E2%80%94%20Prebuilt%20ESM%20World%20Bundles%20Loaded%20at%20Runtime.md)
Document: https://docs.google.com/document/d/1yRU7iMUYoBpUacmOtRx3WVTMKXBaWo46niP6YO7S8TQ/edit?usp=drivesdk  
ADR-012 | Accepted | World Bundles May Carry Their Own Runtime Dependencies  
Repo-local record: [ADR-012](ADR-012%20%E2%80%94%20World%20Bundles%20May%20Carry%20Their%20Own%20Runtime%20Dependencies.md)
Document: https://docs.google.com/document/d/1PpdrdA5aAWO0FoWpmqy3gd37byVYc2E0PPfBc-bb3B0/edit?usp=drivesdk  
ADR-013 | Accepted | JSON Schema plus Separate UI Hints for World Settings  
Repo-local record: [ADR-013](ADR-013%20%E2%80%94%20JSON%20Schema%20plus%20Separate%20UI%20Hints%20for%20World%20Settings.md)
Document: https://docs.google.com/document/d/1z0\_mtzfvnA4GHAPBFNj0uyDlKBqFHtbLoGksDBJWNX8/edit?usp=drivesdk  
ADR-014 | Accepted | Versioned JSON Persistence with Atomic Writes  
Repo-local record: [ADR-014](ADR-014%20%E2%80%94%20Versioned%20JSON%20Persistence%20with%20Atomic%20Writes.md)
Document: https://docs.google.com/document/d/1l0OUFyZe9YjLur0zQR22-SjcHfAIxRia-kGqR7HYAGA/edit?usp=drivesdk  
ADR-015 | Accepted | No Global Redux-Style State Framework Initially  
Repo-local record: [ADR-015](ADR-015%20%E2%80%94%20No%20Global%20Redux-Style%20State%20Framework%20Initially.md)
Document: https://docs.google.com/document/d/11vSFqq-zIBas9WbuzGHghC9F0bEF-KZ8W4fa6ase4uM/edit?usp=drivesdk  
ADR-016 | Accepted | Fully Offline Runtime with Restrictive CSP  
Repo-local record: [ADR-016](ADR-016%20%E2%80%94%20Fully%20Offline%20Runtime%20with%20Restrictive%20CSP.md)
Document: https://docs.google.com/document/d/1ejEPBRmprnYMpqQKFEX53nU7-OzyNXDAmUCxXR9EV1s/edit?usp=drivesdk  
ADR-017 | Accepted | Single Structured Diagnostic JSON Export  
Repo-local record: [ADR-017](ADR-017%20%E2%80%94%20Single%20Structured%20Diagnostic%20JSON%20Export.md)
Document: https://docs.google.com/document/d/1G2qDrRyo1lOkhCwjtk6ejY4VUE50qfOOptm634q3XiY/edit?usp=drivesdk  
ADR-018 | Accepted — tune in Milestone 0 | Tracking-Loss and Reacquisition Timing Defaults  
Repo-local record: [ADR-018](ADR-018%20%E2%80%94%20Tracking-Loss%20and%20Reacquisition%20Timing%20Defaults.md)
Document: https://docs.google.com/document/d/1h62Fu1Rt3eyqJ1Oh5Cq5s8pUsBH19iAv-7NikcvX6xk/edit?usp=drivesdk  
ADR-019 | Accepted | Viewer State Is Frame-Scoped Only  
Repo-local record: [ADR-019](ADR-019%20%E2%80%94%20Viewer%20State%20Is%20Frame-Scoped%20Only.md)
Document: https://docs.google.com/document/d/1NlakbxzBBPgMqA6bvCqwe2EEldacgr-ydC5khL1eW24/edit?usp=drivesdk  
ADR-020 | Accepted | Prove Core Geometry and Packaged Infrastructure Before Content  
Repo-local record: [ADR-020](ADR-020%20%E2%80%94%20Prove%20Core%20Geometry%20and%20Packaged%20Infrastructure%20Before%20Content.md)
Document: https://docs.google.com/document/d/1MyjJEgpEqODU9Ql97r7RaoG0l1LpxkjiPcTqa9CdJao/edit?usp=drivesdk

# 3\. Evidence-Gated Follow-Up ADRs

The following decisions are intentionally deferred until Milestone 0 produces evidence:  
• production viewer-pose estimator selection; when it replaces ADR-006, use ADR-006.01  
• final calibration model and any additional required user measurement  
• final One Euro implementation/package and tuned parameters if architecture-relevant  
• exact packaged Tauri mechanism for loading local world ESM modules  
• exact camera-frame transfer representation used by the tracking worker  
• any decision to introduce OpenCV/solvePnP  
• any decision to move from versioned JSON persistence to SQLite  
• any decision to introduce a shared world runtime/SDK  
• any decision to replace WebGLRenderer with WebGPURenderer

These are evidence-gated choices, not missing architecture.

# 4\. ADR Coverage Review — Oracle and Reuse Governance

Review date: September 19, 2026  
Scope: oracle-first delegation, Test/Oracle Ownership Policy, Mandatory Reuse Gate, Oracle Registry, Reuse & Dependency Register, and their repository placement/ownership rules.  
Conclusion: no new ADR is required for these governance/process mechanisms at this time.  
Rationale:  
• The oracle-first delegation pattern and A/B/C test-oracle ownership policy govern development/verification workflow. They do not change World Viewer runtime architecture, public contracts, persistence format, packaging model, tracking pipeline, rendering model, or world-host boundary.  
• The Mandatory Reuse Gate governs how already-approved architecture/dependency choices are consumed by implementation agents. The gate itself does not select a new runtime architecture.  
• docs/testing/oracle-registry.md and docs/reuse-register.md are lightweight navigation/implementation aids. They index decisions and authoritative sources; they do not create architecture authority or replace ADRs/specifications.  
• Ordinary package/library selections do not receive ADRs merely because they are recorded in the Reuse Register. An ADR is required only when the underlying choice materially shapes or changes architecture, public/runtime boundaries, persistence/packaging/security behavior, or supersedes an accepted architectural decision.  
Existing ADR coverage relevant to the current reuse baseline:  
• Tauri 2 desktop shell/native boundary — ADR-001.  
• Imperative Three.js rendering with React application UI — ADR-002. Choosing normal Three.js loaders/utilities within that architecture is implementation-level unless it changes the boundary.  
• MediaPipe worker tracking architecture/latest-frame backpressure — ADR-005. Exact package/model/WASM versions remain implementation/evidence choices unless they materially alter the architecture.  
• One Euro filtering as the baseline smoothing family — ADR-007. The eventual implementation/package and tuned defaults need a new/superseding ADR only if architecture-relevant, as already listed in Section 3\.  
• Engine-owned off-axis projection — ADR-008. Reference implementations/oracles supporting the mathematics do not require their own ADR unless the projection architecture changes.  
• JSON Schema \+ UI hints settings architecture — ADR-013. Ajv is the approved validator implementation choice in the TDS/Reuse Register and does not warrant a standalone ADR unless validation ownership/architecture changes.  
• Versioned JSON persistence with atomic writes — ADR-014. Ordinary supporting libraries do not require ADRs unless they change the persistence architecture.  
• Fully offline runtime/CSP constraints — ADR-016. Reuse entries must satisfy this existing architecture rather than creating a new ADR for each compatible package.  
Choices that remain explicit ADR triggers:  
• production estimator selection superseding ADR-006 → ADR-006.01 or later derivative.  
• introduction of OpenCV/solvePnP when it materially changes the pose-estimation/calibration architecture.  
• replacement of WebGLRenderer with WebGPURenderer.  
• move from versioned JSON persistence to SQLite.  
• introduction of a shared world runtime/SDK that changes package/runtime ownership.  
• material replacement of the accepted local ESM loading mechanism, worker frame-transfer mechanism, calibration model, or other evidence-gated architecture once frozen.  
Ordinary-library rule:  
Do not create ADRs for Ajv version changes, semver package selection, structured-logging library selection, RJSF evaluation/adoption, test-library utilities, small helper packages, or similar implementation-level dependencies unless the choice changes an accepted architecture boundary or creates a durable cross-subsystem constraint that cannot be adequately governed by the TDS, Reuse Register, handoff notes, and tests.  
Review outcome:  
• ADR-001 through ADR-020 remain sufficient for the currently accepted architecture.  
• No ADR-021 is created by this review.  
• The Oracle Registry and Reuse Register must point to ADRs when an entry consumes an architecture-significant decision, but they must not generate ADRs mechanically for ordinary entries.  
• Future M0 evidence may still create/supersede ADRs under Section 3 and the governance rules above.
