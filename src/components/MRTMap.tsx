import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, LocateFixed } from "lucide-react";
import type { Network } from "../data/types";
import { placeMapLabels } from "../utils/map-labels";
import { lines as fallbackLines } from "../data/lines";
import { useMapCamera } from "../hooks/useMapCamera";
import { MIN_ZOOM, MAX_ZOOM } from "../utils/map-camera";
export function MRTMap({
  network: n,
  available,
  choice,
  borrower,
  onSelect,
  focus,
  visibleSystemIds,
  focusRevision = 0,
  onResetView,
}: {
  network: Network;
  available: string[];
  choice: string | null;
  borrower: boolean;
  onSelect: (id: string) => void;
  focus: string | null;
  visibleSystemIds?: string[];
  focusRevision?: number;
  onResetView?: () => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 800, height: 620 });
  const container = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null);
  const lines = n.lines ?? fallbackLines;
  const visible = n.stations.filter(
    (s) =>
      !visibleSystemIds ||
      !s.systemIds ||
      s.systemIds.some((id) => visibleSystemIds.includes(id)),
  );
  const ids = new Set(visible.map((s) => s.id));
  const ps = Object.values(n.layout);
  const minX = Math.min(...ps.map((p) => p.x)) - 180,
    minY = Math.min(...ps.map((p) => p.y)) - 180;
  const width = Math.max(...ps.map((p) => p.x)) - minX + 240,
    height = Math.max(...ps.map((p) => p.y)) - minY + 180,
    cx = minX + width / 2,
    cy = minY + height / 2;
  const {
    camera: { zoom, pan },
    zoomBy,
    focusAt,
    reset,
    handlers,
  } = useMapCamera(svg, { x: cx, y: cy });
  const scale = Math.min(size.width / width, size.height / height) * zoom;
  const terminalIds = useMemo(
    () => new Set(n.routes.flatMap((r) => [r.stations[0], r.stations.at(-1)!])),
    [n],
  );
  // Render each undirected track edge once; reverse directions/short workings stay in data.
  const edges = useMemo(() => {
    const seen = new Set<string>();
    return n.routes.flatMap((r) =>
      r.stations.slice(1).flatMap((id, i) => {
        const from = r.stations[i];
        const key = r.line + ":" + [from, id].sort().join(":");
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ key, line: r.line, from, to: id }];
      }),
    );
  }, [n]);
  useEffect(() => {
    if (!container.current) return;
    const update = () => {
      const r = container.current!.getBoundingClientRect();
      if (r.width > 0 && r.height > 0)
        setSize({ width: r.width, height: r.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (focus && n.layout[focus]) {
      const p = n.layout[focus];
      focusAt(p);
    }
  }, [focus, focusRevision, n, cx, cy]);
  return (
    <div className="map-stage full-network" ref={container}>
      <svg
        ref={svg}
        aria-label="Interactive MRT station network"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        {...handlers}
      >
        <rect
          className="pan-surface"
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="transparent"
        />
        <g
          data-testid="map-transform"
          transform={`translate(${pan.x} ${pan.y}) translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}
        >
          {edges
            .filter((e) => ids.has(e.from) && ids.has(e.to))
            .map((e) => (
              <line
                key={e.key}
                data-line={e.line}
                x1={n.layout[e.from].x}
                y1={n.layout[e.from].y}
                x2={n.layout[e.to].x}
                y2={n.layout[e.to].y}
                stroke={lines.find((l) => l.id === e.line)?.color ?? "#7f8c8d"}
                strokeWidth="3.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                opacity={borrower ? 0.45 : 1}
              />
            ))}
          {n.transfers
            .filter((t) => ids.has(t.from) && ids.has(t.to))
            .map((t) => (
              <line
                key={t.from + t.to}
                x1={n.layout[t.from].x}
                y1={n.layout[t.from].y}
                x2={n.layout[t.to].x}
                y2={n.layout[t.to].y}
                stroke="#7c8d85"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="3 3"
              >
                <title>
                  Out-of-station walking transfer — separate handoff locations
                </title>
              </line>
            ))}
          {visible.map((s) => {
            const p = n.layout[s.id],
              selected = available.includes(s.id),
              disabled = borrower && !selected,
              active = borrower ? choice === s.id : selected;
            return (
              <g
                key={s.id}
                data-station-id={s.id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`${s.nameEn} ${s.nameZh} ${Object.values(s.codes).join(" ")}${selected ? " available" : ""}`}
                aria-disabled={disabled}
                aria-pressed={active}
                onClick={() => !disabled && onSelect(s.id)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
                onPointerEnter={() => setHover(s.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(s.id)}
                onBlur={() => setHover(null)}
                className={`station ${disabled ? "disabled" : ""}`}
              >
                <title>
                  {s.nameZh} · {s.nameEn} · {Object.values(s.codes).join(" / ")}
                  {disabled ? " — unavailable" : ""}
                </title>
                {(active || focus === s.id) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={9 / scale}
                    fill={active ? "#d8eee9" : "#e2e8fe"}
                    stroke={active ? "#237c68" : "#7379bd"}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                <circle
                  className="station-hit"
                  cx={p.x}
                  cy={p.y}
                  r={6.5 / scale}
                  fill="transparent"
                />
                <circle
                  className="station-dot"
                  cx={p.x}
                  cy={p.y}
                  r={(Object.keys(s.codes).length > 1 ? 4.8 : 3.3) / scale}
                  fill={active ? "#23816b" : "white"}
                  stroke={disabled ? "#9ba7a1" : "#344752"}
                  strokeWidth={Object.keys(s.codes).length > 1 ? "1.7" : "1.2"}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {active && (
                  <path
                    d={`M${p.x - 2.5 / scale} ${p.y} l${2 / scale} ${2 / scale} l${3.5 / scale} ${-4 / scale}`}
                    fill="none"
                    stroke="white"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
          {/* Labels are a separate, non-intercepting layer, so no text blocks another station. */}
          {placeMapLabels(
            visible,
            n.layout,
            scale,
            zoom,
            terminalIds,
            new Set(
              borrower
                ? choice
                  ? [choice]
                  : []
                : available.length <= 5
                  ? available
                  : [],
            ),
            hover ?? focus,
            {
              left: cx * scale - size.width / 2 - pan.x * (scale / zoom) + 8,
              right: cx * scale + size.width / 2 - pan.x * (scale / zoom) - 8,
              top: cy * scale - size.height / 2 - pan.y * (scale / zoom) + 8,
              bottom: cy * scale + size.height / 2 - pan.y * (scale / zoom) - 8,
            },
          ).map(({ station: s, x, y, anchor, detail }) => (
            <g
              className="map-label"
              pointerEvents="none"
              key={s.id}
              textAnchor={anchor}
              style={{ fontSize: 11 / scale, strokeWidth: 3 / scale }}
            >
              <text x={x} y={y}>
                {s.nameZh}
              </text>
              {detail && (
                <>
                  <text
                    className="map-label-en"
                    x={x}
                    y={y + 13 / scale}
                    style={{ fontSize: 9 / scale }}
                  >
                    {s.nameEn}
                  </text>
                  <text
                    className="map-label-code"
                    x={x}
                    y={y + 24 / scale}
                    style={{ fontSize: 8 / scale }}
                  >
                    {Object.values(s.codes).join(" · ")}
                  </text>
                </>
              )}
            </g>
          ))}
        </g>
      </svg>
      <div className="map-guidance">
        {zoom < 3
          ? "Full network overview · Search or zoom in for station labels"
          : "Station detail · Drag the background to explore"}
      </div>
      <div className="map-tools">
        <button
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM - 0.0001}
          onClick={() => zoomBy(1.3)}
        >
          <Plus size={17} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM + 0.0001}
          onClick={() => zoomBy(1 / 1.3)}
        >
          <Minus size={17} />
        </button>
        <i />
        <button
          aria-label="Reset map view"
          onClick={() => {
            setHover(null);
            onResetView?.();
            reset();
          }}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className="map-caption">
        <span className="dot" /> Original schematic · Layout under review{" "}
        <span>Drag to pan · Scroll or pinch to zoom</span>
      </div>
    </div>
  );
}
