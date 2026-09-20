# M0B-4 — Public World SDK Boundary Preparation

## Task Metadata

- Task ID: M0B-4
- Milestone / slice: M0B public world SDK boundary
- Task type: implementation
- Implementation model: Luna — Medium after authority resolution
- Baseline branch/commit: `feat/m0a1-foundation` / `eb631a34e7ef36c8f6f19310b304a638c04cf90c`
- Status: blocked

## Objective

Materialize the narrow `src/world-sdk/index.ts` export surface from frozen world-facing contracts and add the required simple static boundary checks, without inventing public API semantics or exposing host-private capabilities.

## Required Authority

- Interface & Contract Specification §§15, 18, 19, 19A, and 20.
- TDS §§19, 23, and 41.
- World Package Conformance Specification §§7–8.
- M0B roadmap public SDK boundary deliverable.

## Exact Authority Gap

The current authorities do not freeze all semantics required for a usable SDK:

- `WorldLogger` is named but has no interface or method shape in the Interface & Contract Specification, TDS, or WPC.
- `JsonObject` is referenced but has no repository-owned definition or explicit public type shape.
- `WorldSceneRoot` is described as a Three.js `Group` or equivalent, while WPC explicitly lists its exact host representation as deferred implementation/TDS authority.
- WPC also states that the exact public SDK/module name and boundary-check mechanism are not frozen; this task prompt authorizes `src/world-sdk/index.ts`, but does not resolve the missing contract semantics above.

## Status / Stop Condition

Blocked before implementation. Do not create `src/world-sdk`, choose logger methods, choose an opaque/Three.js root representation, or author boundary checks until the owning authority explicitly resolves these gaps.

## Explicitly Not Attempted

VirtualWorld/WorldContext SDK exports, world-private import checker, SDK-surface checker, diagnostic world, package manifests, dynamic loading, and all projection/tracking behavior.

## Decision Required

Resolve the missing public contract shapes and exact `WorldSceneRoot` representation in the owning interface/TDS authority, or provide an explicit non-architectural task decision authorized by the project governance.
