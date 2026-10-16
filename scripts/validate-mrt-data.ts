import { readFileSync, existsSync } from "node:fs";
import { fixture } from "../src/data/fixture";
import {
  validateNetwork,
  compareTopology,
} from "../src/utils/station-validation";
const path = process.argv[2] ?? "src/data/official-network.json";
if (process.argv[2] && !existsSync(path))
  throw new Error(`Input file does not exist: ${path}`);
const n = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fixture;
const errors = validateNetwork(n);
const refIndex = process.argv.indexOf("--reference");
if (refIndex >= 0) {
  const ref = JSON.parse(readFileSync(process.argv[refIndex + 1], "utf8"));
  errors.push(...validateNetwork(ref), ...compareTopology(n, ref));
}
console.log(
  JSON.stringify(
    {
      status: n.status,
      referenceComparison: refIndex >= 0 ? "executed; see errors" : "not run",
      stations: n.stations.length,
      routes: n.routes.length,
      errors,
      officialTopologyVerified: false,
      note: "Structural checks only. Compare route sequences and branches with official source records.",
    },
    null,
    2,
  ),
);
process.exitCode = errors.length ? 1 : 0;
