import { describe, it, expect } from "vitest";
import {
  fitCamera,
  zoomCamera,
  MIN_ZOOM,
  MAX_ZOOM,
  type Camera,
  type Point,
} from "../src/utils/map-camera";
const world = (camera: Camera, p: Point, c: Point) => ({
  x: c.x + (p.x - c.x - camera.pan.x) / camera.zoom,
  y: c.y + (p.y - c.y - camera.pan.y) / camera.zoom,
});
describe("map camera geometry", () => {
  it("keeps the world location beneath a wheel or pinch anchor fixed", () => {
    const camera = { zoom: 2, pan: { x: 120, y: -70 } },
      center = { x: 1000, y: 1400 },
      anchor = { x: 1500, y: 1700 };
    const before = world(camera, anchor, center),
      after = world(zoomCamera(camera, anchor, center, 4), anchor, center);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it("preserves the viewport center when buttons zoom a panned map", () => {
    const camera = { zoom: 2, pan: { x: 120, y: -70 } },
      center = { x: 1000, y: 1400 };
    expect(
      world(zoomCamera(camera, center, center, 3), center, center),
    ).toEqual(world(camera, center, center));
  });
  it("clamps both limits and ignores invalid geometry", () => {
    const c = fitCamera(),
      p = { x: 0, y: 0 };
    expect(zoomCamera(c, p, p, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomCamera(c, p, p, 0.001).zoom).toBe(MIN_ZOOM);
    expect(zoomCamera(c, { x: NaN, y: 0 }, p, 2)).toBe(c);
    expect(zoomCamera(c, p, p, NaN)).toBe(c);
    expect(fitCamera()).toEqual({ zoom: 1, pan: { x: 0, y: 0 } });
  });
});
