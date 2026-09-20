import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const defaultRoot = path.join(repositoryRoot, "worlds-dev");
const sourceRoot = path.resolve((process.argv.find((value) => value.startsWith("--root=")) ?? `--root=${defaultRoot}`).slice(7));
const publicEntry = path.normalize(path.join(repositoryRoot, "src", "world-sdk", "index.ts"));
const failures = [];

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(full));
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate)) return path.normalize(candidate);
  }
  return path.normalize(base);
}

for (const file of filesUnder(sourceRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const imports = [...source.matchAll(/(?:import\s+(?:type\s+)?[^;]*?from\s*|export\s+[^;]*?from\s*|import\s*\()(['"])([^'"]+)\1/g)].map((match) => match[2]);
  const sideEffectImports = [...source.matchAll(/\bimport\s*(['"])([^'"]+)\1/g)].map((match) => match[2]);
  imports.push(...sideEffectImports);
  for (const specifier of imports) {
    if (specifier.startsWith("@tauri-apps/") || /^(?:node:)?(?:fs|path|child_process|net|http|https)$/.test(specifier)) {
      failures.push(`${file}: forbidden platform/private import ${specifier}; use the canonical world SDK`);
      continue;
    }
    const resolved = resolveImport(file, specifier);
    if (resolved && resolved.startsWith(repositoryRoot) && resolved.startsWith(path.join(repositoryRoot, "src")) && resolved !== publicEntry) {
      failures.push(`${file}: private repository import ${specifier} resolves to ${resolved}; worlds may cross into src only through ${publicEntry}`);
    }
    if (specifier === "three" || !specifier.startsWith(".")) continue;
  }
  if (/navigator\.mediaDevices|\b(?:fetch|WebSocket)\s*\(/.test(source)) {
    failures.push(`${file}: direct media/network runtime access is forbidden in normal world source`);
  }
}

if (failures.length > 0) {
  console.error(`World source-boundary check failed for ${sourceRoot}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`World source boundaries OK: scanned ${filesUnder(sourceRoot).length} source file(s) under ${sourceRoot}`);
}
