import { useEffect, useMemo, useRef, useState } from "react";
import { MediaPipeTrackingSource, type TrackingSource, type TrackingVideoLike } from "../../mediapipe/mediapipeTrackingSource";
import { createScreenGeometry } from "../../engine/geometry/screenGeometry";
import { mediaPipeFacialTransformEstimator } from "../../m0d/estimators/mediaPipeFacialTransformEstimator";
import { createSelectedEstimatorACalibration } from "../../m0e/selectedEstimatorHandoff";
import { createDefaultCalibrationProfile, createDefaultDisplayProfile, type CalibrationProfile, type DisplayProfile } from "../../shared/contracts/calibration";
import type { RawViewerPose } from "../../engine/pose/SyntheticViewerPoseSource";
import { TauriCalibrationRepository, type CalibrationRepository } from "../../engine/calibration/persistence";

type CalibrationStep = "display" | "camera" | "geometry" | "neutral" | "review";
type CameraStatus = "initializing" | "active" | "permission-denied" | "unavailable" | "failed";

interface DraftState {
  name: string;
  widthMm: string;
  heightMm: string;
  cameraId: string;
  cameraX: string;
  cameraY: string;
  cameraZ: string;
  neutral: RawViewerPose | null;
}

export interface CalibrationWorkflowProps {
  readonly repository?: CalibrationRepository;
  readonly createTrackingSource?: (attachVideo: (video: TrackingVideoLike) => void) => TrackingSource;
  readonly onClose: () => void;
}

const INITIAL_DRAFT: DraftState = Object.freeze({ name: "My display", widthMm: "345.4", heightMm: "194.3", cameraId: "integrated-camera", cameraX: "0", cameraY: "103.188", cameraZ: "0", neutral: null });

function parsePositive(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFinite(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftValid(draft: DraftState): boolean {
  return parsePositive(draft.widthMm) !== null && parsePositive(draft.heightMm) !== null && draft.name.trim().length > 0 && draft.cameraId.trim().length > 0 && [draft.cameraX, draft.cameraY, draft.cameraZ].every((value) => parseFinite(value) !== null) && draft.neutral !== null;
}

export function CalibrationWorkflow({ repository = new TauriCalibrationRepository(), createTrackingSource, onClose }: CalibrationWorkflowProps) {
  const [step, setStep] = useState<CalibrationStep>("display");
  const [draft, setDraft] = useState<DraftState>(INITIAL_DRAFT);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("initializing");
  const [captureMessage, setCaptureMessage] = useState("No neutral pose captured.");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const previewHost = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<TrackingSource | null>(null);
  const latestPose = useRef<RawViewerPose | null>(null);
  const estimatorCalibration = useMemo(() => createSelectedEstimatorACalibration(), []);

  useEffect(() => {
    if (step !== "camera" && step !== "neutral") return;
    const source = createTrackingSource?.((video) => previewHost.current?.append(video as unknown as Node)) ?? new MediaPipeTrackingSource({
      attachVideo: (video) => previewHost.current?.append(video as unknown as Node),
    });
    sourceRef.current = source;
    const unsubscribe = source.subscribe((observation) => {
      const pose = mediaPipeFacialTransformEstimator.estimate(observation, {
        display: createScreenGeometry(Number(draft.widthMm) || 345.4, Number(draft.heightMm) || 194.3),
        camera: { cameraId: draft.cameraId, positionScreenMm: { x: Number(draft.cameraX) || 0, y: Number(draft.cameraY) || 0, z: Number(draft.cameraZ) || 0 } },
        calibration: estimatorCalibration,
      });
      if (pose !== null) latestPose.current = pose;
    });
    setCameraStatus("initializing");
    void source.start().then(() => setCameraStatus("active")).catch((error: unknown) => {
      const name = error instanceof DOMException ? error.name : "";
      setCameraStatus(name === "NotAllowedError" || name === "SecurityError" ? "permission-denied" : "failed");
    });
    return () => {
      unsubscribe();
      sourceRef.current = null;
      latestPose.current = null;
      void source.stop();
    };
  }, [createTrackingSource, draft.cameraId, draft.cameraX, draft.cameraY, draft.cameraZ, draft.heightMm, draft.widthMm, estimatorCalibration, step]);

  function update(key: keyof DraftState, value: string): void {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveMessage(null);
  }

  function next(): void {
    if (step === "display") setStep("camera");
    else if (step === "camera") setStep("geometry");
    else if (step === "geometry") setStep("neutral");
    else if (step === "neutral" && draft.neutral !== null) setStep("review");
  }

  function back(): void {
    if (step === "camera") setStep("display");
    else if (step === "geometry") setStep("camera");
    else if (step === "neutral") setStep("geometry");
    else if (step === "review") setStep("neutral");
  }

  function captureNeutral(): void {
    const pose = latestPose.current;
    if (pose === null) {
      setCaptureMessage("Capture failed: no finite selected-estimator pose is available. Check the camera and retry.");
      return;
    }
    setDraft((current) => ({ ...current, neutral: pose }));
    setCaptureMessage("Neutral pose captured from the selected estimator.");
  }

  function retryNeutral(): void {
    setDraft((current) => ({ ...current, neutral: null }));
    setCaptureMessage("Ready to capture again. Display and camera values were preserved.");
  }

  function resetDraft(): void {
    if (typeof window !== "undefined" && !window.confirm("Reset unsaved calibration values?")) return;
    setDraft(INITIAL_DRAFT);
    setStep("display");
    setCaptureMessage("Calibration values reset to the documented defaults.");
    setSaveMessage(null);
  }

  async function save(): Promise<void> {
    if (!draftValid(draft) || draft.neutral === null) return;
    const displayProfileId = `display-${draft.cameraId}`;
    const calibrationProfileId = `calibration-${draft.cameraId}`;
    const displayProfile = createDefaultDisplayProfile(displayProfileId, calibrationProfileId);
    const calibrationProfile = createDefaultCalibrationProfile(calibrationProfileId, displayProfileId, draft.cameraId);
    const customizedDisplay: DisplayProfile = Object.freeze({ ...displayProfile, name: draft.name, physicalWidthMm: parsePositive(draft.widthMm)!, physicalHeightMm: parsePositive(draft.heightMm)! });
    const customizedCalibration: CalibrationProfile = Object.freeze({ ...calibrationProfile, cameraGeometry: Object.freeze({ ...calibrationProfile.cameraGeometry, positionScreenMm: Object.freeze({ x: parseFinite(draft.cameraX)!, y: parseFinite(draft.cameraY)!, z: parseFinite(draft.cameraZ)! }) }), neutralViewerPositionMm: Object.freeze({ ...draft.neutral.positionMm }) });
    try {
      const current = await repository.load();
      await repository.savePair({ displayProfiles: [...current.displayProfiles.filter((profile) => profile.id !== customizedDisplay.id), customizedDisplay], calibrationProfiles: [...current.calibrationProfiles.filter((profile) => profile.id !== customizedCalibration.id), customizedCalibration] });
      setSaveMessage("Calibration saved successfully.");
    } catch (error) {
      setSaveMessage(`Save failed; your draft and previous valid profile remain available. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const statusLabel = cameraStatus === "permission-denied" ? "Permission denied" : cameraStatus === "active" ? "Active" : cameraStatus === "failed" ? "Failed" : cameraStatus === "unavailable" ? "Unavailable" : "Initializing";

  return <section className="calibration-workflow" aria-label="Display calibration">
    <header>
      <div><p className="eyebrow">Calibration</p><h2>{step === "display" ? "Display" : step === "camera" ? "Camera preview" : step === "geometry" ? "Camera geometry" : step === "neutral" ? "Neutral pose" : "Review and save"}</h2></div>
      <button type="button" onClick={onClose}>Cancel</button>
    </header>
    <ol className="calibration-steps" aria-label="Calibration progress">
      {(["display", "camera", "geometry", "neutral", "review"] as const).map((entry) => <li key={entry} className={entry === step ? "active" : ""}>{entry}</li>)}
    </ol>

    {step === "display" && <div className="calibration-panel"><label>Profile name<input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><div className="field-grid"><label>Physical width (mm)<input inputMode="decimal" value={draft.widthMm} onChange={(event) => update("widthMm", event.target.value)} /></label><label>Physical height (mm)<input inputMode="decimal" value={draft.heightMm} onChange={(event) => update("heightMm", event.target.value)} /></label></div><p className="hint">Enter the measured display dimensions in millimeters. Perspective strength remains the physical baseline of 1.0.</p><button type="button" disabled={parsePositive(draft.widthMm) === null || parsePositive(draft.heightMm) === null || draft.name.trim().length === 0} onClick={next}>Continue</button></div>}

    {step === "camera" && <div className="calibration-panel"><p className="status-line"><span className={`status-dot ${cameraStatus}`} />Camera: <strong>{statusLabel}</strong></p><div ref={previewHost} className="camera-preview" aria-label="Transient camera preview" /><p className="hint">The preview is transient and is not persisted. Use the fixed integrated camera when available.</p><button type="button" onClick={next}>Continue</button></div>}

    {step === "geometry" && <div className="calibration-panel"><label>Camera identity<input value={draft.cameraId} onChange={(event) => update("cameraId", event.target.value)} /></label><div className="field-grid three"><label>Camera right (+X) mm<input inputMode="decimal" value={draft.cameraX} onChange={(event) => update("cameraX", event.target.value)} /></label><label>Camera up (+Y) mm<input inputMode="decimal" value={draft.cameraY} onChange={(event) => update("cameraY", event.target.value)} /></label><label>Camera outward (+Z) mm<input inputMode="decimal" value={draft.cameraZ} onChange={(event) => update("cameraZ", event.target.value)} /></label></div><p className="hint">+X is viewer/operator right, +Y is up, and +Z points outward toward the viewer. FOV is optional and is not required here.</p><button type="button" disabled={draft.cameraId.trim().length === 0 || [draft.cameraX, draft.cameraY, draft.cameraZ].some((value) => parseFinite(value) === null)} onClick={next}>Continue</button></div>}

    {step === "neutral" && <div className="calibration-panel"><p className="hint">Sit neutrally and capture one finite canonical pose from the selected estimator. This step does not fit host calibration.</p><p className="status-line"><span className={`status-dot ${cameraStatus}`} />Camera: <strong>{statusLabel}</strong></p><p role="status">{captureMessage}</p>{draft.neutral !== null && <dl className="pose-summary"><div><dt>X</dt><dd>{draft.neutral.positionMm.x.toFixed(2)} mm</dd></div><div><dt>Y</dt><dd>{draft.neutral.positionMm.y.toFixed(2)} mm</dd></div><div><dt>Z</dt><dd>{draft.neutral.positionMm.z.toFixed(2)} mm</dd></div></dl>}<div className="button-row"><button type="button" onClick={captureNeutral}>Capture neutral pose</button><button type="button" onClick={retryNeutral}>Retry</button></div><button type="button" disabled={draft.neutral === null} onClick={next}>Continue</button></div>}

    {step === "review" && <div className="calibration-panel"><dl className="review-list"><div><dt>Display</dt><dd>{draft.name} — {draft.widthMm} × {draft.heightMm} mm</dd></div><div><dt>Camera</dt><dd>{draft.cameraId} — ({draft.cameraX}, {draft.cameraY}, {draft.cameraZ}) mm</dd></div><div><dt>Neutral pose</dt><dd>{draft.neutral ? `${draft.neutral.positionMm.x.toFixed(2)}, ${draft.neutral.positionMm.y.toFixed(2)}, ${draft.neutral.positionMm.z.toFixed(2)} mm` : "Not captured"}</dd></div><div><dt>Host correction</dt><dd>Identity (scale 1, offset 0)</dd></div></dl>{saveMessage !== null && <p role="status">{saveMessage}</p>}<div className="button-row"><button type="button" onClick={() => void save()} disabled={!draftValid(draft)}>Save calibration</button><button type="button" onClick={resetDraft}>Reset calibration values</button></div></div>}

    <footer className="calibration-footer">{step !== "display" && <button type="button" onClick={back}>Back</button>}<span />{step !== "review" && <button type="button" className="secondary" onClick={onClose}>Cancel</button>}</footer>
  </section>;
}
