import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sdkChecker = path.join(repositoryRoot, "scripts/check-world-sdk-surface.mjs");
const boundaryChecker = path.join(repositoryRoot, "scripts/check-world-boundaries.mjs");

function run(script: string, args: string[]): { status: number; output: string } {
  try {
    return { status: 0, output: execFileSync(process.execPath, [script, ...args], { cwd: repositoryRoot, encoding: "utf8", stdio: "pipe" }) };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failure.status ?? 1, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

describe("world boundary guards", () => {
  it("accepts the canonical SDK entrypoint import", () => {
    const root = path.join(repositoryRoot, "tests/fixtures/world-boundary/pass");
    expect(run(boundaryChecker, [`--root=${root}`])).toMatchObject({ status: 0 });
  });

  it.each(["shared", "engine"])("rejects a direct %s import", (directory) => {
    const root = path.join(repositoryRoot, `tests/fixtures/world-boundary/${directory}`);
    const result = run(boundaryChecker, [`--root=${root}`]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("private repository import");
  });

  it("rejects a direct Tauri import", () => {
    const root = path.join(repositoryRoot, "tests/fixtures/world-boundary/tauri");
    const result = run(boundaryChecker, [`--root=${root}`]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("forbidden platform/private import");
  });

  it("detects an unexpected SDK export", () => {
    const fixture = path.join(repositoryRoot, "tests/WorldBoundarySdkUnexpected.mjs");
    const result = run(sdkChecker, [`--entry=${fixture}`]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("unexpected export Unexpected");
  });
});
