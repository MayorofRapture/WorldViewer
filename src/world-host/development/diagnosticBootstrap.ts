import { Group, Scene } from "three";
import type {
  JsonObject,
  WorldAssetService,
  WorldContext,
  WorldFrame,
  WorldHostInfo,
  WorldLogger,
} from "../../world-sdk/index";
import { createDiagnosticWorld } from "../../../worlds-dev/diagnostic-room/src/index";

export interface DiagnosticWorldHost {
  readonly root: Group;
  readonly context: WorldContext;
  readonly initialize: () => Promise<void>;
  readonly update: (frame: WorldFrame) => void;
  readonly dispose: () => Promise<void>;
}

export function createDiagnosticWorldHost(scene: Scene, settings: Readonly<JsonObject> = {
  showGrid: true,
  gridSpacingMm: 50,
  accent: "cyan",
}): DiagnosticWorldHost {
  const root = new Group();
  scene.add(root);
  const world = createDiagnosticWorld();
  const logger: WorldLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
  const assets: WorldAssetService = { resolve: (relativePath) => `diagnostic-room://${relativePath}` };
  const host: WorldHostInfo = { engineApiVersion: "1.0.0", displayProfileId: "m0b.synthetic" };
  const context: WorldContext = { worldId: "local.worldviewer.diagnostic-room", root, assets, logger, settings, host };
  let initialized = false;

  return {
    root,
    context,
    initialize: async () => {
      await world.initialize(context);
      initialized = true;
    },
    update: (frame) => {
      if (!initialized) throw new Error("diagnostic world is not initialized");
      world.update(frame);
    },
    dispose: async () => {
      if (initialized) await world.dispose();
      initialized = false;
      scene.remove(root);
    },
  };
}
