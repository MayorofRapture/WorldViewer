import type {
  JsonObject,
  ViewportState,
  WorldContext,
  WorldFrame,
  VirtualWorld,
} from "../../../src/world-sdk/index";
import { createDiagnosticScene, type DiagnosticScene } from "./scene";

const DEFAULT_SETTINGS: JsonObject = Object.freeze({ showGrid: true, gridSpacingMm: 50, accent: "cyan" });
const COLORS: Record<string, number> = { cyan: 0x00d9ff, amber: 0xffb000, magenta: 0xff35d0 };

function readSettings(settings: Readonly<JsonObject>): { showGrid: boolean; gridSpacingMm: number; accent: string } {
  const showGrid = typeof settings.showGrid === "boolean" ? settings.showGrid : true;
  const gridSpacingMm = typeof settings.gridSpacingMm === "number" && Number.isFinite(settings.gridSpacingMm) && settings.gridSpacingMm > 0
    ? settings.gridSpacingMm
    : 50;
  const accent = typeof settings.accent === "string" && COLORS[settings.accent] ? settings.accent : "cyan";
  return { showGrid, gridSpacingMm, accent };
}

export class DiagnosticWorld implements VirtualWorld {
  private context: WorldContext | null = null;
  private scene: DiagnosticScene | null = null;
  private settings: JsonObject = DEFAULT_SETTINGS;

  initialize(context: WorldContext): void {
    this.context = context;
    this.settings = context.settings;
    const resolvedMarker = context.assets.resolve("assets/marker.txt");
    context.logger.info("Diagnostic room initialized", { asset: resolvedMarker });
    this.rebuildScene();
  }

  update(frame: WorldFrame): void {
    if (!this.scene) return;
    void frame.viewer;
  }

  resize(_viewport: Readonly<ViewportState>): void {
    // The diagnostic geometry is millimeter-scaled and does not need viewport state.
  }

  onSettingsChanged(settings: Readonly<JsonObject>): void {
    this.settings = settings;
    this.rebuildScene();
  }

  dispose(): void {
    this.scene?.dispose();
    this.scene = null;
    this.context?.root.clear();
    this.context = null;
  }

  private rebuildScene(): void {
    if (!this.context) return;
    this.scene?.dispose();
    const parsed = readSettings(this.settings);
    this.scene = createDiagnosticScene(parsed.showGrid, parsed.gridSpacingMm, COLORS[parsed.accent] ?? 0x00d9ff);
    this.context.root.add(this.scene.root);
  }
}
