import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const defaultEntry = path.join(repositoryRoot, "src", "world-sdk", "index.ts");
const approved = new Set([
  "JsonPrimitive", "JsonValue", "JsonObject", "Millimeters", "Seconds", "MonotonicMs",
  "Vec3Mm", "Vec3MmPerSec", "TrackingStatus", "TrackingHealth", "ViewerState", "ViewportState",
  "WorldSceneRoot", "WorldAssetService", "WorldLogger", "WorldHostInfo", "WorldContext", "WorldFrame",
  "VirtualWorld",
]);

function argumentValue(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

function resolveSource(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return path.normalize(candidate);
  }
  return null;
}

const entry = path.resolve(argumentValue("entry", defaultEntry));
const source = fs.readFileSync(entry, "utf8");
const names = new Set();
const failures = [];

for (const match of source.matchAll(/^\s*export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["'];?/gm)) {
  const exportedNames = match[1].split(",").map((value) => value.trim()).filter(Boolean);
  const specifier = match[2];
  const origin = resolveSource(entry, specifier);
  const allowedOrigin = origin !== null && (
    origin.startsWith(path.join(repositoryRoot, "src", "shared", "contracts")) ||
    origin.startsWith(path.join(repositoryRoot, "src", "world-sdk", "contracts"))
  );
  if (!allowedOrigin) failures.push(`export origin is not an approved shared/world-sdk contract: ${specifier}`);
  for (const exportedName of exportedNames) {
    const name = exportedName.split(/\s+as\s+/)[0];
    names.add(name);
    if (/\s+as\s+/.test(exportedName)) failures.push(`aliased export is not permitted: ${exportedName}`);
  }
}

if (/^\s*export\s+\*\s+from\s/m.test(source)) failures.push("wildcard export detected in the approved public entrypoint");
if (/^\s*export\s+(?:type\s+)?\{[^}]*\}\s*;?\s*$/m.test(source)) failures.push("inline exports are not permitted; export approved contracts from their canonical origins");

for (const name of [...names].sort()) if (!approved.has(name)) failures.push(`unexpected export ${name} in ${entry}`);
for (const name of [...approved].sort()) if (!names.has(name)) failures.push(`missing approved export ${name} from ${entry}`);

if (failures.length > 0) {
  console.error(`World SDK surface check failed for approved entrypoint ${entry}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`World SDK surface OK: ${names.size} approved named exports from ${entry}`);
}
