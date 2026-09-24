import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = resolve("node_modules/@mediapipe/tasks-vision");

describe("MediaPipe 1.0.1 matrix package provenance", () => {
  it("records the exact package facts and conversion behavior", () => {
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
    const lockfile = readFileSync("package-lock.json", "utf8");
    const declarations = readFileSync(resolve(packageRoot, "vision.d.ts"), "utf8");
    const bundleMap = readFileSync(resolve(packageRoot, "vision_bundle.mjs.map"), "utf8");

    expect(packageJson.name).toBe("@mediapipe/tasks-vision");
    expect(packageJson.version).toBe("1.0.1");
    expect(lockfile).toContain("https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.0.1.tgz");
    expect(lockfile).toContain("sha512-rvRE2FmAZ6ZxKSw7wq+e+jQDpN3t1B/tD2mJz9SmAzb1msoDkd4dMoE4wAh8Z30Um0PQwLiHr9QtomhmXk3aUQ==");
    expect(declarations).toMatch(/interface Matrix[\s\S]*rows: number;[\s\S]*columns: number;[\s\S]*data: number\[\];/);

    const marker = 'attachProtoVectorListener(\\"face_geometry\\"';
    const conversionStart = bundleMap.indexOf(marker);
    expect(conversionStart).toBeGreaterThanOrEqual(0);
    const conversion = bundleMap.slice(conversionStart, conversionStart + 1600);
    expect(conversion).toContain("facialTransformationMatrixes.push({rows:");
    expect(conversion).toContain("data:xd(d,3,cc,wd()).slice()");
    expect(conversion).not.toMatch(/transpose|transpos|reorder|reverse/);
  });
});
