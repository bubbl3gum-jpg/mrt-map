export type LineId = "BR" | "R" | "G" | "O" | "BL" | "Y";
export type Station = {
  id: string;
  nameEn: string;
  nameZh: string;
  codes: Partial<Record<LineId, string>>;
  latitude?: number;
  longitude?: number;
};
export type Route = { id: string; line: LineId; stations: string[] };
export type Network = {
  schemaVersion: 1;
  status: "illustrative" | "imported";
  sources: { url: string; retrievedAt: string; description: string }[];
  stations: Station[];
  routes: Route[];
  transfers: { from: string; to: string; kind: "out-of-station" }[];
  layout: Record<string, { x: number; y: number }>;
};
