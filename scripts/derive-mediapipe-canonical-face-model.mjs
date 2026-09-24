import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const EXPECTED_TASK_SHA256 = "64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF";
const METADATA_ENTRY = "geometry_pipeline_metadata_landmarks.binarypb";
const ids = [33, 133, 362, 263];

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const taskPath = argument("--task", "public/mediapipe/face_landmarker.task");
const outputPath = argument("--output", "evidence/m0d/estimator-experiment-v2/canonical-face-model.json");
const taskBytes = readFileSync(taskPath);
const taskSha256 = createHash("sha256").update(taskBytes).digest("hex").toUpperCase();
if (taskSha256 !== EXPECTED_TASK_SHA256) throw new Error(`Pinned task SHA-256 mismatch: ${taskSha256}`);
const metadataBytes = execFileSync("tar.exe", ["-xOf", taskPath, METADATA_ENTRY]);
const metadataSha256 = createHash("sha256").update(metadataBytes).digest("hex").toUpperCase();

function fields(buffer) {
  let offset = 0;
  const readVarint = () => {
    let value = 0n;
    let shift = 0n;
    for (;;) {
      const byte = buffer[offset++];
      if (byte === undefined) throw new Error("Truncated protobuf varint");
      value |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return Number(value);
      shift += 7n;
    }
  };
  const result = [];
  while (offset < buffer.length) {
    const key = readVarint();
    const field = key >>> 3;
    const wire = key & 7;
    if (wire === 0) result.push({ field, wire, value: readVarint() });
    else if (wire === 1) { result.push({ field, wire, value: buffer.subarray(offset, offset + 8) }); offset += 8; }
    else if (wire === 2) { const length = readVarint(); result.push({ field, wire, value: buffer.subarray(offset, offset + length) }); offset += length; }
    else if (wire === 5) { result.push({ field, wire, value: buffer.subarray(offset, offset + 4) }); offset += 4; }
    else throw new Error(`Unsupported protobuf wire type: ${wire}`);
  }
  return result;
}

const meshField = fields(metadataBytes).find(({ field, wire }) => field === 1 && wire === 2);
if (!meshField) throw new Error("Pinned metadata lacks canonical_mesh field");
const vertexFields = fields(meshField.value).filter(({ field }) => field === 3);
const vertexValues = [];
for (const field of vertexFields) {
  if (field.wire === 5) vertexValues.push(field.value.readFloatLE(0));
  else if (field.wire === 2) for (let offset = 0; offset < field.value.length; offset += 4) vertexValues.push(field.value.readFloatLE(offset));
  else throw new Error("Unexpected canonical vertex buffer wire type");
}
if (vertexValues.length % 5 !== 0) throw new Error(`Canonical vertex buffer is not VERTEX_PT: ${vertexValues.length} floats`);

const vertices = Object.fromEntries(ids.map((id) => {
  const vertex = vertexValues.slice(id * 5, id * 5 + 3);
  if (vertex.length !== 3 || vertex.some((value) => !Number.isFinite(value))) throw new Error(`Invalid canonical vertex ${id}`);
  return [id, vertex];
}));
const midpoint = (a, b) => a.map((value, index) => (value + b[index]) / 2);
const LC = midpoint(vertices[33], vertices[133]);
const RC = midpoint(vertices[362], vertices[263]);
const CC = midpoint(LC, RC);
const DcanonMm = Math.hypot(...RC.map((value, index) => value - LC[index])) * 10;
if (!CC.every(Number.isFinite) || !Number.isFinite(DcanonMm) || DcanonMm <= 0) throw new Error("Invalid canonical derivation");

const output = {
  schemaVersion: 1,
  experimentSpecVersion: "0.3",
  experimentProcedureVersion: 2,
  taskAsset: { path: taskPath.replaceAll("\\", "/"), sha256: taskSha256, bytes: taskBytes.length },
  embeddedMetadata: { archivePath: METADATA_ENTRY, sha256: metadataSha256, bytes: metadataBytes.length },
  canonicalUnit: { name: "centimeter", unitToMm: 10, provenance: "MediaPipe GeometryPipelineMetadata/Mesh3d schema identifies canonical mesh XYZ coordinates as centimeters; exact package-source revision equivalence remains a review limitation." },
  vertices,
  LC,
  RC,
  CC,
  DcanonMm,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output, null, 2));
