# World Viewer

## Data Model & Persistence Specification

## Draft v0.1

# Document Status

Draft version: 0.1
Date: September 28, 2026
Artifact: Data Model & Persistence Specification
Status: M0E1 implementation-ready within the declared scope after the completed GPT-5.6 Sol High stronger readiness review; this is not an implementation or verification claim and is not a general M0G approval.

This specification materializes the display-profile and calibration-profile persistence semantics already established by the Interface / Contract Specification, the Technical Design Specification, and ADR-014. It is intentionally limited to the M0E1 slice. M0G app state, world settings, migrations beyond the initial schema, and recovery UI are outside this revision.

# 1. Scope and authority

The persisted model supports:

- display profiles;
- calibration profiles associated with a display profile;
- stable identity and schema-version semantics;
- validation on read and before admission to active runtime state;
- atomic writes through the narrow native-host persistence boundary; and
- diagnosable rejection of malformed, unsupported, or invalid data.

The canonical coordinate system is screen-relative millimeters. M0E receives `RawViewerPose` in that coordinate system and applies host calibration before filtering. Persistence must not cause the host to reinterpret estimator matrices, landmarks, or estimator-internal mathematics.

Governing sources include Interface / Contract Specification sections 12-13 and 30, TDS sections 28-29 and 41, ADR-006.01, ADR-009, and ADR-014.

# 2. Logical documents

The initial persistence boundary contains two logical JSON documents in the Tauri application-data/config area:

- `display-profiles.json`
- `calibration-profiles.json`

The native host owns file access and atomic replacement. Renderer code uses typed, purpose-specific host operations; it does not receive a generic file read/write capability. SQLite is not part of this M0E1 design.

Each document has this v1 envelope:

```json
{
  "schemaVersion": 1,
  "profiles": []
}
```

`profiles` contains the corresponding profile objects. A v1 document must contain exactly the owned top-level fields `schemaVersion` and `profiles`; unknown semantic fields are rejected. There is no unspecified preservation policy for v1 owned document/profile structures.

# 3. Identity and version semantics

`schemaVersion` is the version of the persisted document shape, not the product version and not an estimator version. This first revision defines only schema version `1`.

Profile `id` values are stable machine-readable persistence keys. They are used for references and updates. A profile's human-readable `name` is presentation text and must never be used as its persistence identity.

IDs must be non-empty and unique within their document. Updating a profile preserves its ID unless an explicitly separate create operation is requested. Renaming a profile does not change its ID.

A valid v1 document requires no migration from a hypothetical earlier schema. A document with a schema version other than `1` is unsupported and is rejected; it is not silently coerced, partially read, or interpreted as v1. Future migrations must be explicit, versioned, and separately reviewed before they are implemented.

# 4. Display profile

The persisted display-profile object is:

```ts
interface DisplayProfile {
  schemaVersion: number;
  id: string;
  name: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  perspectiveStrength: number;
  calibrationProfileId: string;
  isReferenceProfile?: boolean;
}
```

Semantics:

- `schemaVersion` is `1` for a v1 profile document.
- `physicalWidthMm` and `physicalHeightMm` are explicit millimeter measurements and must be finite and strictly positive.
- `perspectiveStrength = 1.0` is the physically calibrated baseline.
- The exact artistic-strength range is intentionally deferred by the existing contract. This specification does not invent a new range; implementations must use the owning UX/technical authority for any non-baseline range.
- `calibrationProfileId` identifies the associated calibration profile by stable ID.
- `isReferenceProfile` is optional. If present it designates the profile as a reference profile; it does not change the identity or silently make the profile immutable.

`name` is required human-readable text. It is not required to be unique because it is not a persistence key; user-facing duplicate-name handling belongs to the UX implementation.

# 5. Calibration profile

The persisted calibration-profile object is:

```ts
interface CalibrationProfile {
  schemaVersion: number;
  id: string;
  displayProfileId: string;
  cameraGeometry: {
    cameraId: string;
    positionScreenMm: { x: number; y: number; z: number };
    horizontalFovRad?: number;
    verticalFovRad?: number;
    captureWidthPx?: number;
    captureHeightPx?: number;
    captureFps?: number;
  };
  neutralViewerPositionMm: { x: number; y: number; z: number };
  estimator: {
    id: string;
    version: string;
    parameters: JsonObject;
  };
  poseCorrection: {
    scale: { x: number; y: number; z: number };
    offsetMm: { x: number; y: number; z: number };
  };
}
```

Semantics:

- `displayProfileId` references the display profile by stable ID.
- `cameraGeometry.cameraId` identifies the fixed integrated camera selected for the profile.
- `positionScreenMm` uses the canonical screen-relative coordinate convention and is measured in millimeters.
- FOV values remain optional. The baseline product does not require a full intrinsic-camera workflow.
- Optional capture width, height, and FPS describe the capture configuration when known; they are not substitutes for camera identity or physical geometry.
- `neutralViewerPositionMm` is the user's neutral cyclopean-eye position in canonical screen-relative millimeters. Its X, Y, and Z components must be finite.
- `estimator.id` and `estimator.version` identify the selected estimator. `estimator.parameters` is an opaque JSON object owned by estimator-specific validation and persistence. Host calibration code must not reinterpret those parameters or reconstruct estimator mathematics.

# 6. Host correction

The initial host correction is independent per-axis scale plus offset:

```text
x' = scale.x * x + offsetMm.x
y' = scale.y * y + offsetMm.y
z' = scale.z * z + offsetMm.z
```

The persisted shape is:

```text
scale = { x: number, y: number, z: number }
offsetMm = { x: number, y: number, z: number }
```

Defaults are:

```text
scale = { x: 1, y: 1, z: 1 }
offsetMm = { x: 0, y: 0, z: 0 }
```

Every scale component must be finite and strictly positive: `scale.x > 0`, `scale.y > 0`, and `scale.z > 0`. Every offset component must be finite. Zero and negative persisted scale values are invalid at the persistence boundary; this is not deferred to a later experiment. The model does not contain cross-axis matrices, rotations, polynomials, nonlinear fitting, orientation-dependent terms, lens distortion, or arbitrary camera models. Those changes require evidence and architecture review.

For schema v1, validation is strict for owned document/profile structures. Unknown semantic fields are rejected in the document envelope, display profile, calibration profile, `cameraGeometry`, and `poseCorrection`. The estimator's opaque `parameters: JsonObject` is intentionally extensible according to estimator ownership; this exception does not extend to host-owned profile semantics.

CalibrationTransform is pure and deterministic. It does not alter tracking state, confidence, timestamps, or estimator identity.

# 7. Validation and admission

Validation occurs on read and before a new or updated profile is admitted to active runtime state. At minimum it checks:

- document envelope and exact supported schema version;
- JSON object/array types and required fields;
- non-empty IDs and uniqueness within each document;
- finite, strictly positive physical display dimensions;
- finite `perspectiveStrength` without inventing an unapproved artistic range;
- finite camera position, neutral pose, and offset components;
- finite, strictly positive `scale.x`, `scale.y`, and `scale.z`;
- non-empty camera and estimator identity/version values;
- estimator parameters are a `JsonObject` and remain opaque to host calibration;
- optional FOV and capture values are finite when present, with positive dimensions/FPS when present; and
- cross-document profile references resolve to the corresponding profile before the combined state becomes active.

Invalid values must never create NaN or Infinity in runtime geometry. A failed validation leaves the previously active valid state unchanged. It must not partially admit a document or silently substitute identity values for invalid persisted values.

# 8. Read, write, and recovery behavior

Read behavior is deterministic:

1. The native boundary locates the logical document in the app-data/config area.
2. A missing document represents an empty persisted collection and is distinct from a corrupt document.
3. The document is parsed as JSON and validated against schema version 1 and the profile rules above.
4. Cross-document references are validated before the combined profile state is activated.
5. Valid data is returned as typed validated DTOs. Invalid data is rejected with a diagnosable error category and source document; no malformed value reaches runtime geometry.

The recovery boundary for this revision is explicit rejection and preservation of the last valid active state. The implementation may expose a diagnostic telling the user which document and validation category failed. Automatic repair, silent deletion, broad backup rotation, and a general recovery UI are M0G concerns and are not defined here.

Write behavior is deterministic:

1. Validate the complete candidate document and all affected cross-document references before writing.
2. Serialize the versioned JSON document using the repository's deterministic serialization convention.
3. Write a temporary file in the same application-data/config directory.
4. Flush/close the temporary file according to the native implementation's durable-write policy.
5. Atomically replace or rename the target document.
6. Re-read and validate the resulting document before reporting success when the native boundary supports that check.

Each JSON document receives its own atomic temp-write plus replace/rename operation. M0E1 does not claim an ACID transaction spanning both JSON files. Active runtime state is not replaced until the requested save operation has completed and the resulting combined state validates, including all cross-document references. An interrupted multi-document operation must remain diagnosable: a successfully written calibration document does not make an orphan calibration profile active, and no partial target file is treated as valid. If a document write or combined-state validation fails, the previously active valid runtime state remains authoritative; the two-file architecture does not claim stronger crash-consistency than these per-file operations provide.

# 9. Profile lifecycle boundaries

M0E1 may create, update, select, and load display/calibration profiles through the two logical documents. The calibration flow owns the values it captures, while estimator-specific fields remain owned by the estimator boundary.

This revision does not define M0G app-state persistence, world settings, history, synchronization, multi-user identity, or a database migration system. The specification must be expanded and revalidated before those domains are implemented.

# 10. Readiness status and implementation handoff

The stronger readiness review is complete. The M0E1 field shapes, validation rules, strict schema-v1 handling, per-file atomic-write boundary, cross-document admission behavior, and explicit rejection/recovery boundary are sufficient for implementation within this declared scope. This status does not claim that M0E1 implementation or verification has occurred. Windows/native atomic replacement still requires the Testing Strategy's required native/packaged integration verification; this specification does not implement that test here. Later M0G persistence expansion remains outside this approval and requires expansion and revalidation of this specification.
