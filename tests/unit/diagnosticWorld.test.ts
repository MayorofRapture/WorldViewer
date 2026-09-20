import { Group, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import type {
  JsonObject,
  ViewerState,
  WorldAssetService,
  WorldContext,
  WorldFrame,
  WorldLogger,
} from "../../src/world-sdk/index";
import { createDiagnosticWorldHost } from "../../src/world-host/development/diagnosticBootstrap";
import { DiagnosticWorld } from "../../worlds-dev/diagnostic-room/src/DiagnosticWorld";
import { createDiagnosticScene } from "../../worlds-dev/diagnostic-room/src/scene";

function viewer(): ViewerState {
  return Object.freeze({
    timestampMs: 100,
    tracking: Object.freeze({ status: "tracked", confidence: 1, sinceMonotonicMs: 0 }),
    trackedPositionMm: Object.freeze({ x: 10, y: -5, z: 600 }),
    effectivePositionMm: Object.freeze({ x: 10, y: -5, z: 600 }),
    neutralPositionMm: Object.freeze({ x: 0, y: 0, z: 600 }),
    velocityMmPerSec: Object.freeze({ x: 0, y: 0, z: 0 }),
    confidence: 1,
  });
}

function frame(): WorldFrame {
  return Object.freeze({ frameNumber: 1, timestampMs: 100, deltaSeconds: 1 / 60, viewer: viewer() });
}

function context(root: Group, logger: WorldLogger): WorldContext {
  const assets: WorldAssetService = { resolve: (relativePath) => `asset://${relativePath}` };
  const settings: JsonObject = Object.freeze({ showGrid: true, gridSpacingMm: 50, accent: "cyan" });
  return Object.freeze({
    worldId: "local.worldviewer.diagnostic-room",
    root,
    assets,
    logger,
    settings,
    host: Object.freeze({ engineApiVersion: "1.0.0", displayProfileId: "m0b.synthetic" }),
  });
}

describe("diagnostic reference world", () => {
  it("initializes beneath the supplied root, updates from a frame, receives settings, and logs", () => {
    const root = new Group();
    const info = vi.fn();
    const logger: WorldLogger = { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() };
    const world = new DiagnosticWorld();

    world.initialize(context(root, logger));
    expect(root.children.length).toBe(1);
    expect(info).toHaveBeenCalledWith("Diagnostic room initialized", { asset: "asset://assets/marker.txt" });
    world.update(frame());
    world.resize({ pixelWidth: 800, pixelHeight: 600, devicePixelRatio: 1 });
    world.onSettingsChanged?.(Object.freeze({ showGrid: false, gridSpacingMm: 75, accent: "amber" }));
    expect(root.children.length).toBe(1);
    world.dispose();
    expect(root.children.length).toBe(0);
  });

  it("disposes representative Three.js resources", () => {
    const scene = createDiagnosticScene(true, 50, 0x00d9ff);
    const geometries = scene.root.children.flatMap((child) => {
      const geometry = (child as unknown as { geometry?: { dispose: () => void } }).geometry;
      return geometry ? [geometry] : [];
    });
    const disposers = geometries.map((geometry) => vi.spyOn(geometry, "dispose"));
    expect(scene.root.children.length).toBeGreaterThan(0);
    scene.dispose();
    expect(scene.root.children).toHaveLength(0);
    expect(disposers.every((spy) => spy.mock.calls.length === 1)).toBe(true);
  });

  it("uses the temporary bootstrap lifecycle and removes the host root", async () => {
    const scene = new Scene();
    const host = createDiagnosticWorldHost(scene);
    await host.initialize();
    expect(scene.children).toContain(host.root);
    expect(host.root.children.length).toBe(1);
    host.update(frame());
    await host.dispose();
    expect(scene.children).not.toContain(host.root);
    expect(host.root.children).toHaveLength(0);
  });
});
