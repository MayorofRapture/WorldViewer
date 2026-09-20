import { Matrix4, PerspectiveCamera } from "three";
import { describe, expect, it, vi } from "vitest";
import { createScreenGeometry, type Vec3Mm } from "../../src/engine/geometry/screenGeometry";
import { applyOffAxisProjectionToCamera } from "../../src/engine/projection/cameraProjection";
import { createOffAxisProjectionMatrix } from "../../src/engine/projection/offAxisProjection";
import { RendererFoundation } from "../../src/engine/rendering/RendererFoundation";
import { PROJECTION_REFERENCE_CASES } from "../fixtures/projectionReferenceCases";

const MATRIX_ABS_EPS = 1e-9;
const IDENTITY_ABS_EPS = 1e-12;

function expectMatrixClose(actual: Matrix4, expected: Matrix4, epsilon: number): void {
  actual.elements.forEach((value, index) => {
    expect(Math.abs(value - expected.elements[index]!)).toBeLessThanOrEqual(epsilon);
  });
}

function referenceInputs(id: string): { screenGeometry: ReturnType<typeof createScreenGeometry>; eyeMm: Vec3Mm; nearMm: number; farMm: number } {
  const reference = PROJECTION_REFERENCE_CASES.find((candidate) => candidate.id === id)!;
  return {
    screenGeometry: createScreenGeometry(reference.screenMm[0], reference.screenMm[1]),
    eyeMm: Object.freeze({ x: reference.eyeMm[0], y: reference.eyeMm[1], z: reference.eyeMm[2] }),
    nearMm: reference.nearMm,
    farMm: reference.farMm,
  };
}

describe("M0B off-axis camera application", () => {
  it.each(["C01-centered", "C02-left", "C04-down", "C10-outside", "C11-e590"])("applies the fixed camera state for %s", (id) => {
    const { screenGeometry, eyeMm, nearMm, farMm } = referenceInputs(id);
    const camera = new PerspectiveCamera(45, 1.5, 0.1, 10_000);
    camera.position.set(999, 888, 777);
    camera.rotation.set(0.2, 0.3, 0.4);
    camera.up.set(4, 5, 6);

    applyOffAxisProjectionToCamera(camera, screenGeometry, eyeMm, nearMm, farMm);

    expect(camera.position.toArray()).toEqual([eyeMm.x, eyeMm.y, eyeMm.z]);
    expect(camera.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(camera.near).toBe(nearMm);
    expect(camera.far).toBe(farMm);
    expectMatrixClose(camera.projectionMatrix, createOffAxisProjectionMatrix(screenGeometry, eyeMm, nearMm, farMm), MATRIX_ABS_EPS);
    expectMatrixClose(new Matrix4().multiplyMatrices(camera.projectionMatrixInverse, camera.projectionMatrix), new Matrix4(), IDENTITY_ABS_EPS);
    expect(screenGeometry).toEqual(createScreenGeometry(screenGeometry.widthMm, screenGeometry.heightMm));
    expect(eyeMm).toEqual({ x: eyeMm.x, y: eyeMm.y, z: eyeMm.z });
  });

  it("updates the camera when a later eye is applied", () => {
    const first = referenceInputs("C01-centered");
    const second = referenceInputs("C11-e590");
    const camera = new PerspectiveCamera();

    applyOffAxisProjectionToCamera(camera, first.screenGeometry, first.eyeMm, first.nearMm, first.farMm);
    const firstProjection = camera.projectionMatrix.clone();
    applyOffAxisProjectionToCamera(camera, second.screenGeometry, second.eyeMm, second.nearMm, second.farMm);

    expect(camera.position.toArray()).toEqual([second.eyeMm.x, second.eyeMm.y, second.eyeMm.z]);
    expect(camera.projectionMatrix.equals(firstProjection)).toBe(false);
    expectMatrixClose(camera.projectionMatrix, createOffAxisProjectionMatrix(second.screenGeometry, second.eyeMm, second.nearMm, second.farMm), MATRIX_ABS_EPS);
  });

  it("keeps the engine-owned custom projection through renderer resize", () => {
    const { screenGeometry, eyeMm, nearMm, farMm } = referenceInputs("C10-outside");
    const camera = new PerspectiveCamera();
    const setSize = vi.fn();
    const foundation = {
      disposed: false,
      host: { clientWidth: 1280, clientHeight: 720 },
      renderer: { setSize },
      camera,
    } as unknown as RendererFoundation;

    applyOffAxisProjectionToCamera(camera, screenGeometry, eyeMm, nearMm, farMm);
    const expectedProjection = camera.projectionMatrix.clone();
    RendererFoundation.prototype.resize.call(foundation);

    expect(setSize).toHaveBeenCalledWith(1280, 720, false);
    expectMatrixClose(camera.projectionMatrix, expectedProjection, MATRIX_ABS_EPS);
  });
});
