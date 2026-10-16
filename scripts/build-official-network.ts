import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { readOfficialData } from "./official-data";
import { validateNetwork } from "../src/utils/station-validation";
import type { Network } from "../src/data/types";
const { network, corrections } = readOfficialData();
const layout: Network["layout"] = JSON.parse(
  readFileSync("data-sources/schematic-layout.json", "utf8"),
);
for (const s of network.stations) {
  const coords = Object.values(s.codes).map((c) => layout[c]);
  if (coords.some((c) => !c)) throw Error(`Missing layout for ${s.id}`);
  if (coords.some((c) => c.x !== coords[0].x || c.y !== coords[0].y))
    throw Error(`Conflicting interchange layout: ${s.id}`);
  network.layout[s.id] = coords[0];
}
const errors = validateNetwork(network);
if (errors.length) throw Error(errors.join("\n"));
mkdirSync("data-sources/normalized", { recursive: true });
writeFileSync(
  "src/data/official-network.json",
  JSON.stringify(network, null, 2) + "\n",
);
writeFileSync(
  "data-sources/normalized/corrections.json",
  JSON.stringify(corrections, null, 2) + "\n",
);
const perLine = network.lines!.map((l) => ({
  line: l.id,
  operator: l.operatorId,
  codes: network.stations.filter((s) => s.codes[l.id]).length,
  routes: network.routes.filter((r) => r.line === l.id).length,
}));
const report = {
  asOf: network.asOf,
  physicalLocations: network.stations.length,
  uniqueCodes: network.stations.reduce(
    (n, s) => n + Object.keys(s.codes).length,
    0,
  ),
  displayedStations: network.stations.length,
  operationalPhysicalLocations: network.stations.filter((s) => s.operational)
    .length,
  perLine,
  perOperator: network.operators!.map((o) => ({
    operator: o.id,
    physicalLocations: network.stations.filter((s) =>
      s.operatorIds!.includes(o.id),
    ).length,
    lineCodes: network.stations.reduce(
      (count, s) =>
        count +
        Object.keys(s.codes).filter(
          (line) =>
            network.lines!.find((l) => l.id === line)?.operatorId === o.id,
        ).length,
      0,
    ),
  })),
  requestedOperatorReportedTarget: {
    TRTC: 118,
    NTMC: 14,
    total: 132,
    verifiedAsSameCountingBasis: false,
  },
  walkingTransfers: network.transfers.length,
  sourceCorrections: corrections.length,
};
writeFileSync(
  "data-sources/normalized/coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));

const quote = (v: unknown) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
const columns = [
  "id",
  "officialId",
  "nameZh",
  "nameEn",
  "codes",
  "operators",
  "operational",
  "longitude",
  "latitude",
];
const inventory = network.stations.map((s) => [
  s.id,
  s.officialId,
  s.nameZh,
  s.nameEn,
  Object.values(s.codes).join(" / "),
  s.operatorIds!.join(" / "),
  s.operational,
  s.longitude,
  s.latitude,
]);
writeFileSync(
  "data-sources/normalized/station-inventory.csv",
  [columns, ...inventory].map((row) => row.map(quote).join(",")).join("\n") +
    "\n",
);
