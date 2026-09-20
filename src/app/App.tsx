import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

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
    </main>
  );
}
