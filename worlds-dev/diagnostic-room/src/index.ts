import type { VirtualWorld } from "../../../src/world-sdk/index";
import { DiagnosticWorld } from "./DiagnosticWorld";

export function createDiagnosticWorld(): VirtualWorld {
  return new DiagnosticWorld();
}
