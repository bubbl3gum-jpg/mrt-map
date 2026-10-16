import type { Station, Network } from "../data/types";
export type MapLabel = {
  station: Station;
  x: number;
  y: number;
  anchor: "start" | "end";
  detail: boolean;
};
/** Screen-space collision culling; labels never change station hit targets or topology. */
export function placeMapLabels(
  stations: Station[],
  layout: Network["layout"],
  scale: number,
  zoom: number,
  terminalIds: Set<string>,
  highlight: Set<string>,
  priority: string | null,
  bounds?: { left: number; right: number; top: number; bottom: number },
): MapLabel[] {
  const boxes: { x: number; y: number; width: number; height: number }[] = [];
  const labels: MapLabel[] = [];
  const candidates = stations
    .filter(
      (s) =>
        zoom >= 3 ||
        s.id === priority ||
        highlight.has(s.id) ||
        terminalIds.has(s.id),
    )
    .sort(
      (a, b) =>
        Number(b.id === priority) - Number(a.id === priority) ||
        Number(highlight.has(b.id)) - Number(highlight.has(a.id)) ||
        Number(terminalIds.has(b.id)) - Number(terminalIds.has(a.id)),
    );
  for (const station of candidates) {
    const p = layout[station.id],
      detail = zoom >= 3 || station.id === priority;
    const width =
        Math.max(
          station.nameZh.length * 11,
          detail ? station.nameEn.length * 5.4 : 0,
          detail ? Object.values(station.codes).join(" · ").length * 4.8 : 0,
        ) + 6,
      height = detail ? 40 : 16;
    const sides = p.labelSide === "left" ? [-1, 1] : [1, -1];
    const placements = sides.flatMap((side) =>
      [-1, 1].map((vertical) => {
        const x = p.x * scale + (side === 1 ? 10 : -width - 10),
          y = p.y * scale + (vertical === -1 ? -height - 7 : 8);
        return { x, y, width, height, side };
      }),
    );
    const inBounds = (b: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) =>
      !bounds ||
      (b.x >= bounds.left &&
        b.x + b.width <= bounds.right &&
        b.y >= bounds.top &&
        b.y + b.height <= bounds.bottom);
    const box =
      placements.find(
        (b) =>
          inBounds(b) &&
          !boxes.some(
            (a) =>
              b.x < a.x + a.width + 3 &&
              b.x + b.width + 3 > a.x &&
              b.y < a.y + a.height + 3 &&
              b.y + b.height + 3 > a.y,
          ),
      ) ?? (station.id === priority ? placements.find(inBounds) : undefined);
    if (!box) continue;
    boxes.push(box);
    labels.push({
      station,
      x: (box.side === 1 ? box.x : box.x + box.width) / scale,
      y: (box.y + 11) / scale,
      anchor: box.side === 1 ? "start" : "end",
      detail,
    });
  }
  return labels;
}
