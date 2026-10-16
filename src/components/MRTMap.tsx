import { useRef, useState } from "react";
import { Plus, Minus, LocateFixed } from "lucide-react";
import type { Network } from "../data/types";
import { lines } from "../data/lines";
export function MRTMap({
  network: n,
  available,
  choice,
  borrower,
  onSelect,
  focus,
}: {
  network: Network;
  available: string[];
  choice: string | null;
  borrower: boolean;
  onSelect: (id: string) => void;
  focus: string | null;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const ps = Object.values(n.layout);
  const minX = Math.min(...ps.map((p) => p.x)) - 110,
    minY = Math.min(...ps.map((p) => p.y)) - 65;
  const width = Math.max(...ps.map((p) => p.x)) - minX + 150,
    height = Math.max(...ps.map((p) => p.y)) - minY + 75;
  return (
    <div className="map-stage">
      <svg
        aria-label="Interactive MRT station network"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        onPointerDown={(e) => {
          if (
            e.target === e.currentTarget ||
            (e.target as Element).classList.contains("pan-surface")
          ) {
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const ratio = width / e.currentTarget.getBoundingClientRect().width;
            setPan({
              x: drag.current.px + (e.clientX - drag.current.x) * ratio,
              y: drag.current.py + (e.clientY - drag.current.y) * ratio,
            });
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
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
          transform={`translate(${pan.x} ${pan.y}) translate(${minX + width / 2} ${minY + height / 2}) scale(${zoom}) translate(${-minX - width / 2} ${-minY - height / 2})`}
        >
          <path
            d="M 245 45 C 270 200 140 230 245 355 S 250 560 285 690"
            fill="none"
            stroke="#e2edf2"
            strokeWidth="28"
          />
          <text
            x="185"
            y="345"
            fill="#a1b9c8"
            fontSize="11"
            transform="rotate(-74 185 345)"
          >
            TAMSUI RIVER 淡水河
          </text>
          {n.routes.map((r) => (
            <polyline
              key={r.id}
              points={r.stations
                .map((id) => `${n.layout[id].x},${n.layout[id].y}`)
                .join(" ")}
              fill="none"
              stroke={lines.find((l) => l.id === r.line)?.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={borrower ? 0.45 : 1}
            />
          ))}
          {n.transfers.map((t) => (
            <line
              key={t.from + t.to}
              x1={n.layout[t.from].x}
              y1={n.layout[t.from].y}
              x2={n.layout[t.to].x}
              y2={n.layout[t.to].y}
              stroke="#8f9ba7"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          ))}
          {n.stations.map((s) => {
            const p = n.layout[s.id],
              selected = available.includes(s.id),
              disabled = borrower && !selected,
              active = borrower ? choice === s.id : selected;
            return (
              <g
                key={s.id}
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
                className={`station ${disabled ? "disabled" : ""}`}
              >
                <rect
                  x={p.x - 12}
                  y={p.y - 38}
                  width="125"
                  height="52"
                  fill="transparent"
                />
                {(active || focus === s.id) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="17"
                    fill={active ? "#d8eee9" : "#e2e8fe"}
                    stroke={active ? "#237c68" : "#7379bd"}
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={Object.keys(s.codes).length > 1 ? 8 : 5.5}
                  fill={active ? "#23816b" : "white"}
                  stroke={disabled ? "#b8c0c9" : "#344752"}
                  strokeWidth="2"
                />
                {active && (
                  <path
                    d={`M${p.x - 3} ${p.y} l2 2 l4 -4`}
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                )}
                <text x={p.x + 12} y={p.y - 29} className="station-zh">
                  {s.nameZh}
                </text>
                <text x={p.x + 12} y={p.y - 16} className="station-en">
                  {s.nameEn}
                </text>
                <text x={p.x + 12} y={p.y - 5} className="station-code">
                  {Object.values(s.codes).join(" · ")}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-tools">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
        >
          <Plus size={17} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
        >
          <Minus size={17} />
        </button>
        <i />
        <button
          aria-label="Reset map view"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className="map-caption">
        <span className="dot" /> Schematic preview{" "}
        <span>Drag to pan · Use + / − to zoom</span>
      </div>
    </div>
  );
}
