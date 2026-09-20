import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RendererFoundation } from "../engine/rendering/RendererFoundation";
import { SyntheticProjectionRuntime } from "../world-host/development/syntheticProjectionRuntime";

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
        foundation = new RendererFoundation(rendererHost.current);
        if (mode === "synthetic" || mode === null) {
          syntheticRuntime = new SyntheticProjectionRuntime(foundation);
          void syntheticRuntime.start().then(() => {
            if (cancelled) void syntheticRuntime?.dispose();
          });
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
    if (smokeCompleted.current) return;
    smokeCompleted.current = true;
    const startedAt = performance.now();

    void invoke<SmokeMode | null>("get_startup_mode").then((mode) => {
      if (mode !== "launch") return;
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
