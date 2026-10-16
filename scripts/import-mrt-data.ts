import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { validateNetwork } from "../src/utils/station-validation";
const file = process.argv[2];
if (!file)
  throw new Error(
    "Usage: npm run import:data -- <normalized-official-network.json>. See DATA_IMPORT.md for raw CSV/JSON mapping.",
  );
const n = JSON.parse(readFileSync(file, "utf8"));
if (n.status !== "imported")
  throw new Error(
    "Official import must have status: imported and dated source metadata",
  );
const errors = validateNetwork(n);
if (errors.length) throw new Error(errors.join("\n"));
const target = "src/data/official-network.json";
if (existsSync(target) && !process.argv.includes("--replace"))
  throw new Error("Import exists; pass --replace to replace explicitly.");
mkdirSync("src/data", { recursive: true });
writeFileSync(target, JSON.stringify(n, null, 2) + "\n");
console.log(
  `Imported ${n.stations.length} stations. Structural validation passed; official sequence review is still required.`,
);
