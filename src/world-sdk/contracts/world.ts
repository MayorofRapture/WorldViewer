import type { Group } from "three";
import type { JsonObject } from "../../shared/contracts/json";
import type { MonotonicMs, Seconds } from "../../shared/contracts/primitives";
import type { ViewerState, ViewportState } from "../../shared/contracts/viewer";

export type WorldSceneRoot = Group;

export interface WorldAssetService {
  resolve(relativePath: string): string;
}

export interface WorldLogger {
  debug(message: string, context?: Readonly<JsonObject>): void;
  info(message: string, context?: Readonly<JsonObject>): void;
  warn(message: string, context?: Readonly<JsonObject>): void;
  error(message: string, context?: Readonly<JsonObject>): void;
}

export interface WorldHostInfo {
  readonly engineApiVersion: string;
  readonly displayProfileId: string;
}

export interface WorldContext {
  readonly worldId: string;
  readonly root: WorldSceneRoot;
  readonly assets: WorldAssetService;
  readonly logger: WorldLogger;
  readonly settings: Readonly<JsonObject>;
  readonly host: Readonly<WorldHostInfo>;
}

export interface WorldFrame {
  readonly frameNumber: number;
  readonly timestampMs: MonotonicMs;
  readonly deltaSeconds: Seconds;
  readonly viewer: Readonly<ViewerState>;
}

export interface VirtualWorld {
  initialize(context: WorldContext): Promise<void> | void;
  update(frame: WorldFrame): void;
  resize?(viewport: Readonly<ViewportState>): void;
  onSettingsChanged?(settings: Readonly<JsonObject>): void;
  dispose(): Promise<void> | void;
}
