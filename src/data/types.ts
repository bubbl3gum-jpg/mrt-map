/** Line/operator/system identifiers are open strings; no six-line assumption in rendering. */
export type LineId = string;
export type LineDefinition = {
  id: string;
  name: string;
  zh: string;
  color: string;
  operatorId?: string;
  systemId?: string;
  codePattern?: string;
};
export type Station = {
  id: string;
  nameEn: string;
  nameZh: string;
  codes: Record<LineId, string>;
  latitude?: number;
  longitude?: number;
  operatorIds?: string[];
  systemIds?: string[];
  officialId?: string;
  operational?: boolean;
  sourceRefs?: string[];
};
export type Route = {
  id: string;
  line: LineId;
  stations: string[];
  direction?: number;
  operatorId?: string;
  sourceRef?: string;
  sourceRouteId?: string;
};
export type Network = {
  schemaVersion: 1;
  status: "illustrative" | "imported";
  asOf?: string;
  sources: { url: string; retrievedAt: string; description: string }[];
  lines?: LineDefinition[];
  operators?: { id: string; name: string }[];
  systems?: { id: string; name: string; kind: "metro" | "light-rail" }[];
  stations: Station[];
  routes: Route[];
  transfers: {
    from: string;
    to: string;
    kind: "out-of-station";
    sourceRef?: string;
  }[];
  layout: Record<
    string,
    { x: number; y: number; labelSide?: "left" | "right" }
  >;
  validation?: {
    topology: "source-compared" | "unverified";
    layout: "schematic";
    report: string;
  };
};
