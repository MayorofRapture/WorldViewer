# World Package Conformance Specification

## Draft v0.4

# Document Status

Draft version: 0.4  
Date: September 19, 2026  
Project: Portal Sim  
Product / application: World Viewer  
Artifact: World Package Conformance Specification

Primary upstream authorities:  
• Interface & Contract Specification, Draft v0.6  
• Technical Design Specification, Draft v0.18  
• Testing Strategy, Draft v0.15  
• Architecture Decision Records — Index, Draft v0.4  
• Milestone Roadmap, Draft v0.15  
Companion execution artifact:  
• Task Specification & Definition of Done Template, Draft v0.4

Purpose of this revision:  
This document translates the approved world-package architecture into a compact, executable conformance contract. Draft v0.4 adds registry-aware execution without changing conformance authority: ordinary Luna/Terra world-package tasks cite applicable ORC-\* and REUSE-\* IDs when those records exist, while WPC requirement IDs/sections remain the governing world-package conformance contract.

Authority rule:  
This document does not grant capabilities that are absent from the Interface & Contract Specification or accepted ADRs. If this document conflicts with an accepted ADR or the Interface & Contract Specification, the higher-authority artifact wins and this document must be corrected. WPC requirement IDs/sections remain the governing world-package conformance contract. ORC-\* entries identify accepted reusable tests/procedures and REUSE-\* entries identify approved reuse decisions; neither registry may override or redefine a WPC requirement. The diagnostic reference world and conformance tests are implementation evidence; they do not silently override the written contract.

# 1\. Purpose

The World Package Conformance Specification defines what it means for a local World Viewer world package to be structurally, behaviorally, and operationally compatible with the host.

The specification exists to achieve four goals:

1\. Make world-package correctness executable rather than dependent on model memory or reviewer interpretation.  
2\. Provide a small context artifact for AI-assisted implementation.  
3\. Prevent world code from becoming coupled to host-private tracking, projection, native, persistence, or UI implementation.  
4\. Make the diagnostic room a trustworthy reference implementation without giving it privileged behavior.

The preferred agent workflow is:

Task specification conforming to the Task Specification & Definition of Done Template  
\+ this conformance specification  
\+ relevant source files  
\+ relevant conformance tests  
\+ diagnostic reference world when useful  
→ bounded implementation  
→ automated verification

Ordinary world-package work should not require an agent to load the full PRD, NFR, TDS, Testing Strategy, and ADR set unless the task explicitly crosses those boundaries.

# 2\. Scope and Non-Goals

This specification governs:

• package discovery shape  
• manifest validity  
• public world-facing capabilities  
• forbidden host/private dependencies  
• lifecycle behavior  
• frame-scoped viewer-state delivery  
• settings validation and delivery  
• package-local asset access  
• error/failure behavior  
• resource ownership and cleanup expectations  
• reusable conformance suites  
• test fixture worlds  
• diagnostic reference-world expectations  
• static architecture-boundary enforcement  
• the minimum evidence required to call a world package conformant

This specification does not define:

• head tracking  
• pose estimation  
• filtering  
• display calibration  
• off-axis projection mathematics  
• engine camera implementation  
• Tauri/native implementation details  
• application-wide persistence formats beyond world settings behavior  
• the exact packaged local-ESM loading mechanism  
• the final name/location of a public world SDK module  
• world-specific simulation, art, AI, physics, or rendering design  
• a public marketplace or third-party distribution model

Those remain governed by their existing project artifacts.

# 3\. Normative Language and Requirement IDs

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative in this document.

Requirement identifiers use the prefix WPC:

• WPC-DIR — package directory/discovery  
• WPC-MAN — manifest  
• WPC-API — public world API/capability surface  
• WPC-ISO — isolation/import boundaries  
• WPC-LIFE — lifecycle  
• WPC-FRAME — frame/viewer-state behavior  
• WPC-SET — settings  
• WPC-ASSET — assets  
• WPC-ERR — failure/recovery  
• WPC-RES — resource ownership/cleanup  
• WPC-TEST — conformance harness  
• WPC-REF — diagnostic reference world  
• WPC-AGENT — agent usage rules

Tests SHOULD reference the corresponding requirement ID in their name or metadata where practical.

# 4\. Conformance Levels

World Viewer should distinguish three useful levels of conformance.

Structural conformance  
A package can be discovered and validated without executing world code. Its directory shape, manifest, identifiers, compatibility range, entry path, and referenced schema/UI files are valid and contained within the package root.

Behavioral conformance  
The loaded world implementation obeys the public API, lifecycle, settings, viewer-state, asset, isolation, failure, and cleanup rules.

Packaged-runtime conformance  
The package passes the applicable behavior in the real packaged Tauri/WebView2 application, fully offline, using the production package-loading path.

A package may be described as “structurally conformant” or “behaviorally conformant” when only that level has been established.

A package MUST NOT be called simply “World Viewer conformant” unless all mandatory structural, behavioral, and packaged-runtime checks applicable to that package pass.

# 5\. Canonical Package Shape

Current canonical package shape:

worlds/  
  \<package-directory\>/  
    world.manifest.json  
    dist/  
      \<manifest-declared-entry\>.js  
    assets/  
      ...  
    settings.schema.json      optional  
    settings.ui.json          optional

The filename under dist/ is not itself the contract. The manifest-declared entry is authoritative as long as it satisfies package-boundary rules.

WPC-DIR-001 — Each immediate child directory of the configured world package directory is one package candidate.

WPC-DIR-002 — Discovery MUST be non-recursive.

WPC-DIR-003 — A package candidate MUST contain world.manifest.json to be eligible.

WPC-DIR-004 — Invalid packages MUST be skipped/reported without aborting discovery of other packages.

WPC-DIR-005 — Discovery and loading MUST require no network access.

WPC-DIR-006 — Package IDs MUST be unique within the configured package directory.

WPC-DIR-007 — Package contents are treated as package-owned runtime inputs; ordinary settings persistence MUST NOT rewrite the package itself.

Development-source repositories MAY use any internal source layout. Runtime conformance applies to the produced package boundary.

# 6\. World Manifest Conformance

Current manifest shape:

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

WPC-MAN-001 — Manifest validation MUST occur before executable world code is loaded.

WPC-MAN-002 — id MUST be a stable reverse-domain identifier, for example local.logan.aquarium.

WPC-MAN-003 — version MUST use valid semantic-version syntax.

WPC-MAN-004 — engineApi MUST be a valid semantic-version range.

WPC-MAN-005 — the host MUST reject a package whose engineApi range is incompatible with the running host API version.

WPC-MAN-006 — entry MUST resolve within the package root.

WPC-MAN-007 — settings.schema and settings.ui, when present, MUST resolve within the package root.

WPC-MAN-008 — path traversal outside the package root MUST be rejected before executable package code runs.

WPC-MAN-009 — required schema-version incompatibility MUST fail validation.

WPC-MAN-010 — unknown fields MAY be preserved or ignored according to schema-version policy but MUST NOT be treated as implicit new capabilities.

WPC-MAN-011 — duplicate package IDs MUST be reported deterministically and MUST NOT result in ambiguous activation.

The conformance harness should contain both positive and negative manifest fixtures for every rule above.

# 7\. Public World API Surface

World code receives only the capabilities intentionally exposed by the world-facing contract.

Current conceptual public surface:

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

WPC-API-001 — The host MUST expose only documented world-facing capabilities.

WPC-API-002 — WorldSceneRoot is the world-owned scene root. A world MUST attach its scene content beneath that root rather than assuming ownership of the host scene.

WPC-API-003 — World code MUST NOT receive the mutable engine camera.

WPC-API-004 — World code MUST NOT receive ProjectionController.

WPC-API-005 — World code MUST NOT receive webcam/media-capture control.

WPC-API-006 — World code MUST NOT receive MediaPipe or tracking-source internals.

WPC-API-007 — World code MUST NOT receive calibration repositories or profile stores.

WPC-API-008 — World code MUST NOT receive NativeHost, unrestricted Tauri APIs, or unrestricted filesystem access.

WPC-API-009 — World code MUST NOT receive other worlds’ roots, settings, or private state.

WPC-API-010 — Host-internal packaged-smoke capabilities are test infrastructure and MUST NOT appear in the world-facing API.

The exact module/package import name used to expose these contracts is intentionally not frozen by this document. Agents MUST NOT invent or rename that import surface without an explicit implementation decision.

# 8\. Allowed and Forbidden Dependencies

The purpose of dependency rules is not to create a heavy sandbox. It is to preserve the architectural boundary that makes worlds interchangeable.

Allowed categories:

• the documented public world-facing API/SDK surface  
• package-internal modules  
• bundled world runtime dependencies permitted by accepted ADRs, including Three.js if the world bundles it  
• package-local assets resolved through the host-provided asset service  
• ordinary language/runtime utilities that do not bypass host capability boundaries

WPC-ISO-001 — A world MUST NOT import host-private engine modules.

WPC-ISO-002 — A world MUST NOT import tracking, pose-estimation, filtering, calibration, projection, persistence, or native-host implementation modules.

WPC-ISO-003 — A world MUST NOT use direct Tauri/native calls to bypass WorldContext.

WPC-ISO-004 — A world MUST NOT directly acquire webcam/media devices.

WPC-ISO-005 — A world MUST NOT depend on remote runtime assets or network services for normal operation.

WPC-ISO-006 — A world MUST NOT manipulate host application UI directly. World-specific user settings are expressed through the settings schema/UI-hints contract.

WPC-ISO-007 — A world MUST NOT reach outside its package root for runtime assets.

WPC-ISO-008 — The host CSP and package loader are defense-in-depth; they do not replace static/import-boundary checks.

Implementation note:  
The exact enforcement mechanism may use lint rules, TypeScript path restrictions, build-time import inspection, a purpose-built checker, or a combination. The mechanism is a TDS/implementation detail. The forbidden boundary is the stable requirement.

# 9\. Lifecycle Conformance

Required lifecycle:

1\. Host validates package, manifest, compatibility, and settings.  
2\. Host creates a fresh world-owned root.  
3\. Host loads/constructs the world implementation.  
4\. initialize(context) is called exactly once.  
5\. update(frame) begins only after successful initialization.  
6\. Validated settings changes may be delivered through onSettingsChanged.  
7\. resize(viewport) may be delivered when implemented.  
8\. Before switch/shutdown, updates stop.  
9\. dispose() is called.  
10\. Host removes the world root and verifies host-observable cleanup as practical.

WPC-LIFE-001 — initialize MUST be called exactly once per world activation.

WPC-LIFE-002 — update MUST NOT be called before initialize succeeds.

WPC-LIFE-003 — If initialize throws/rejects, the host MUST treat activation as failed and MUST NOT begin update.

WPC-LIFE-004 — A failed activation MUST NOT be persisted as the successfully active world.

WPC-LIFE-005 — update calls MUST stop before dispose begins.

WPC-LIFE-006 — dispose MUST be called during normal switch and shutdown for a successfully initialized world.

WPC-LIFE-007 — Host cleanup MUST continue on a best-effort basis if world dispose throws/rejects.

WPC-LIFE-008 — A world switch MUST use a fresh world-owned root; stale scene ownership MUST NOT carry across activations.

WPC-LIFE-009 — A world MUST tolerate validated settings and resize delivery according to the implemented optional callbacks without assuming those callbacks exist when it does not implement them.

WPC-LIFE-010 — Repeated load/switch/unload cycles MUST not accumulate unbounded world-owned resources.

The conformance suite MUST use a controllable harness rather than relying only on the full application render loop.

# 10\. Frame and Viewer-State Conformance

Viewer state is frame-scoped by architectural decision.

WPC-FRAME-001 — ViewerState MUST be delivered only through WorldFrame in update() in the initial world API.

WPC-FRAME-002 — The host MUST NOT expose getViewerState() or an equivalent asynchronous accessor to worlds unless a future superseding architecture decision explicitly adds one.

WPC-FRAME-003 — WorldFrame.viewer MUST be read-only from the world’s perspective.

WPC-FRAME-004 — All data in a single WorldFrame MUST represent one coherent host frame snapshot.

WPC-FRAME-005 — A world MAY retain derived world-specific information from a prior frame, but MUST NOT mutate host ViewerState.

WPC-FRAME-006 — ViewerState is provided for optional world reactions; worlds MUST NOT use it to control or replace the host projection camera.

Reference-world tests should demonstrate that a world can react to viewer state without gaining camera control.

# 11\. World Settings Conformance

World settings consist of two separate concerns:

• settings.schema.json — JSON Schema Draft 2020-12 validation/data contract  
• settings.ui.json — host-rendered presentation hints

Initial expected data shapes:  
• boolean  
• string  
• number  
• integer  
• enum  
• flat or modestly nested object groups

Arrays and complex conditional schemas are not assumed supported until demonstrated need exists.

WPC-SET-001 — JSON Schema is authoritative for allowed setting values.

WPC-SET-002 — UI hints MUST NOT alter validation semantics.

WPC-SET-003 — Unsupported UI hints MUST fall back safely to host defaults rather than invalidating otherwise valid settings.

WPC-SET-004 — UI-hint property targeting uses JSON Pointer paths.

WPC-SET-005 — Settings MUST validate before they are delivered to world code.

WPC-SET-006 — Invalid persisted settings MUST NOT be delivered to a world.

WPC-SET-007 — World package contents MUST NOT be rewritten to store user settings.

WPC-SET-008 — Valid saved settings are preserved only within the same package version according to the approved persistence contract.

WPC-SET-009 — When package version changes, saved world settings MUST reset to the current package defaults.

WPC-SET-010 — A world MUST receive settings as read-only data.

WPC-SET-011 — A world MUST NOT mount or inject a private settings UI into the host application.

WPC-SET-012 — The diagnostic reference world MUST include a small representative schema exercising at least boolean, numeric, and enum/select behavior unless later implementation evidence shows one of those is not part of the supported baseline.

# 12\. Asset Isolation Conformance

Worlds use a host-provided package-relative resolver/service rather than unrestricted filesystem access.

Current conceptual service:

interface WorldAssetService {  
  resolve(relativePath: string): string;  
}

WPC-ASSET-001 — resolve() MUST accept package-relative paths only.

WPC-ASSET-002 — path traversal outside the package root MUST be rejected.

WPC-ASSET-003 — remote/network asset URLs MUST be rejected for normal world assets.

WPC-ASSET-004 — resolved asset representation MAY be a Tauri/local URL chosen by the host implementation.

WPC-ASSET-005 — Worlds SHOULD use mature Three.js loaders and other normal library primitives after resolving the package-local asset path. The host asset service MUST NOT become a redundant reimplementation of Three.js loading.

WPC-ASSET-006 — A world MUST NOT access another world’s assets through package-relative resolution.

WPC-ASSET-007 — At least one conformance/reference test MUST load a real package-local asset through the production resolver path.

WPC-ASSET-008 — Missing/corrupt asset behavior MUST produce a bounded world/package error path rather than corrupt host-global state.

# 13\. Error and Recovery Expectations

The host must remain recoverable from a bad world package.

WPC-ERR-001 — Malformed manifest: skip/report package; continue discovering other packages.

WPC-ERR-002 — Incompatible engineApi: reject activation before world code executes.

WPC-ERR-003 — Invalid entry/settings path: reject before world code executes.

WPC-ERR-004 — initialize failure: stop activation, never call update, clean partial host-owned state, report structured error.

WPC-ERR-005 — update failure: stop normal updates for that world, transition to a defined safe/error state, perform cleanup/disposal best effort, and keep host recovery possible.

WPC-ERR-006 — dispose failure: report structured error, continue host-owned cleanup, and do not make the entire application unusable.

WPC-ERR-007 — invalid settings: reject before delivery; retain or restore the last valid/default settings according to persistence policy.

WPC-ERR-008 — asset boundary violation: reject and report; never broaden filesystem capability as a fallback.

WPC-ERR-009 — one failed package MUST NOT corrupt global display, calibration, package-directory, or other-world settings.

WPC-ERR-010 — expected fixture failures MUST be distinguishable from unexpected test-harness failures.

Error-code names/structures remain governed by the host error contract. This document defines the required behavior, not a competing error taxonomy.

# 14\. Resource Ownership and Cleanup

World code owns the resources it creates unless an explicit host API documents otherwise.

WPC-RES-001 — World-owned Three.js geometry, materials, textures, render targets, audio resources, timers, subscriptions, listeners, and similar resources MUST be released or made collectible during dispose as appropriate.

WPC-RES-002 — The host MUST remove the world-owned scene root after disposal even if world cleanup is imperfect.

WPC-RES-003 — The conformance harness SHOULD expose host-observable resource sentinels where practical.

WPC-RES-004 — A fixture world SHOULD intentionally allocate representative resources so cleanup behavior can be tested.

WPC-RES-005 — Full leak acceptance remains governed by the Testing Strategy’s 25-cycle measurement. A one-off lifecycle conformance test does not replace that acceptance test.

WPC-RES-006 — Resource cleanup helpers SHOULD be added to the public world API only after a demonstrated cross-world need. Do not expand the API merely to make one test easier.

# 15\. Reusable Conformance Harness

The repository should provide reusable suites rather than world-specific copies of the same assertions.

Recommended conceptual structure:

tests/  
  conformance/  
    world-manifest.conformance.ts  
    world-lifecycle.conformance.ts  
    world-settings.conformance.ts  
    world-assets.conformance.ts  
    world-isolation.conformance.ts

src/ or tests/  
  testkit/  
    world-harness.ts  
    fake-world-context.ts  
    fake-world-assets.ts  
    resource-sentinel.ts  
    fixtures/

Exact paths may change to fit the repository, but the separation between reusable conformance logic and individual-world tests SHOULD remain.

WPC-TEST-001 — Conformance suites MUST be callable against more than one world implementation/package.

WPC-TEST-002 — The diagnostic room MUST use the same applicable conformance suites as production worlds.

WPC-TEST-003 — Tests MUST NOT contain diagnostic-room-specific exceptions that effectively privilege it over future worlds.

WPC-TEST-004 — Time-dependent lifecycle behavior SHOULD use controlled clocks/events rather than arbitrary sleeps.

WPC-TEST-005 — Failure fixtures MUST fail deterministically.

WPC-TEST-006 — Packaged-runtime checks MUST separately verify behaviors that headless unit/integration tests cannot prove, especially local ESM loading, CSP, Tauri/WebView2 asset access, and offline operation.

WPC-TEST-007 — A test failure caused by conflict between this spec and an accepted higher-authority contract MUST be escalated; an agent MUST NOT silently weaken the contract or test to make the suite green.

WPC-TEST-008 — Conformance test output SHOULD identify the requirement ID being verified so failure reports can be interpreted without loading the whole specification.

# 16\. Required Fixture-World Catalog

The test suite should maintain deliberately small world/package fixtures. These are not demonstration worlds; each fixture exists to prove one boundary.

Minimum catalog:

valid-minimal  
Purpose: smallest package that satisfies mandatory structure and lifecycle.

invalid-manifest  
Purpose: malformed/missing required manifest data.

duplicate-id  
Purpose: deterministic duplicate package-ID handling.

incompatible-api  
Purpose: valid manifest whose engineApi excludes the running host version.

path-traversal-entry  
Purpose: entry attempts to escape package root.

path-traversal-settings  
Purpose: settings schema/UI path attempts to escape package root.

init-failure  
Purpose: initialize throws/rejects intentionally.

update-failure  
Purpose: update throws intentionally after successful initialization.

dispose-failure  
Purpose: dispose throws/rejects intentionally.

invalid-settings  
Purpose: package/schema or persisted settings create a known validation failure path.

asset-escape  
Purpose: world requests an asset path outside package root.

resource-sentinel  
Purpose: allocates representative resources/listeners/timers so cleanup behavior can be observed.

WPC-TEST-009 — Fixture worlds MUST remain minimal enough that a failure has one obvious intended cause.

WPC-TEST-010 — Intentional fixture failures SHOULD use stable recognizable error text/codes so tests can distinguish the expected failure from an unrelated crash.

Additional fixtures MAY be added when a real regression reveals a missing boundary.

# 17\. Diagnostic Room as Canonical Reference World

The diagnostic room is both a projection diagnostic scene and the canonical reference implementation of a normal world package.

It MUST NOT be a privileged engine feature disguised as a world.

WPC-REF-001 — The diagnostic room MUST implement the normal VirtualWorld contract.

WPC-REF-002 — The diagnostic room MUST receive only the normal WorldContext and WorldFrame capabilities.

WPC-REF-003 — The diagnostic room MUST use the normal package manifest, settings, asset, lifecycle, and production package-loading path by the time M0F is accepted.

WPC-REF-004 — The diagnostic room MUST NOT import host-private tracking/projection/native/persistence modules.

WPC-REF-005 — The diagnostic room MUST pass all applicable world conformance suites.

WPC-REF-006 — The diagnostic room SHOULD deliberately exercise the important public API surface with minimal visual complexity:  
• initialize/update/dispose  
• ViewerState consumption  
• resize if supported  
• representative settings  
• package-local asset resolution  
• world logging  
• representative cleanup

WPC-REF-007 — Diagnostic visual content SHOULD remain simple enough that projection and lifecycle failures are easy to diagnose.

WPC-REF-008 — During early M0, the diagnostic world MAY be statically wired while the production package loader is not yet implemented, provided its source is kept package-shaped and no private capability is introduced solely for that temporary loading path.

WPC-REF-009 — M0F MUST move that same world implementation through the real package loader rather than creating a second special diagnostic implementation.

WPC-REF-010 — If the diagnostic room behavior conflicts with this specification, the reference world is wrong; agents MUST NOT treat existing code as authority over the written contract.

# 18\. Static Architecture-Boundary Enforcement

Runtime tests alone are insufficient because a world can compile while importing host internals.

The repository should enforce world-to-host boundaries at build/test time.

Required checks:

• no imports from host-private engine directories  
• no imports from tracking/pose/filter/calibration/projection internals  
• no direct NativeHost/Tauri imports  
• no direct media-device/webcam acquisition  
• no obvious runtime network dependency in normal world code/assets  
• no path-based dependency on another world package  
• only approved public world-facing module(s) cross the host/world source boundary

The exact checker is intentionally open. A simple, maintainable mechanism is preferred over a complex custom architecture tool.

WPC-ISO-009 — Boundary enforcement MUST run automatically in the relevant local verification/CI path.

WPC-ISO-010 — The checker MUST fail with an actionable message identifying the forbidden dependency and the approved boundary.

WPC-ISO-011 — Suppressions/exceptions MUST NOT become a normal way to bypass the architecture. Any exception requires explicit review and a documented reason.

WPC-ISO-012 — A future shared SDK package may simplify enforcement, but the project MUST NOT introduce a large framework merely to implement import policing.

# 19\. Exact Definition of a Conformant World Package

A world package is World Viewer conformant only when all of the following are true:

1\. Its package directory and manifest satisfy all mandatory structural requirements.  
2\. Its declared engineApi is compatible with the host.  
3\. All referenced package paths remain within the package boundary.  
4\. Its executable module exposes the expected world contract.  
5\. Its implementation uses only permitted capabilities/dependencies.  
6\. Its lifecycle satisfies initialize/update/dispose ordering and failure semantics.  
7\. Viewer state is consumed only through frame-scoped WorldFrame.  
8\. Settings are schema-valid, host-rendered, and delivered read-only.  
9\. Assets are resolved package-locally and require no network.  
10\. Failure paths remain isolated and recoverable.  
11\. World-owned resources are cleaned to the level required by the applicable automated and acceptance tests.  
12\. Static architecture-boundary checks pass.  
13\. Reusable behavioral conformance suites pass.  
14\. Applicable packaged Tauri/offline checks pass.  
15\. There is no undocumented private host dependency required for normal operation.

A package that merely renders successfully is not conformant.

A package that passes unit tests but only works in Vite/dev mode is not fully conformant.

A package that passes tests by relying on a diagnostic-only exception is not conformant.

# 20\. Agent Usage Contract

This section exists specifically to reduce model context and reasoning requirements.  
WPC-AGENT-001 — For an ordinary implementation task that does not change architecture, the preferred context bundle is:  
• task specification  
• this World Package Conformance Specification  
• relevant source files  
• relevant conformance tests  
• applicable ORC-\* entries from docs/testing/oracle-registry.md when registered oracles exist for the affected conformance behavior  
• applicable REUSE-\* entries from docs/reuse-register.md when the task consumes a registered dependency/reference decision  
• docs/handoff/world-packages.md when consuming the frozen M0 world subsystem  
• diagnostic reference-world files when useful  
WPC-AGENT-002 — Agents SHOULD NOT be given the entire project specification set by default when the bounded context above is sufficient.  
WPC-AGENT-003 — Ordinary implementation agents MUST treat public world contracts as fixed.  
WPC-AGENT-004 — An agent MUST NOT add host capabilities, broaden filesystem/native access, expose the camera, expose projection control, or create new world-facing APIs simply to complete a local task.  
WPC-AGENT-005 — When implementation reveals a genuine missing capability or contract conflict, the agent MUST stop that architectural portion and report:  
• the blocked requirement  
• the current contract  
• why compliance is impossible or materially harmful  
• the smallest proposed architectural decision needed  
WPC-AGENT-006 — Agents MUST NOT resolve a spec/test mismatch by silently changing whichever artifact is easiest.  
WPC-AGENT-007 — Agents SHOULD use the diagnostic room as an implementation example, not as the source of truth.  
WPC-AGENT-008 — Agents SHOULD prefer making existing conformance tests pass over introducing parallel test logic.  
WPC-AGENT-009 — Task completion reports should state:  
• conformance requirements affected  
• tests run  
• packaged verification run when applicable  
• files changed  
• any intentionally unexecuted acceptance check  
• any architecture issue escalated  
• applicable ORC-\* IDs and their current review/freeze status  
• applicable REUSE-\* IDs and their current approved status, Reuse Mode, and Prohibited Reinvention boundary  
WPC-AGENT-010 — WPC requirement IDs/sections are the governing conformance authority for world-package behavior. ORC-\* IDs are navigation to accepted executable/procedural oracles; REUSE-\* IDs are navigation to approved reuse/dependency decisions. Registry entries MUST NOT redefine WPC behavior.  
WPC-AGENT-011 — When applicable registered records exist, an ordinary world-package task SHOULD cite the relevant ORC-\* and REUSE-\* IDs in its bounded task specification and completion report.  
WPC-AGENT-012 — If an applicable ORC-\* or REUSE-\* record is missing, stale, non-consumable, or materially conflicts with this specification, the subsystem handoff, or its authoritative source, the agent MUST stop and escalate. It MUST NOT edit the WPC or registry record merely to make implementation proceed.

# 21\. Milestone 0 and Milestone 1 Handoff

This specification is intended to change the character of Milestone 1\.  
Milestone 0 responsibilities:  
• establish the public world-facing contract  
• create the reusable conformance harness  
• create the required failure fixtures  
• keep the diagnostic room package-shaped from its first implementation  
• move the diagnostic room through the production loader by M0F  
• prove static architecture-boundary enforcement  
• prove packaged/offline behavior  
• record evidence-gated loader/lifecycle decisions  
• leave a stable reference implementation and executable tests  
• keep docs/handoff/world-packages.md synchronized with the applicable ORC-\* and REUSE-\* IDs as world-package oracles and reuse decisions become stable  
• ensure the corresponding Oracle Registry and Reuse & Dependency Register entries are current before M0H handoff readiness is declared  
Milestone 1 should then consume the world subsystem as an accepted dependency rather than redesign it.  
A Milestone 1 world-system task should normally look like:  
“Modify this bounded behavior without changing the public contract; preserve these WPC requirement IDs, use these ORC-\* and REUSE-\* records, and make these conformance tests and packaged smoke checks pass.”  
If an M1 task instead requires:  
“Decide how worlds should access X”  
or  
“Choose the lifecycle behavior for Y,”  
then the M0 handoff/freeze gate is incomplete or new evidence has exposed an architecture issue. That decision must be escalated rather than silently delegated to ordinary M1 implementation.

# 22\. Suggested Repository Artifacts

This document does not freeze exact paths, but the implementation should produce equivalents of the following:

world package contracts / SDK surface  
• stable exported types/capabilities used by worlds

diagnostic reference world  
• package-shaped source  
• manifest  
• settings schema/UI hints  
• representative local asset  
• tests

conformance testkit  
• reusable world harness  
• fake/minimal WorldContext  
• fake asset resolver  
• controlled clock/events where needed  
• resource sentinel helpers

fixture packages  
• valid-minimal  
• failure/boundary fixtures from Section 16

boundary checker  
• automated import/capability enforcement

evidence  
• packaged loader/lifecycle proof  
• conformance run summaries where useful  
• architecture decision references

The TDS or repository implementation plan may choose the final directory names. Agents MUST NOT treat these example paths as permission to restructure unrelated code.

# 23\. Acceptance Checklist for This Specification

Before this draft is treated as ready for implementation, review it against the following questions:

• Does every world capability come from an already-approved host/world contract?  
• Does any rule accidentally introduce a new public API?  
• Can the important rules be enforced automatically?  
• Can the diagnostic room obey every rule without privileged access?  
• Can fixture worlds isolate failure causes cleanly?  
• Can Luna implement an ordinary world/package task with this document plus local code/tests rather than the full project context?  
• Is there a clear escalation rule when implementation uncovers missing architecture?  
• Are dev-mode-only successes prevented from being called conformant?  
• Are package isolation and offline behavior explicit?  
• Does the specification avoid prescribing custom infrastructure where a simple lint/build/test mechanism is sufficient?  
• Can an ordinary task cite applicable ORC-\* and REUSE-\* IDs without treating either registry as authority to change WPC requirements?  
• Does any registry/WPC conflict clearly stop and escalate rather than allowing an implementation agent to reconcile it opportunistically?

If any answer is no, this specification should be corrected before being used as the primary world-package agent context.

# 24\. Deferred Implementation Details

The following details are deliberately not frozen by this draft:

• exact public SDK/module package name  
• exact repository directory names  
• exact lint/import-boundary enforcement tool  
• exact dynamic local-ESM loading mechanism  
• exact error-code identifiers  
• exact host representation of WorldSceneRoot  
• exact local asset URL representation  
• whether the conformance helpers live under src/testkit or tests/testkit  
• whether selected conformance suites run as Vitest unit/integration suites or through a separate packaged harness

These are implementation/TDS decisions. They may be selected only in a way that preserves the requirements in this document and the higher-authority contracts.

# 25\. Resolved Review Decisions

All five initial review questions are accepted for this revision.  
D-WPC-01 — Full conformance requires packaged runtime verification.  
A package may be described as structurally conformant or behaviorally conformant when only those levels have been proven. The unqualified term “World Viewer conformant” requires every mandatory structural, behavioral, and packaged-runtime check applicable to that package to pass.  
D-WPC-02 — Package-shaped diagnostic reference world begins in M0B.  
The diagnostic room is authored in package-shaped source form beginning in M0B. It may be loaded through a temporary static bootstrap until the production package loader exists, provided it uses only the normal public world contract. By M0F, the same implementation must be built and loaded through the production manifest/discovery/local-ESM path.  
D-WPC-03 — Baseline fixture-world catalog is required in Milestone 0\.  
The minimum fixture-world catalog in Section 16 is accepted as the Milestone 0 baseline. Fixtures remain deliberately small and single-purpose; additional fixtures are added only when contract coverage or real regressions justify them.  
D-WPC-04 — Static architecture-boundary enforcement is mandatory before Milestone 1 handoff.  
The world subsystem is not handoff-ready for Milestone 1 until automated static/build-time enforcement of the world/host dependency boundary exists, runs in the relevant verification path, and passes alongside the reusable conformance suites and packaged-runtime checks.  
D-WPC-05 — This specification is the preferred compact context artifact for ordinary world-package implementation.  
D-WPC-06 — Standard bounded world-package task wrapper: ordinary implementation work should pair this specification with a task specification conforming to the Task Specification & Definition of Done Template. The task must identify only the relevant WPC requirement IDs/sections, src/world-sdk contracts, conformance tests/fixtures, applicable ORC-\* IDs, applicable REUSE-\* IDs, reference-world files, world-package handoff note, and verification commands needed for execution; it must also declare Allowed Scope and Escalation/Stop Conditions. WPC requirement IDs remain the governing world-package contract. Oracle/Reuse registry entries provide navigation/status for accepted tests and approved reuse choices but may not override the public world contract, accepted ADRs, conformance requirements, or established test oracles.  
D-WPC-07 — Registry-aware world-package execution: when applicable repo-local records exist, ordinary world-package tasks cite ORC-\* IDs for reusable accepted tests/procedures and REUSE-\* IDs for approved reuse/dependency decisions. Those registry records reduce task context and bind implementation to accepted verification/reuse choices; they do not become world-package conformance authority. A missing, stale, non-consumable, or conflicting registry record blocks ordinary implementation and escalates rather than being repaired by changing WPC requirements or inventing a substitute.  
After acceptance of the relevant frozen contracts, ordinary Luna/Terra world-package tasks should use this specification together with a bounded task conforming to the Task Specification & Definition of Done Template, relevant public world-contract source files, relevant conformance tests/fixtures, applicable ORC-\* and REUSE-\* records, the world-package handoff when consuming the frozen subsystem, and the diagnostic reference world when useful. The task must explicitly constrain Allowed Scope and define Verification plus Escalation/Stop Conditions. The full project specification set should not be loaded by default when this compact context is sufficient.

