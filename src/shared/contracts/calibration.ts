import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import type { JsonObject } from "./json";
import type { MonotonicMs, Vec3Mm } from "./primitives";

export const CALIBRATION_SCHEMA_VERSION = 1 as const;

export interface CameraGeometry {
  readonly cameraId: string;
  readonly positionScreenMm: Vec3Mm;
  readonly horizontalFovRad?: number;
  readonly verticalFovRad?: number;
  readonly captureWidthPx?: number;
  readonly captureHeightPx?: number;
  readonly captureFps?: number;
}

export interface DisplayProfile {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly physicalWidthMm: number;
  readonly physicalHeightMm: number;
  readonly perspectiveStrength: number;
  readonly calibrationProfileId: string;
  readonly isReferenceProfile?: boolean;
}

export interface CalibrationProfile {
  readonly schemaVersion: number;
  readonly id: string;
  readonly displayProfileId: string;
  readonly cameraGeometry: CameraGeometry;
  readonly neutralViewerPositionMm: Vec3Mm;
  readonly estimator: {
    readonly id: string;
    readonly version: string;
    readonly parameters: JsonObject;
  };
  readonly poseCorrection: {
    readonly scale: { readonly x: number; readonly y: number; readonly z: number };
    readonly offsetMm: Vec3Mm;
  };
}

export interface CalibratedViewerPose {
  readonly timestampMs: MonotonicMs;
  readonly positionMm: Vec3Mm;
  readonly confidence: number;
  readonly estimatorId: string;
}

export interface CalibrationDocuments {
  readonly displayProfiles: readonly DisplayProfile[];
  readonly calibrationProfiles: readonly CalibrationProfile[];
}

export interface ProfileDocument<TProfile> {
  readonly schemaVersion: typeof CALIBRATION_SCHEMA_VERSION;
  readonly profiles: readonly TProfile[];
}

export interface CalibrationTransformContract {
  apply(sample: RawViewerPose, profile: Readonly<CalibrationProfile>): CalibratedViewerPose;
}

export class CalibrationValidationError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "CalibrationValidationError";
    this.code = code;
    this.path = path;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownKeys(value: Record<string, unknown>): readonly string[] {
  return Object.keys(value);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], path: string): void {
  const expectedSet = new Set(expected);
  for (const key of ownKeys(value)) {
    if (!expectedSet.has(key)) throw new CalibrationValidationError("unknown-field", `${path}.${key}`, "unknown field is not accepted by schema v1");
  }
}

function required(value: Record<string, unknown>, key: string, path: string): unknown {
  if (!(key in value)) throw new CalibrationValidationError("missing-field", `${path}.${key}`, "required field is missing");
  return value[key];
}

function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new CalibrationValidationError("invalid-number", path, "value must be finite");
  return value;
}

function positive(value: unknown, path: string): number {
  const result = finite(value, path);
  if (!(result > 0)) throw new CalibrationValidationError("nonpositive-number", path, "value must be greater than zero");
  return result;
}

function nonEmpty(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new CalibrationValidationError("invalid-text", path, "value must be non-empty text");
  if ([...value].some((character) => character.charCodeAt(0) < 0x20)) throw new CalibrationValidationError("invalid-text", path, "value must not contain control characters");
  return value;
}

function jsonValue(value: unknown, path: string): void {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new CalibrationValidationError("invalid-json", path, "JSON numbers must be finite");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => jsonValue(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-json", path, "value must be a JSON value");
  Object.entries(value).forEach(([key, entry]) => jsonValue(entry, `${path}.${key}`));
}

function vec3(value: unknown, path: string): Vec3Mm {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-vector", path, "value must be an object");
  assertExactKeys(value, ["x", "y", "z"], path);
  return Object.freeze({
    x: finite(required(value, "x", path), `${path}.x`),
    y: finite(required(value, "y", path), `${path}.y`),
    z: finite(required(value, "z", path), `${path}.z`),
  });
}

function cameraGeometry(value: unknown, path: string): CameraGeometry {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-camera-geometry", path, "cameraGeometry must be an object");
  assertExactKeys(value, ["cameraId", "positionScreenMm", "horizontalFovRad", "verticalFovRad", "captureWidthPx", "captureHeightPx", "captureFps"], path);
  const result: CameraGeometry = {
    cameraId: nonEmpty(required(value, "cameraId", path), `${path}.cameraId`),
    positionScreenMm: vec3(required(value, "positionScreenMm", path), `${path}.positionScreenMm`),
    ...(value.horizontalFovRad === undefined ? {} : { horizontalFovRad: positive(value.horizontalFovRad, `${path}.horizontalFovRad`) }),
    ...(value.verticalFovRad === undefined ? {} : { verticalFovRad: positive(value.verticalFovRad, `${path}.verticalFovRad`) }),
    ...(value.captureWidthPx === undefined ? {} : { captureWidthPx: positive(value.captureWidthPx, `${path}.captureWidthPx`) }),
    ...(value.captureHeightPx === undefined ? {} : { captureHeightPx: positive(value.captureHeightPx, `${path}.captureHeightPx`) }),
    ...(value.captureFps === undefined ? {} : { captureFps: positive(value.captureFps, `${path}.captureFps`) }),
  };
  return Object.freeze(result);
}

export function validateDisplayProfile(value: unknown, path = "displayProfile"): DisplayProfile {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-display-profile", path, "display profile must be an object");
  assertExactKeys(value, ["schemaVersion", "id", "name", "physicalWidthMm", "physicalHeightMm", "perspectiveStrength", "calibrationProfileId", "isReferenceProfile"], path);
  const schemaVersion = required(value, "schemaVersion", path);
  if (schemaVersion !== CALIBRATION_SCHEMA_VERSION) throw new CalibrationValidationError("unsupported-schema-version", `${path}.schemaVersion`, "display profile schemaVersion must be 1");
  const result: DisplayProfile = {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    id: nonEmpty(required(value, "id", path), `${path}.id`),
    name: nonEmpty(required(value, "name", path), `${path}.name`),
    physicalWidthMm: positive(required(value, "physicalWidthMm", path), `${path}.physicalWidthMm`),
    physicalHeightMm: positive(required(value, "physicalHeightMm", path), `${path}.physicalHeightMm`),
    perspectiveStrength: finite(required(value, "perspectiveStrength", path), `${path}.perspectiveStrength`),
    calibrationProfileId: nonEmpty(required(value, "calibrationProfileId", path), `${path}.calibrationProfileId`),
    ...(value.isReferenceProfile === undefined ? {} : { isReferenceProfile: (() => {
      if (typeof value.isReferenceProfile !== "boolean") throw new CalibrationValidationError("invalid-boolean", `${path}.isReferenceProfile`, "reference flag must be boolean");
      return value.isReferenceProfile;
    })() }),
  };
  return Object.freeze(result);
}

export function validateCalibrationProfile(value: unknown, path = "calibrationProfile"): CalibrationProfile {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-calibration-profile", path, "calibration profile must be an object");
  assertExactKeys(value, ["schemaVersion", "id", "displayProfileId", "cameraGeometry", "neutralViewerPositionMm", "estimator", "poseCorrection"], path);
  const schemaVersion = required(value, "schemaVersion", path);
  if (schemaVersion !== CALIBRATION_SCHEMA_VERSION) throw new CalibrationValidationError("unsupported-schema-version", `${path}.schemaVersion`, "calibration profile schemaVersion must be 1");

  const estimatorValue = required(value, "estimator", path);
  if (!isRecord(estimatorValue)) throw new CalibrationValidationError("invalid-estimator", `${path}.estimator`, "estimator must be an object");
  assertExactKeys(estimatorValue, ["id", "version", "parameters"], `${path}.estimator`);
  const parameters = required(estimatorValue, "parameters", `${path}.estimator`);
  if (!isRecord(parameters)) throw new CalibrationValidationError("invalid-json-object", `${path}.estimator.parameters`, "estimator parameters must be a JSON object");
  jsonValue(parameters, `${path}.estimator.parameters`);

  const correctionValue = required(value, "poseCorrection", path);
  if (!isRecord(correctionValue)) throw new CalibrationValidationError("invalid-pose-correction", `${path}.poseCorrection`, "poseCorrection must be an object");
  assertExactKeys(correctionValue, ["scale", "offsetMm"], `${path}.poseCorrection`);
  const scaleValue = required(correctionValue, "scale", `${path}.poseCorrection`);
  if (!isRecord(scaleValue)) throw new CalibrationValidationError("invalid-scale", `${path}.poseCorrection.scale`, "scale must be an object");
  assertExactKeys(scaleValue, ["x", "y", "z"], `${path}.poseCorrection.scale`);

  const result: CalibrationProfile = {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    id: nonEmpty(required(value, "id", path), `${path}.id`),
    displayProfileId: nonEmpty(required(value, "displayProfileId", path), `${path}.displayProfileId`),
    cameraGeometry: cameraGeometry(required(value, "cameraGeometry", path), `${path}.cameraGeometry`),
    neutralViewerPositionMm: vec3(required(value, "neutralViewerPositionMm", path), `${path}.neutralViewerPositionMm`),
    estimator: Object.freeze({
      id: nonEmpty(required(estimatorValue, "id", `${path}.estimator`), `${path}.estimator.id`),
      version: nonEmpty(required(estimatorValue, "version", `${path}.estimator`), `${path}.estimator.version`),
      parameters: Object.freeze({ ...parameters }) as JsonObject,
    }),
    poseCorrection: Object.freeze({
      scale: Object.freeze({
        x: positive(required(scaleValue, "x", `${path}.poseCorrection.scale`), `${path}.poseCorrection.scale.x`),
        y: positive(required(scaleValue, "y", `${path}.poseCorrection.scale`), `${path}.poseCorrection.scale.y`),
        z: positive(required(scaleValue, "z", `${path}.poseCorrection.scale`), `${path}.poseCorrection.scale.z`),
      }),
      offsetMm: vec3(required(correctionValue, "offsetMm", `${path}.poseCorrection`), `${path}.poseCorrection.offsetMm`),
    }),
  };
  return Object.freeze(result);
}

export function validateProfileDocument<TProfile>(
  value: unknown,
  validateProfile: (profile: unknown, path: string) => TProfile,
  path: string,
): ProfileDocument<TProfile & { readonly id: string }> {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-document", path, "profile document must be an object");
  assertExactKeys(value, ["schemaVersion", "profiles"], path);
  if (required(value, "schemaVersion", path) !== CALIBRATION_SCHEMA_VERSION) throw new CalibrationValidationError("unsupported-schema-version", `${path}.schemaVersion`, "profile document schemaVersion must be 1");
  const profiles = required(value, "profiles", path);
  if (!Array.isArray(profiles)) throw new CalibrationValidationError("invalid-profiles", `${path}.profiles`, "profiles must be an array");
  const validated = profiles.map((profile, index) => validateProfile(profile, `${path}.profiles[${index}]`) as TProfile & { readonly id: string });
  const ids = new Set<string>();
  for (const [index, profile] of validated.entries()) {
    if (ids.has(profile.id)) throw new CalibrationValidationError("duplicate-id", `${path}.profiles[${index}].id`, "profile IDs must be unique within a document");
    ids.add(profile.id);
  }
  return Object.freeze({ schemaVersion: CALIBRATION_SCHEMA_VERSION, profiles: Object.freeze(validated) });
}

export function validateCalibrationDocuments(value: unknown): CalibrationDocuments {
  if (!isRecord(value)) throw new CalibrationValidationError("invalid-documents", "documents", "calibration documents must be an object");
  assertExactKeys(value, ["displayProfiles", "calibrationProfiles"], "documents");
  const displayDocument = validateProfileDocument(required(value, "displayProfiles", "documents"), validateDisplayProfile, "displayProfiles");
  const calibrationDocument = validateProfileDocument(required(value, "calibrationProfiles", "documents"), validateCalibrationProfile, "calibrationProfiles");
  const displays = new Map(displayDocument.profiles.map((profile) => [profile.id, profile]));
  const calibrations = new Map(calibrationDocument.profiles.map((profile) => [profile.id, profile]));
  for (const profile of displayDocument.profiles) {
    if (!calibrations.has(profile.calibrationProfileId)) throw new CalibrationValidationError("unresolved-reference", `displayProfiles.${profile.id}.calibrationProfileId`, "display profile references a missing calibration profile");
  }
  for (const profile of calibrationDocument.profiles) {
    if (!displays.has(profile.displayProfileId)) throw new CalibrationValidationError("unresolved-reference", `calibrationProfiles.${profile.id}.displayProfileId`, "calibration profile references a missing display profile");
  }
  return Object.freeze({ displayProfiles: displayDocument.profiles, calibrationProfiles: calibrationDocument.profiles });
}

export function createDefaultDisplayProfile(id = "display-reference-e590", calibrationProfileId = "calibration-reference-e590"): DisplayProfile {
  return validateDisplayProfile({ schemaVersion: 1, id, name: "Reference display", physicalWidthMm: 345.4, physicalHeightMm: 194.3, perspectiveStrength: 1.0, calibrationProfileId, isReferenceProfile: true });
}

export function createDefaultCalibrationProfile(
  id = "calibration-reference-e590",
  displayProfileId = "display-reference-e590",
  cameraId = "integrated-camera",
): CalibrationProfile {
  return validateCalibrationProfile({
    schemaVersion: 1,
    id,
    displayProfileId,
    cameraGeometry: { cameraId, positionScreenMm: { x: 0, y: 103.188, z: 0 } },
    neutralViewerPositionMm: { x: 0, y: 0, z: 600 },
    estimator: {
      id: "mediapipe-facial-transform-v1",
      version: "v1",
      parameters: {
        cameraOriginScreenMm: { x: 0, y: 103.188, z: 0 },
        zrefScreenMm: 600,
        zMedianRaw: 476.5052488113386,
        scaleA: 1.259167661839453,
        canonicalPointCm: { x: 0, y: 2.6246179342269897, z: 3.4656630754470825 },
      },
    },
    poseCorrection: { scale: { x: 1, y: 1, z: 1 }, offsetMm: { x: 0, y: 0, z: 0 } },
  });
}

export const identityCalibrationTransform: CalibrationTransformContract = Object.freeze({
  apply(sample: RawViewerPose, profile: Readonly<CalibrationProfile>): CalibratedViewerPose {
    if (!Number.isFinite(sample.timestampMs) || sample.timestampMs < 0) throw new RangeError("sample timestamp must be finite and non-negative");
    if (!Number.isFinite(sample.confidence) || sample.confidence < 0 || sample.confidence > 1) throw new RangeError("sample confidence must be finite and between zero and one");
    if (!Number.isFinite(sample.positionMm.x) || !Number.isFinite(sample.positionMm.y) || !Number.isFinite(sample.positionMm.z)) throw new RangeError("sample position must be finite");
    const { scale, offsetMm } = profile.poseCorrection;
    const positionMm = Object.freeze({
      x: scale.x * sample.positionMm.x + offsetMm.x,
      y: scale.y * sample.positionMm.y + offsetMm.y,
      z: scale.z * sample.positionMm.z + offsetMm.z,
    });
    if (![positionMm.x, positionMm.y, positionMm.z].every(Number.isFinite)) throw new RangeError("calibration transform produced a non-finite position");
    return Object.freeze({ timestampMs: sample.timestampMs, positionMm, confidence: sample.confidence, estimatorId: sample.estimatorId });
  },
});
