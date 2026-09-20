import { PerspectiveCamera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import { SYNTHETIC_MOTION_SCRIPTS, type SyntheticMotionScript } from "../../src/engine/pose/syntheticMotionScripts";
import type { AnimationFrameScheduler, SyntheticProjectionRenderHost } from "../../src/world-host/development/syntheticProjectionRuntime";
import { SyntheticProjectionRuntime } from "../../src/world-host/development/syntheticProjectionRuntime";
import { createDiagnosticWorldHost } from "../../src/world-host/development/diagnosticBootstrap";

function script(id: SyntheticMotionScript["id"]): SyntheticMotionScript {
  const result = SYNTHETIC_MOTION_SCRIPTS.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`missing synthetic motion script: ${id}`);
  return result;
}

function scheduler(): { scheduler: AnimationFrameScheduler; callbacks: Map<number, (timestampMs: number) => void>; request: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> } {
  const callbacks = new Map<number, (timestampMs: number) => void>();
  const request = vi.fn((callback: (timestampMs: number) => void) => {
    const handle = callbacks.size + 1;
    callbacks.set(handle, callback);
    return handle;
  });
  const cancel = vi.fn((handle: number) => callbacks.delete(handle));
  return { scheduler: { request, cancel }, callbacks, request, cancel };
}

function renderHost(): { host: SyntheticProjectionRenderHost; render: ReturnType<typeof vi.fn> } {
  const render = vi.fn();
  return {
    host: { scene: new Scene(), camera: new PerspectiveCamera(), renderer: { render } },
    render,
  };
}

describe("M0B synthetic projection runtime", () => {
  it("centers the E590 camera/frustum and keeps the diagnostic root fixed", async () => {
    const { host, render } = renderHost();
    const scheduled = scheduler();
    const runtime = new SyntheticProjectionRuntime(host, script("centered-hold"), scheduled.scheduler);
    await runtime.start();
    const rootPosition = host.scene.children[0]!.position.clone();
    const diagnosticRootPosition = host.scene.children[0]!.children[0]!.position.clone();

    runtime.step(0);

    expect(host.camera.position.toArray()).toEqual([0, 0, 600]);
    expect(host.camera.projectionMatrix.elements[8]).toBe(0);
    expect(host.camera.projectionMatrix.elements[9]).toBe(0);
    expect(host.scene.children[0]!.position).toEqual(rootPosition);
    expect(host.scene.children[0]!.children[0]!.position).toEqual(diagnosticRootPosition);
    expect(render).toHaveBeenCalledWith(host.scene, host.camera);
    await runtime.dispose();
  });

  it("applies frozen lateral, vertical, and distance directions through camera state only", async () => {
    const lateral = renderHost();
    const lateralRuntime = new SyntheticProjectionRuntime(lateral.host, script("lateral-left-to-right"), scheduler().scheduler);
    await lateralRuntime.start();
    lateralRuntime.step(1000);
    const leftProjectionOffset = lateral.host.camera.projectionMatrix.elements[8]!;
    lateralRuntime.step(1200);
    expect(lateral.host.camera.position.x).toBe(50);
    expect(leftProjectionOffset).toBeGreaterThan(0);
    expect(lateral.host.camera.projectionMatrix.elements[8]).toBeLessThan(0);
    await lateralRuntime.dispose();

    const vertical = renderHost();
    const verticalRuntime = new SyntheticProjectionRuntime(vertical.host, script("vertical-down-to-up"), scheduler().scheduler);
    await verticalRuntime.start();
    verticalRuntime.step(0);
    const downProjectionOffset = vertical.host.camera.projectionMatrix.elements[9]!;
    verticalRuntime.step(200);
    expect(vertical.host.camera.position.y).toBe(50);
    expect(downProjectionOffset).toBeGreaterThan(0);
    expect(vertical.host.camera.projectionMatrix.elements[9]).toBeLessThan(0);
    await verticalRuntime.dispose();

    const distance = renderHost();
    const distanceRuntime = new SyntheticProjectionRuntime(distance.host, script("approach-retreat"), scheduler().scheduler);
    await distanceRuntime.start();
    distanceRuntime.step(0);
    const farScale = distance.host.camera.projectionMatrix.elements[0]!;
    distanceRuntime.step(200);
    expect(distance.host.camera.position.z).toBe(450);
    expect(farScale).toBeGreaterThan(distance.host.camera.projectionMatrix.elements[0]!);
    await distanceRuntime.dispose();
  });

  it("applies strength zero at neutral and strength one at the physical synthetic eye", async () => {
    const strengthZero = renderHost();
    const neutralRuntime = new SyntheticProjectionRuntime(strengthZero.host, script("asymmetric-x-y"), scheduler().scheduler, 0);
    await neutralRuntime.start();
    neutralRuntime.step(1000);
    neutralRuntime.step(1200);
    expect(strengthZero.host.camera.position.toArray()).toEqual([0, 0, 600]);
    expect(strengthZero.host.camera.projectionMatrix.elements[8]).toBe(0);
    expect(strengthZero.host.camera.projectionMatrix.elements[9]).toBe(0);
    const neutralDiagnosticPosition = strengthZero.host.scene.children[0]!.children[0]!.position.clone();
    await neutralRuntime.dispose();

    const strengthOne = renderHost();
    const physicalRuntime = new SyntheticProjectionRuntime(strengthOne.host, script("asymmetric-x-y"), scheduler().scheduler, 1);
    await physicalRuntime.start();
    physicalRuntime.step(1000);
    physicalRuntime.step(1200);
    expect(strengthOne.host.camera.position.toArray()).toEqual([35, -20, 600]);
    expect(strengthOne.host.camera.projectionMatrix.elements[8]).toBeLessThan(0);
    expect(strengthOne.host.camera.projectionMatrix.elements[9]).toBeGreaterThan(0);
    expect(strengthOne.host.scene.children[0]!.children[0]!.position).toEqual(neutralDiagnosticPosition);
    await physicalRuntime.dispose();
  });

  it("cancels scheduling, disposes the diagnostic world, and keeps world context private", async () => {
    const { host } = renderHost();
    const scheduled = scheduler();
    const runtime = new SyntheticProjectionRuntime(host, script("asymmetric-x-y"), scheduled.scheduler);
    await runtime.start();
    expect(scheduled.request).toHaveBeenCalledTimes(1);
    expect(host.scene.children).toHaveLength(1);

    await runtime.dispose();

    expect(scheduled.cancel).toHaveBeenCalledWith(1);
    expect(host.scene.children).toHaveLength(0);
    expect(scheduled.callbacks).toHaveLength(0);

    const diagnosticHost = createDiagnosticWorldHost(new Scene());
    expect(Object.keys(diagnosticHost.context)).not.toContain("camera");
    expect(Object.keys(diagnosticHost.context)).not.toContain("projection");
    await diagnosticHost.dispose();
  });
});
