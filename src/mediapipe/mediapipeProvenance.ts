export const MEDIAPIPE_PACKAGE = "@mediapipe/tasks-vision";
export const MEDIAPIPE_PACKAGE_VERSION = "1.0.1";
export const MEDIAPIPE_TASK_ASSET_PATH = "/mediapipe/face_landmarker.task";
export const MEDIAPIPE_TASK_ASSET_SHA256 = "64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF";
export const MEDIAPIPE_CANONICAL_METADATA_ENTRY = "geometry_pipeline_metadata_landmarks.binarypb";
export const MEDIAPIPE_CANONICAL_METADATA_SHA256 = "BDBCDA96DFCB7DA883DA124AAA2C55DEE49770D934F0FCC71747F8C21BDC75B4";

export type MediaPipeProvenance = {
  readonly package: Readonly<{ name: string; version: string }>;
  readonly taskAsset: Readonly<{ path: string; sha256: string; verified: boolean }>;
  readonly embeddedCanonicalMetadata: Readonly<{ archivePath: string; sha256: string; verified: boolean }>;
};

function hexDigest(bytes: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) =>
    [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase(),
  );
}

function uint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function uint16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

async function unzipEntry(bytes: Uint8Array, entryName: string): Promise<Uint8Array> {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (uint32(bytes, offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("MediaPipe task archive has no ZIP end record");
  const entryCount = uint16(bytes, eocdOffset + 10);
  const centralDirectorySize = uint32(bytes, eocdOffset + 12);
  const centralDirectoryOffset = uint32(bytes, eocdOffset + 16);
  if (centralDirectoryOffset + centralDirectorySize > bytes.length) throw new Error("MediaPipe task archive central directory is truncated");
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (uint32(bytes, offset) !== 0x02014b50) throw new Error("MediaPipe task archive has an invalid central directory entry");
    const compressionMethod = uint16(bytes, offset + 10);
    const compressedSize = uint32(bytes, offset + 20);
    const uncompressedSize = uint32(bytes, offset + 24);
    const nameLength = uint16(bytes, offset + 28);
    const extraLength = uint16(bytes, offset + 30);
    const commentLength = uint16(bytes, offset + 32);
    const localHeaderOffset = uint32(bytes, offset + 42);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== entryName) continue;
    if (uint32(bytes, localHeaderOffset) !== 0x04034b50) throw new Error("MediaPipe task archive local header is invalid");
    const localNameLength = uint16(bytes, localHeaderOffset + 26);
    const localExtraLength = uint16(bytes, localHeaderOffset + 28);
    const start = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(start, start + compressedSize);
    if (compressionMethod === 0) return compressed.slice();
    if (compressionMethod !== 8) throw new Error(`Unsupported MediaPipe task archive compression method ${compressionMethod}`);
    const compressedBuffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
    const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const uncompressed = new Uint8Array(await new Response(stream).arrayBuffer());
    if (uncompressed.length !== uncompressedSize) throw new Error("MediaPipe task archive entry length mismatch");
    return uncompressed;
  }
  throw new Error(`MediaPipe task archive lacks ${entryName}`);
}

export async function verifyMediaPipeProvenance(): Promise<MediaPipeProvenance> {
  const response = await fetch(MEDIAPIPE_TASK_ASSET_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`MediaPipe task asset request failed with HTTP ${response.status}`);
  const taskBytes = await response.arrayBuffer();
  const taskSha256 = await hexDigest(taskBytes);
  if (taskSha256 !== MEDIAPIPE_TASK_ASSET_SHA256) throw new Error(`MediaPipe task asset SHA-256 mismatch: ${taskSha256}`);
  const metadataBytes = await unzipEntry(new Uint8Array(taskBytes), MEDIAPIPE_CANONICAL_METADATA_ENTRY);
  const metadataSha256 = await hexDigest(metadataBytes.buffer.slice(metadataBytes.byteOffset, metadataBytes.byteOffset + metadataBytes.byteLength) as ArrayBuffer);
  if (metadataSha256 !== MEDIAPIPE_CANONICAL_METADATA_SHA256) throw new Error(`MediaPipe canonical metadata SHA-256 mismatch: ${metadataSha256}`);
  return {
    package: { name: MEDIAPIPE_PACKAGE, version: MEDIAPIPE_PACKAGE_VERSION },
    taskAsset: { path: MEDIAPIPE_TASK_ASSET_PATH, sha256: taskSha256, verified: true },
    embeddedCanonicalMetadata: { archivePath: MEDIAPIPE_CANONICAL_METADATA_ENTRY, sha256: metadataSha256, verified: true },
  };
}
