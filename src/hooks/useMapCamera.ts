import { useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";
import {
  fitCamera,
  zoomCamera,
  type Camera,
  type Point,
} from "../utils/map-camera";
type Pointer = { point: Point; client: Point };
type Gesture = {
  camera: Camera;
  anchor: Point;
  distance: number;
  client: Point;
};
type SafariGesture = Event & {
  scale: number;
  clientX?: number;
  clientY?: number;
};
const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function useMapCamera(
  svg: RefObject<SVGSVGElement | null>,
  center: Point,
) {
  const [camera, setCamera] = useState<Camera>(fitCamera);
  const current = useRef(camera),
    centerRef = useRef(center);
  centerRef.current = center;
  const pointers = useRef(new Map<number, Pointer>()),
    gesture = useRef<Gesture | null>(null),
    suppressClick = useRef(false);
  const safari = useRef<{ camera: Camera; anchor: Point } | null>(null);
  function update(next: Camera) {
    if (![next.zoom, next.pan.x, next.pan.y].every(Number.isFinite)) return;
    current.current = next;
    setCamera(next);
  }
  function point(x: number, y: number): Point {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x, y };
    const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  }
  function rebase() {
    const values = [...pointers.current.values()];
    gesture.current = values.length
      ? {
          camera: current.current,
          anchor:
            values.length > 1
              ? midpoint(values[0].point, values[1].point)
              : values[0].point,
          distance:
            values.length > 1 ? distance(values[0].point, values[1].point) : 0,
          client: values[0].client,
        }
      : null;
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!pointers.current.size) suppressClick.current = false;
    pointers.current.set(e.pointerId, {
      point: point(e.clientX, e.clientY),
      client: { x: e.clientX, y: e.clientY },
    });
    if (pointers.current.size > 1) suppressClick.current = true;
    // Capture on the original target: ordinary taps retain native station clicks.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    rebase();
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, {
      point: point(e.clientX, e.clientY),
      client: { x: e.clientX, y: e.clientY },
    });
    if (safari.current) return;
    const values = [...pointers.current.values()],
      start = gesture.current;
    if (values.length > 1) {
      suppressClick.current = true;
      const mid = midpoint(values[0].point, values[1].point);
      const next = zoomCamera(
        start.camera,
        start.anchor,
        centerRef.current,
        (start.camera.zoom * distance(values[0].point, values[1].point)) /
          Math.max(start.distance, 0.001),
      );
      update({
        ...next,
        pan: {
          x: next.pan.x + mid.x - start.anchor.x,
          y: next.pan.y + mid.y - start.anchor.y,
        },
      });
    } else {
      if (distance(values[0].client, start.client) > 5)
        suppressClick.current = true;
      if (suppressClick.current)
        update({
          ...start.camera,
          pan: {
            x: start.camera.pan.x + values[0].point.x - start.anchor.x,
            y: start.camera.pan.y + values[0].point.y - start.anchor.y,
          },
        });
    }
  }
  function end(e: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    if (e.type === "pointercancel" || e.type === "lostpointercapture")
      suppressClick.current = true;
    pointers.current.delete(e.pointerId);
    rebase();
  }
  function clickCapture(e: ReactMouseEvent<SVGSVGElement>) {
    if (e.detail > 0 && suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (safari.current || pointers.current.size > 1) return;
      const delta =
        e.deltaY *
        (e.deltaMode === 1
          ? 16
          : e.deltaMode === 2
            ? el.getBoundingClientRect().height
            : 1);
      update(
        zoomCamera(
          current.current,
          point(e.clientX, e.clientY),
          centerRef.current,
          current.current.zoom *
            Math.exp(
              -Math.max(-500, Math.min(500, delta)) *
                (e.ctrlKey ? 0.01 : 0.002),
            ),
        ),
      );
    };
    const start = (event: Event) => {
      event.preventDefault();
      const e = event as SafariGesture;
      const rect = el.getBoundingClientRect();
      safari.current = {
        camera: current.current,
        anchor: point(
          e.clientX || rect.x + rect.width / 2,
          e.clientY || rect.y + rect.height / 2,
        ),
      };
      suppressClick.current = true;
    };
    const change = (event: Event) => {
      event.preventDefault();
      const e = event as SafariGesture;
      if (safari.current)
        update(
          zoomCamera(
            safari.current.camera,
            safari.current.anchor,
            centerRef.current,
            safari.current.camera.zoom * e.scale,
          ),
        );
    };
    const finish = (event: Event) => {
      event.preventDefault();
      safari.current = null;
      rebase();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", start, { passive: false });
    el.addEventListener("gesturechange", change, { passive: false });
    el.addEventListener("gestureend", finish, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", start);
      el.removeEventListener("gesturechange", change);
      el.removeEventListener("gestureend", finish);
    };
  }, [svg]);
  return {
    camera,
    zoomBy: (factor: number) =>
      update(
        zoomCamera(
          current.current,
          centerRef.current,
          centerRef.current,
          current.current.zoom * factor,
        ),
      ),
    focusAt: (p: Point) => {
      pointers.current.clear();
      gesture.current = null;
      update({
        zoom: 3.2,
        pan: {
          x: (centerRef.current.x - p.x) * 3.2,
          y: (centerRef.current.y - p.y) * 3.2,
        },
      });
    },
    reset: () => {
      pointers.current.clear();
      gesture.current = null;
      safari.current = null;
      update(fitCamera());
    },
    handlers: {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onClickCapture: clickCapture,
    },
  };
}
