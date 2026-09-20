import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RendererFoundation } from "../engine/rendering/RendererFoundation";
import { SYNTHETIC_MOTION_SCRIPTS } from "../engine/pose/syntheticMotionScripts";
import { SyntheticProjectionRuntime, type SyntheticProjectionRuntimeObservation } from "../world-host/development/syntheticProjectionRuntime";

type SmokeMode = "launch" | "synthetic";
type SmokeStatus = "pass" | "fail";
type SmokeResult = {
  schemaVersion: 1;
  mode: SmokeMode;
  status: SmokeStatus;
  checks: Array<{ id: string; status: SmokeStatus; detail?: string }>;
  durationMs: number;
  errors: Array<{ code: string; message: string }>;
};

const SYNTHETIC_CHECK_IDS = [
  "renderer-ready",
  "diagnostic-world-ready",
  "viewer-state-controller-ready",
  "projection-ready",
  "synthetic-sequence-complete",
] as const;

function finiteValues(values: readonly number[]): boolean {
  return values.every((value) => Number.isFinite(value));
}

function syntheticChecks(observation: SyntheticProjectionRuntimeObservation): SmokeResult["checks"] {
  const { frame, cameraPositionMm, cameraQuaternion, projectionMatrix, syntheticPose } = observation;
  const viewer = frame.viewer;
  const finiteViewer = [
    frame.timestampMs,
    viewer.timestampMs,
    viewer.confidence ?? 0,
    viewer.effectivePositionMm.x,
    viewer.effectivePositionMm.y,
    viewer.effectivePositionMm.z,
    viewer.neutralPositionMm.x,
    viewer.neutralPositionMm.y,
    viewer.neutralPositionMm.z,
  ].every(Number.isFinite);
  const controllerReady = viewer.tracking.status === "tracked"
    && viewer.confidence === 1
    && viewer.trackedPositionMm?.x === 35
    && viewer.trackedPositionMm?.y === -20
    && viewer.trackedPositionMm?.z === 600
    && viewer.effectivePositionMm.x === 35
    && viewer.effectivePositionMm.y === -20
    && viewer.effectivePositionMm.z === 600
    && viewer.neutralPositionMm.x === 0
    && viewer.neutralPositionMm.y === 0
    && viewer.neutralPositionMm.z === 600
    && finiteViewer;
  const projectionReady = cameraPositionMm.x === 35
    && cameraPositionMm.y === -20
    && cameraPositionMm.z === 600
    && cameraQuaternion.length === 4
    && cameraQuaternion[0] === 0
    && cameraQuaternion[1] === 0
    && cameraQuaternion[2] === 0
    && cameraQuaternion[3] === 1
    && projectionMatrix.length === 16
    && finiteValues(projectionMatrix);
  const sequenceComplete = syntheticPose?.positionMm.x === 35
    && syntheticPose.positionMm.y === -20
    && syntheticPose.positionMm.z === 600;

  return [
    { id: "renderer-ready", status: "pass", detail: "WebGLRenderer completed a render" },
    { id: "diagnostic-world-ready", status: "pass", detail: "static diagnostic world initialized and updated" },
    { id: "viewer-state-controller-ready", status: controllerReady ? "pass" : "fail", ...(controllerReady ? {} : { detail: "final ViewerState was not controller-generated as expected" }) },
    { id: "projection-ready", status: projectionReady ? "pass" : "fail", ...(projectionReady ? {} : { detail: "camera projection did not reflect the final effective viewer" }) },
    { id: "synthetic-sequence-complete", status: sequenceComplete ? "pass" : "fail", ...(sequenceComplete ? {} : { detail: "final asymmetric synthetic pose was not observed" }) },
  ];
}

function syntheticFailureResult(startedAt: number, message: string): SmokeResult {
  return {
    schemaVersion: 1,
    mode: "synthetic",
    status: "fail",
    checks: SYNTHETIC_CHECK_IDS.map((id) => ({ id, status: "fail", detail: message })),
    durationMs: Math.max(0, performance.now() - startedAt),
    errors: [{ code: "SMOKE_RUNTIME_FAILED", message }],
  };
}

export default function App() {
  const smokeCompleted = useRef(false);
  const rendererHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let foundation: RendererFoundation | undefined;
    let syntheticRuntime: SyntheticProjectionRuntime | undefined;
    let cancelled = false;

    void invoke<SmokeMode | null>("get_startup_mode")
      .catch(() => null)
      .then((mode) => {
        if (cancelled || mode === "launch" || !rendererHost.current) return;
        const startedAt = performance.now();
        let completeSynthetic: ((result: SmokeResult) => void) | undefined;
        if (mode === "synthetic") {
          completeSynthetic = (result) => {
            if (cancelled || smokeCompleted.current) return;
            smokeCompleted.current = true;
            void invoke("complete_smoke", { result });
          };
        }
        try {
          foundation = new RendererFoundation(rendererHost.current);
          if (mode === "synthetic") {
            const motionScript = SYNTHETIC_MOTION_SCRIPTS.find(({ id }) => id === "asymmetric-x-y");
            if (!motionScript) throw new Error("asymmetric-x-y synthetic script is unavailable");
            syntheticRuntime = new SyntheticProjectionRuntime(
              foundation,
              motionScript,
              undefined,
              1,
              {
                observer: (observation) => {
                  const checks = syntheticChecks(observation);
                  if (checks.find((check) => check.id === "synthetic-sequence-complete")?.status !== "pass") return;
                  const status: SmokeStatus = checks.every((check) => check.status === "pass") ? "pass" : "fail";
                  completeSynthetic?.({
                    schemaVersion: 1,
                    mode: "synthetic",
                    status,
                    checks,
                    durationMs: Math.max(0, performance.now() - startedAt),
                    errors: status === "pass" ? [] : [{ code: "SMOKE_ASSERTION_FAILED", message: "synthetic packaged smoke assertion failed" }],
                  });
                },
                onError: (error) => completeSynthetic?.(syntheticFailureResult(startedAt, String(error))),
              },
            );
            void syntheticRuntime.start().catch((error: unknown) => completeSynthetic?.(syntheticFailureResult(startedAt, String(error))));
          } else {
            syntheticRuntime = new SyntheticProjectionRuntime(foundation);
            void syntheticRuntime.start().then(() => {
              if (cancelled) void syntheticRuntime?.dispose();
            });
          }
        } catch (error) {
          if (mode === "synthetic") {
            completeSynthetic?.(syntheticFailureResult(startedAt, String(error)));
          } else {
            throw error;
          }
        }
      });

    return () => {
      cancelled = true;
      if (syntheticRuntime) {
        void syntheticRuntime.dispose().finally(() => foundation?.dispose());
      } else {
        foundation?.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const startedAt = performance.now();

    void invoke<SmokeMode | null>("get_startup_mode").then((mode) => {
      if (mode !== "launch") return;
      if (smokeCompleted.current) return;
      smokeCompleted.current = true;
      const result: SmokeResult = {
        schemaVersion: 1,
        mode,
        status: "pass",
        checks: [{ id: "application-shell-ready", status: "pass" }],
        durationMs: performance.now() - startedAt,
        errors: [],
      };
      return invoke("complete_smoke", { result });
    }).catch((error: unknown) => {
      const result: SmokeResult = {
        schemaVersion: 1,
        mode: "launch",
        status: "fail",
        checks: [{ id: "application-shell-ready", status: "fail", detail: "startup command failed" }],
        durationMs: performance.now() - startedAt,
        errors: [{ code: "SMOKE_STARTUP_FAILED", message: String(error) }],
      };
      return invoke("complete_smoke", { result });
    });
  }, []);

  return (
    <main>
      <h1>WorldViewer</h1>
      <p>Application foundation.</p>
      <div className="renderer-host" ref={rendererHost} aria-label="WorldViewer renderer" />
    </main>
  );
}
