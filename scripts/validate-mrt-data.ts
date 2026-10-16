import { readFileSync, existsSync } from "node:fs";
import { fixture } from "../src/data/fixture";
import {
  validateNetwork,
  compareTopology,
} from "../src/utils/station-validation";
import { readOfficialData } from "./official-data";
const path = process.argv[2] ?? "src/data/official-network.json";
if (process.argv[2] && !existsSync(path))
  throw Error(`Input file does not exist: ${path}`);
const n = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fixture;
const errors = validateNetwork(n);
const refIndex = process.argv.indexOf("--reference");
let referenceComparison = "not run";
if (refIndex >= 0) {
  const ref = JSON.parse(readFileSync(process.argv[refIndex + 1], "utf8"));
  errors.push(...validateNetwork(ref), ...compareTopology(n, ref));
  referenceComparison = "explicit normalized reference";
} else if (n.validation?.topology === "source-compared") {
  errors.push(...compareTopology(n, readOfficialData().network));
  referenceComparison = "pinned raw CSV/menu/operator table";
}
console.log(
  JSON.stringify(
    {
      status: n.status,
      referenceComparison,
      stations: n.stations.length,
      routes: n.routes.length,
      errors,
      sourceTopologyComparisonPassed:
        referenceComparison !== "not run" && !errors.length,
      layoutVerified: false,
      note: "Source comparison is specific to the dated snapshots; layout remains an original schematic.",
    },
    null,
    2,
  ),
);
process.exitCode = errors.length ? 1 : 0;
