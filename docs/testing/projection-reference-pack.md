# M0B Projection Reference Pack

## Status and authority hierarchy

This pack materializes an already-reviewed Class C design. Authority order is: accepted ADR-003/ADR-008 and the canonical Interface & Contract Specification; this reviewed pack and its literal fixtures; the independent test oracle; and Three.js r186 convention checks. Production implementation must consume this pack and may not redefine it.

Class C design review: approved. Repository oracle status: `ORC-PROJECTION-001` is draft pending a separate post-materialization audit and freeze. Production projection remains blocked.

## Pinned references

- Robert Kooima, “Generalized Perspective Projection,” August 2008, revised June 2009: generalized-perspective theory.
- DisplayXR `displayxr-common`, reviewed commit `5a04922b01c3b9bf88c0b38a35b33e4a231f8c23`: `docs-math-reference.md`, `include/dxr_view_math.h`, and `include/dxr_view_math.c` as reference-only implementation material.
- DisplayXR `displayxr-runtime` authoring rules, reviewed commit `69270cd399037d0facaee260d12a71a6c18503e9`: `docs/guides/displayxr-app-rules.md` as checklist reference.
- Three.js `0.186.0` / `@types/three` `0.186.0`: `Matrix4.makePerspective` is the approved matrix primitive; upstream source is not copied or vendored.

## Canonical frame and camera

WorldViewer uses millimeters in a right-handed screen-relative frame: origin at the physical screen center, +X viewer-right, +Y up, +Z outward toward the viewer, screen plane Z=0, viewer normally Z>0, and virtual content normally Z<0. For screen width W and height H, corners are `(-W/2,-H/2,0)`, `(W/2,-H/2,0)`, `(-W/2,H/2,0)`, and `(W/2,H/2,0)`.

The effective cyclopean eye is E=(ex,ey,ez). The fixed-axis Three camera is positioned at E, has identity orientation, looks along -Z, and retains +Y up. Viewer motion changes position and asymmetric projection; it does not rotate the fixed screen basis or translate the world. No `lookAt` screen-centering behavior is used.

## Screen aperture, near plane, and valid domain

The physical screen at Z=0 is the aperture/convergence surface, not the clipping plane. Positive camera-relative near/far distances n/f place the near plane at world z=ez-n. Valid reference input requires finite W,H,ex,ey,ez,n,f, W>0, H>0, n>0, f>n, and ez>n. Invalid eye input is not silently replaced with a nominal or fallback eye.

The reviewed fixed-screen specialization is exactly:

```text
left   = n * (-W/2 - ex) / ez
right  = n * ( W/2 - ex) / ez
bottom = n * (-H/2 - ey) / ez
top    = n * ( H/2 - ey) / ez
```

The M0B reference clipping baseline is `near=50 mm`, `far=5000 mm`. This safely covers scripted eye Z values 450–800 mm and diagnostic geometry to about Z=-900 mm, including substantial margin, with a 100:1 ratio. These are reference defaults, not permanent user-facing policy.

## Three.js mapping

The future adapter must call:

```ts
matrix.makePerspective(left, right, top, bottom, near, far, WebGLCoordinateSystem, false);
```

The order is left, right, TOP, BOTTOM, near, far. M0B uses WebGL coordinates and `reversedDepth=false`. `Matrix4.elements` is column-major and the literal fixtures use `[x,0,0,0, 0,y,0,0, a,b,c,-1, 0,0,d,0]`. WebGL depth maps near to NDC z=-1 and far to NDC z=+1.

After a custom projection matrix is assigned in a later task, `projectionMatrixInverse` must remain synchronized. `camera.updateProjectionMatrix()` rebuilds the ordinary symmetric PerspectiveCamera matrix and must not overwrite the custom matrix. `RendererFoundation.resize()` currently calls it; that is a later integration point and is not changed here.

## Independent physical-aperture oracle

The primary independent X/Y oracle intersects the eye-to-world ray with the real screen plane, without calculating frustum bounds or calling production projection code:

```text
u  = ez / (ez - qz)
Sx = ex + u * (qx - ex)
Sy = ey + u * (qy - ey)
expectedNdcX = 2 * Sx / W
expectedNdcY = 2 * Sy / H
```

The test-only implementation is `tests/helpers/projectionApertureOracle.ts`. Three `makePerspective` checks are separate dependency-convention checks, not the independent oracle.

## Literal cases and invariants

The exact 12 reviewed cases, with literal frusta, matrices, probe points, and expected probe NDC values, are in `tests/fixtures/projectionReferenceCases.ts` and are not generated at runtime.

The reference suite verifies unique IDs, finite valid inputs, all four physical corners for every case, independent probe agreement, literal Three.js matrix agreement, transformed-probe agreement, WebGL near/far depth, center symmetry, left/right and up/down direction, C06/C01/C07 distance behavior, C10 outside-aperture behavior, and C09/C12 near scaling.

Tolerances are explicit absolute comparisons: `FRUSTUM_ABS_EPS_MM=1e-9`, `MATRIX_ABS_EPS=1e-9`, `NDC_ABS_EPS=1e-10`, and reviewed `DIRECTION_MARGIN=1e-6` for any future directional assertion. These CPU/JavaScript-number tolerances are not GPU image-comparison tolerances.

## Deferred concerns and stop boundary

Arbitrary rotated screens, final production clipping policy for future worlds, perspective-strength behavior, invalid-input production error handling, camera integration, inverse-matrix synchronization, and GPU/framebuffer tolerances remain deferred or evidence-gated. No production projection adapter, camera wiring, matrix construction, or diagnostic viewer reaction is implemented by this pack. Production projection remains blocked until `ORC-PROJECTION-001` receives a separate stronger-review audit and is frozen.
