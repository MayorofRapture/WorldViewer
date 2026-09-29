import { invoke } from "@tauri-apps/api/core";
import {
  CALIBRATION_SCHEMA_VERSION,
  type CalibrationDocuments,
  type CalibrationProfile,
  type DisplayProfile,
  type ProfileDocument,
  validateCalibrationDocuments,
  validateCalibrationProfile,
  validateDisplayProfile,
  validateProfileDocument,
} from "../../shared/contracts/calibration";

export interface CalibrationRepository {
  load(): Promise<CalibrationDocuments>;
  savePair(documents: CalibrationDocuments): Promise<void>;
  saveDisplayProfile(profile: DisplayProfile): Promise<void>;
  saveCalibrationProfile(profile: CalibrationProfile): Promise<void>;
}

export interface NativeCalibrationDocuments {
  readonly displayProfiles: unknown;
  readonly calibrationProfiles: unknown;
}

export class CalibrationPersistenceError extends Error {
  readonly code: string;
  readonly source: "display-profiles" | "calibration-profiles" | "combined" | "native";

  constructor(code: string, source: CalibrationPersistenceError["source"], message: string) {
    super(message);
    this.name = "CalibrationPersistenceError";
    this.code = code;
    this.source = source;
  }
}

const emptyDocuments = (): CalibrationDocuments => ({ displayProfiles: [], calibrationProfiles: [] });

function asDocument(value: unknown, source: CalibrationPersistenceError["source"]): CalibrationDocuments {
  try {
    const displayDocument = validateProfileDocument(value && typeof value === "object" && "displayProfiles" in value ? (value as { displayProfiles: unknown }).displayProfiles : value, validateDisplayProfile, "displayProfiles");
    const calibrationDocument = validateProfileDocument(value && typeof value === "object" && "calibrationProfiles" in value ? (value as { calibrationProfiles: unknown }).calibrationProfiles : value, validateCalibrationProfile, "calibrationProfiles");
    return validateCalibrationDocuments({ displayProfiles: displayDocument, calibrationProfiles: calibrationDocument });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CalibrationPersistenceError("invalid-persisted-document", source, message);
  }
}

function document<TProfile>(profiles: readonly TProfile[]): ProfileDocument<TProfile> {
  return Object.freeze({ schemaVersion: CALIBRATION_SCHEMA_VERSION, profiles: Object.freeze([...profiles]) });
}

export class TauriCalibrationRepository implements CalibrationRepository {
  async load(): Promise<CalibrationDocuments> {
    let raw: NativeCalibrationDocuments;
    try {
      raw = await invoke<NativeCalibrationDocuments>("read_calibration_documents");
    } catch (error) {
      throw new CalibrationPersistenceError("native-read-failed", "native", error instanceof Error ? error.message : String(error));
    }
    return asDocument(raw, "combined");
  }

  async savePair(documents: CalibrationDocuments): Promise<void> {
    const validated = validateCalibrationDocuments(documents);
    try {
      await invoke("write_calibration_documents", {
        displayProfiles: document(validated.displayProfiles),
        calibrationProfiles: document(validated.calibrationProfiles),
      });
    } catch (error) {
      throw new CalibrationPersistenceError("native-write-failed", "native", error instanceof Error ? error.message : String(error));
    }
  }

  async saveDisplayProfile(profile: DisplayProfile): Promise<void> {
    const current = await this.load();
    const validated = validateDisplayProfile(profile);
    const profiles = [...current.displayProfiles.filter((entry) => entry.id !== validated.id), validated];
    await this.savePair({ displayProfiles: profiles, calibrationProfiles: current.calibrationProfiles });
  }

  async saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
    const current = await this.load();
    const validated = validateCalibrationProfile(profile);
    const profiles = [...current.calibrationProfiles.filter((entry) => entry.id !== validated.id), validated];
    await this.savePair({ displayProfiles: current.displayProfiles, calibrationProfiles: profiles });
  }
}

export class MemoryCalibrationRepository implements CalibrationRepository {
  private documents: CalibrationDocuments;

  constructor(initial: CalibrationDocuments = emptyDocuments()) {
    this.documents = validateCalibrationDocuments({
      displayProfiles: document(initial.displayProfiles),
      calibrationProfiles: document(initial.calibrationProfiles),
    });
  }

  async load(): Promise<CalibrationDocuments> {
    return validateCalibrationDocuments({
      displayProfiles: document(this.documents.displayProfiles),
      calibrationProfiles: document(this.documents.calibrationProfiles),
    });
  }

  async savePair(documents: CalibrationDocuments): Promise<void> {
    this.documents = validateCalibrationDocuments({
      displayProfiles: document(documents.displayProfiles),
      calibrationProfiles: document(documents.calibrationProfiles),
    });
  }

  async saveDisplayProfile(profile: DisplayProfile): Promise<void> {
    const current = await this.load();
    await this.savePair({ displayProfiles: [...current.displayProfiles.filter((entry) => entry.id !== profile.id), profile], calibrationProfiles: current.calibrationProfiles });
  }

  async saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
    const current = await this.load();
    await this.savePair({ displayProfiles: current.displayProfiles, calibrationProfiles: [...current.calibrationProfiles.filter((entry) => entry.id !== profile.id), profile] });
  }
}
