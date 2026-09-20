import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript/unstable/ast";

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

const scanner = ts.createScanner(true, ts.LanguageVariant.Standard, source);
let token = scanner.scan();
const next = () => { token = scanner.scan(); return token; };
const tokenText = () => scanner.getTokenText();
const declarationKeywords = new Map([
  [ts.SyntaxKind.TypeKeyword, "type"],
  [ts.SyntaxKind.InterfaceKeyword, "interface"],
  [ts.SyntaxKind.ConstKeyword, "const"],
  [ts.SyntaxKind.LetKeyword, "let"],
  [ts.SyntaxKind.VarKeyword, "var"],
  [ts.SyntaxKind.FunctionKeyword, "function"],
  [ts.SyntaxKind.ClassKeyword, "class"],
  [ts.SyntaxKind.EnumKeyword, "enum"],
]);

function recordNamedExport(exportedName, alias = false) {
  names.add(exportedName);
  if (alias) failures.push(`aliased export is not permitted: ${exportedName}`);
}

while (token !== ts.SyntaxKind.EndOfFile) {
  if (token !== ts.SyntaxKind.ExportKeyword) {
    next();
    continue;
  }

  const exportPosition = scanner.getTokenStart();
  const afterExport = next();
  if (afterExport === ts.SyntaxKind.DefaultKeyword) {
    failures.push(`default export detected at position ${exportPosition}`);
    next();
    continue;
  }
  if (afterExport === ts.SyntaxKind.AsteriskToken) {
    failures.push(`wildcard export detected at position ${exportPosition}`);
    next();
    continue;
  }
  let namedStart = afterExport;
  if (afterExport === ts.SyntaxKind.TypeKeyword) {
    namedStart = next();
    if (namedStart !== ts.SyntaxKind.OpenBraceToken) {
      const declarationName = namedStart === ts.SyntaxKind.Identifier ? tokenText() : "<anonymous>";
      failures.push(`unexpected direct export declaration ${declarationName} (type)`);
      next();
      continue;
    }
  } else if (declarationKeywords.has(afterExport)) {
    const keyword = declarationKeywords.get(afterExport);
    const declarationName = next() === ts.SyntaxKind.Identifier ? tokenText() : "<anonymous>";
    failures.push(`unexpected direct export declaration ${declarationName} (${keyword})`);
    next();
    continue;
  }
  if (afterExport === ts.SyntaxKind.EqualsToken) {
    failures.push(`unsupported export assignment at position ${exportPosition}`);
    next();
    continue;
  }

  if (namedStart !== ts.SyntaxKind.OpenBraceToken) {
    failures.push(`unsupported export form at position ${exportPosition}`);
    next();
    continue;
  }

  const exported = [];
  while (next() !== ts.SyntaxKind.CloseBraceToken && token !== ts.SyntaxKind.EndOfFile) {
    if (token === ts.SyntaxKind.CommaToken) continue;
    if (token === ts.SyntaxKind.AsKeyword) {
      const alias = next() === ts.SyntaxKind.Identifier ? tokenText() : "<unknown>";
      if (exported.length > 0) exported[exported.length - 1].alias = alias;
      continue;
    }
    if (token === ts.SyntaxKind.Identifier || token === ts.SyntaxKind.StringLiteral) {
      exported.push({ name: tokenText(), alias: null });
    }
  }

  const afterBrace = next();
  if (afterBrace !== ts.SyntaxKind.FromKeyword) {
    failures.push(`local export declaration at position ${exportPosition} has no approved module origin`);
    for (const item of exported) recordNamedExport(item.name);
    continue;
  }
  const moduleToken = next();
  if (moduleToken !== ts.SyntaxKind.StringLiteral) {
    failures.push(`export at position ${exportPosition} has no valid module origin`);
    continue;
  }
  const specifier = tokenText().slice(1, -1);
  const origin = resolveSource(entry, specifier);
  const allowedOrigin = origin !== null && (
    origin.startsWith(path.join(repositoryRoot, "src", "shared", "contracts")) ||
    origin.startsWith(path.join(repositoryRoot, "src", "world-sdk", "contracts"))
  );
  if (!allowedOrigin) failures.push(`export origin is not an approved shared/world-sdk contract: ${specifier}`);
  for (const item of exported) recordNamedExport(item.name, item.alias !== null);
  next();
}

for (const name of [...names].sort()) if (!approved.has(name)) failures.push(`unexpected export ${name} in ${entry}`);
for (const name of [...approved].sort()) if (!names.has(name)) failures.push(`missing approved export ${name} from ${entry}`);

if (failures.length > 0) {
  console.error(`World SDK surface check failed for approved entrypoint ${entry}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`World SDK surface OK: ${names.size} approved named exports from ${entry}`);
}
