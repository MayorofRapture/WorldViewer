import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

export class RendererFoundation {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  private readonly host: HTMLElement;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly windowResizeHandler: (() => void) | null;
  private disposed = false;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(45, 1, 0.1, 10_000);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.host.appendChild(this.renderer.domElement);

    this.resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(this.host);

    this.windowResizeHandler = this.resizeObserver === null
      ? () => this.resize()
      : null;
    if (this.windowResizeHandler) {
      window.addEventListener("resize", this.windowResizeHandler);
    }

    this.resize();
  }

  resize(): void {
    if (this.disposed) return;

    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.resizeObserver?.disconnect();
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
