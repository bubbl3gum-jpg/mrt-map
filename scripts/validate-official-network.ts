import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { Network } from "../src/data/types";
import { readOfficialData, rawDirectory } from "./official-data";
import {
  compareTopology,
  validateNetwork,
} from "../src/utils/station-validation";
const actual: Network = JSON.parse(
  readFileSync("src/data/official-network.json", "utf8"),
);
const expected = readOfficialData().network;
const errors = [
  ...validateNetwork(actual),
  ...compareTopology(actual, expected),
];
for (const s of actual.stations) {
  const source = expected.stations.find((t) => t.id === s.id);
  if (
    !source ||
    s.nameEn !== source.nameEn ||
    s.nameZh !== source.nameZh ||
    s.officialId !== source.officialId ||
    s.operational !== true ||
    JSON.stringify([...(s.operatorIds ?? [])].sort()) !==
      JSON.stringify([...(source.operatorIds ?? [])].sort())
  )
    errors.push(`Station metadata differs from source: ${s.id}`);
}
const manifest = JSON.parse(
  readFileSync(join(rawDirectory, "manifest.json"), "utf8"),
) as { file: string; sha256: string }[];
for (const file of manifest)
  if (
    createHash("sha256")
      .update(readFileSync(join(rawDirectory, file.file)))
      .digest("hex") !== file.sha256
  )
    errors.push(`Raw snapshot checksum mismatch: ${file.file}`);
const connected = new Set<string>();
const queue = [actual.stations[0].id];
const adj = new Map(actual.stations.map((s) => [s.id, new Set<string>()]));
for (const r of actual.routes)
  r.stations.slice(1).forEach((id, i) => {
    adj.get(id)?.add(r.stations[i]);
    adj.get(r.stations[i])?.add(id);
  });
while (queue.length) {
  const id = queue.pop()!;
  if (connected.has(id)) continue;
  connected.add(id);
  queue.push(...adj.get(id)!);
}
if (connected.size !== actual.stations.length)
  errors.push("Rail graph has unreachable stations");
console.log(
  JSON.stringify(
    {
      asOf: actual.asOf,
      rawSnapshotHashes: "checked",
      reference:
        "retained CSV route sequences, bilingual SID menu, NTMC ordered station table and official diagram walking links",
      physicalLocations: actual.stations.length,
      codes: actual.stations.reduce(
        (c, s) => c + Object.keys(s.codes).length,
        0,
      ),
      routes: actual.routes.length,
      railGraphConnected: connected.size === actual.stations.length,
      errors,
      limitations: [
        "Y route is an ordered operator station-table chain, not a TDX RouteID export",
        "Schematic label placement remains under review",
        "132 operator target uses a different counting basis; see inventory report",
      ],
    },
    null,
    2,
  ),
);
process.exitCode = errors.length ? 1 : 0;
