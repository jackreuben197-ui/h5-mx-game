/** Optional skeletal effects mount here; the DOM table never depends on a renderer. */
export interface CanvasRenderer {
  resize(width: number, height: number, dpr: number): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}
export function createCanvasSurface(
  layer: HTMLElement,
  create: (canvas: HTMLCanvasElement) => CanvasRenderer,
  maxDpr = 2,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  layer.append(canvas);
  let renderer: CanvasRenderer;
  try {
    renderer = create(canvas);
  } catch (error) {
    canvas.remove();
    throw error;
  }
  const resize = () => {
    const { width, height } = layer.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    renderer.resize(width, height, dpr);
  };
  const visibility = () => renderer.setPaused(document.hidden);
  const observer = new ResizeObserver(resize);
  observer.observe(layer);
  document.addEventListener('visibilitychange', visibility);
  resize();
  visibility();
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    renderer.destroy();
    canvas.remove();
  };
}
