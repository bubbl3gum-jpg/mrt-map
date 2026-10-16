export type Point = { x: number; y: number };
export type Camera = { zoom: number; pan: Point };
export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 8;
export const fitCamera = (): Camera => ({ zoom: 1, pan: { x: 0, y: 0 } });
export function zoomCamera(
  camera: Camera,
  anchor: Point,
  center: Point,
  requested: number,
): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requested));
  if (
    !Number.isFinite(zoom) ||
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y)
  )
    return camera;
  const ratio = zoom / camera.zoom;
  return {
    zoom,
    pan: {
      x: anchor.x - center.x - (anchor.x - center.x - camera.pan.x) * ratio,
      y: anchor.y - center.y - (anchor.y - center.y - camera.pan.y) * ratio,
    },
  };
}
