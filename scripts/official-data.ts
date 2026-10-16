import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { JSDOM } from "jsdom";
import type { Network, Station, Route } from "../src/data/types";
import { lines } from "../src/data/lines";
export const rawDirectory = "data-sources/raw/2026-10-16";
type MenuStation = {
  StationLabel: string;
  StationName: string;
  SID: string;
  StationLabelForRoadmap: string;
};
type MenuLine = { LineField: string; LineStations: MenuStation[] };
const unquote = (s: string) => s.replace(/^'|'$/g, "");
export function csvRows(file: string): Record<string, string>[] {
  return parse(readFileSync(file, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
}
export function readOfficialData(directory = rawDirectory) {
  const read = (file: string) => readFileSync(resolve(directory, file), "utf8");
  const manifest = JSON.parse(read("manifest.json")) as {
    file: string;
    sha256: string;
  }[];
  for (const f of manifest)
    if (
      createHash("sha256")
        .update(readFileSync(resolve(directory, f.file)))
        .digest("hex") !== f.sha256
    )
      throw Error(`Raw snapshot checksum mismatch: ${f.file}`);
  const en: MenuLine[] = JSON.parse(read("official-menu-en.json")),
    zh: MenuLine[] = JSON.parse(read("official-menu-zh.json"));
  const english = new Map(
    en.flatMap((l) => l.LineStations.map((s) => [s.StationLabel, s] as const)),
  );
  const chinese = new Map(
    zh.flatMap((l) => l.LineStations.map((s) => [s.StationLabel, s] as const)),
  );
  const identities: Record<string, string> = JSON.parse(
    readFileSync("data-sources/physical-identities.json", "utf8"),
  );
  const stations: Station[] = [];
  const byCode = new Map<string, Station>();
  const bySID = new Map<string, Station>();
  for (const line of en) {
    for (const e of line.LineStations) {
      const z = chinese.get(e.StationLabel);
      if (!z || z.SID !== e.SID)
        throw Error(`Bilingual identity mismatch: ${e.StationLabel}`);
      if (!identities[e.SID])
        throw Error(`Unreviewed station identity SID ${e.SID}`);
      let s = bySID.get(e.SID);
      if (!s) {
        s = {
          id: identities[e.SID],
          officialId: `metro-taipei:SID:${e.SID}`,
          nameEn: e.StationName,
          nameZh: z.StationName,
          codes: {},
          operatorIds: [],
          systemIds: ["taipei-mrt"],
          operational: true,
          sourceRefs: ["official-menu-en.json", "official-menu-zh.json"],
        };
        stations.push(s);
        bySID.set(e.SID, s);
      }
      if (s.nameZh !== z.StationName)
        throw Error(`Conflicting shared SID name: ${e.SID}`);
      if (byCode.has(e.StationLabel))
        throw Error(`Duplicate menu code ${e.StationLabel}`);
      s.codes[line.LineField] = e.StationLabel;
      byCode.set(e.StationLabel, s);
      const operator = line.LineField === "Y" ? "NTMC" : "TRTC";
      if (!s.operatorIds!.includes(operator)) s.operatorIds!.push(operator);
    }
  }
  const corrections: {
    field: string;
    raw: string;
    normalized: string;
    reason: string;
  }[] = [];
  for (const r of csvRows(resolve(directory, "stations.csv"))) {
    const rawCodes = unquote(r.StationID).split(",");
    const codes = rawCodes.map((c) => (c === "G01A" ? "G03A" : c));
    if (rawCodes.includes("G01A"))
      corrections.push({
        field: "StationID",
        raw: "G01A",
        normalized: "G03A",
        reason:
          "Both route CSV and official station menu identify Xiaobitan as G03A",
      });
    const group = new Set(codes.map((c) => byCode.get(c)));
    if (group.size !== 1 || group.has(undefined))
      throw Error(`CSV identity disagrees with menu: ${r.StationID}`);
    const s = byCode.get(codes[0])!;
    const names = unquote(r.StationName).slice(1, -1).split(",");
    if (names[0] !== s.nameZh)
      throw Error(`CSV Chinese name mismatch: ${r.StationID}`);
    if (names.slice(1).join(",") !== s.nameEn)
      corrections.push({
        field: "StationName.en",
        raw: names.slice(1).join(","),
        normalized: s.nameEn,
        reason: `Official bilingual menu spelling for ${codes.join("/")}`,
      });
    const [lon, lat] = unquote(r.StationPosition)
      .slice(1, -1)
      .split(",")
      .map(Number);
    if (!Number.isFinite(lon) || !Number.isFinite(lat))
      throw Error("Invalid source coordinates");
    s.longitude = lon;
    s.latitude = lat;
    s.sourceRefs!.push(`stations.csv#${r.SEQNO}`);
  }
  const routeRows = csvRows(resolve(directory, "route-stations.csv"));
  const routes: Route[] = routeRows.map((r) => {
    const entries = [...r.Stations.matchAll(/'(\d+),([A-Z0-9]+),([^']+)'/g)];
    if (!entries.length) throw Error("Unsupported route Stations encoding");
    entries.forEach((m, i) => {
      if (Number(m[1]) !== i + 1 || !byCode.has(m[2]))
        throw Error(`Invalid official route sequence ${r.RouteID}`);
    });
    return {
      id: `TRTC:${unquote(r.RouteID)}:${r.Direction}`,
      sourceRouteId: unquote(r.RouteID),
      line: unquote(r.LineID),
      direction: Number(r.Direction),
      operatorId: "TRTC",
      sourceRef: `route-stations.csv#${r.SEQNO}`,
      stations: entries.map((m) => byCode.get(m[2])!.id),
    };
  });
  // Membership is independently checked against the separate line-station CSV.
  const lineRecords = csvRows(resolve(directory, "line-stations.csv"));
  const membership = new Set<string>();
  for (const row of lineRecords) {
    const entries = [
      ...row.Stations.matchAll(/\{(\d+),'([A-Z0-9]+)','([^']+)',\}/g),
    ];
    if (!entries.length) throw Error("Unsupported line Stations encoding");
    entries.forEach((m, i) => {
      if (Number(m[1]) !== Number(entries[0][1]) + i || !byCode.has(m[2]))
        throw Error("Invalid line station record");
      membership.add(m[2]);
    });
  }
  const trtcCodes = [...byCode.keys()].filter((c) => !c.startsWith("Y"));
  if (
    trtcCodes.some((c) => !membership.has(c)) ||
    membership.size !== trtcCodes.length
  )
    throw Error("Station/line membership coverage mismatch");
  // New Taipei Metro publishes a north/south station table in Y07→Y20 order.
  const document = new JSDOM(read("circular-page.html")).window.document;
  const circular = [...document.querySelectorAll("tr")].flatMap((tr) => {
    const cells = [...tr.querySelectorAll("td")].map((td) =>
      td.textContent!.trim().replace(/\uFEFF/g, ""),
    );
    const index = cells.findIndex((c) => /^Y\d{2}$/.test(c));
    return index >= 0 ? [{ code: cells[index], name: cells[index - 1] }] : [];
  });
  if (
    circular.length !== 14 ||
    new Set(circular.map((c) => c.code)).size !== 14
  )
    throw Error("Unexpected Circular station table");
  for (const c of circular) {
    const s = byCode.get(c.code);
    if (!s || s.nameZh !== c.name)
      throw Error(`Circular operator/menu mismatch ${c.code}`);
    s.sourceRefs!.push("circular-page.html");
  }
  routes.push({
    id: "NTMC:Y:table",
    line: "Y",
    direction: 0,
    operatorId: "NTMC",
    sourceRef: "circular-page.html; official-map.webp",
    stations: circular.map((c) => byCode.get(c.code)!.id),
  });
  for (const r of routes.filter(
    (r) => r.operatorId === "TRTC" && r.direction === 0,
  )) {
    const reverse = routes.find(
      (t) => t.sourceRouteId === r.sourceRouteId && t.direction === 1,
    );
    if (
      !reverse ||
      reverse.stations.join() !== [...r.stations].reverse().join()
    )
      throw Error(`Direction pair mismatch ${r.id}`);
  }
  const transfers = [
    ["BL07", "Y16"],
    ["BL08", "Y17"],
  ].map(([a, b]) => ({
    from: byCode.get(a)!.id,
    to: byCode.get(b)!.id,
    kind: "out-of-station" as const,
    sourceRef: "official-map.webp: dotted out-of-station transfer symbols",
  }));
  for (const s of stations)
    for (const line of Object.keys(s.codes))
      if (!routes.some((r) => r.line === line && r.stations.includes(s.id)))
        throw Error(
          `Menu station code lacks operating-route evidence: ${s.codes[line]}`,
        );
  const downloads = JSON.parse(read("downloads.json")) as {
    url: string;
    catalogue: string;
    file: string;
  }[];
  const n: Network = {
    schemaVersion: 1,
    status: "imported",
    asOf: "2026-10-16",
    stations,
    routes,
    transfers,
    layout: {},
    lines: lines.map((l) => ({
      ...l,
      operatorId: l.id === "Y" ? "NTMC" : "TRTC",
      systemId: "taipei-mrt",
      codePattern: `^${l.id}[0-9]{2}[A-Z]?$`,
    })),
    operators: [
      { id: "TRTC", name: "Taipei Rapid Transit Corporation" },
      { id: "NTMC", name: "New Taipei Metro Corporation" },
    ],
    systems: [{ id: "taipei-mrt", name: "Taipei MRT", kind: "metro" }],
    sources: [
      ...downloads.map((d) => ({
        url: d.url,
        retrievedAt: "2026-10-16",
        description: d.catalogue,
      })),
      {
        url: "https://web.metro.taipei/apis/metrostationapi/menuline",
        retrievedAt: "2026-10-16",
        description:
          "POST {LineID:0,Lang:en/tw}; bilingual names and physical SID groupings",
      },
      {
        url: "https://www.ntmetro.com.tw/basic/?node=10138",
        retrievedAt: "2026-10-16",
        description: "Circular Line station table, Y07–Y20",
      },
      {
        url: "https://web.metro.taipei/pages2026/WebRouteMap",
        retrievedAt: "2026-10-16",
        description:
          "Current official diagram; interchanges, walking transfers and branch comparison",
      },
    ],
    validation: {
      topology: "source-compared",
      layout: "schematic",
      report: "SOURCE_REPORT.md",
    },
  };
  return { network: n, corrections, byCode };
}
