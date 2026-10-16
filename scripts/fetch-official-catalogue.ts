import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const url = "https://web.metro.taipei/pages2026/js/stations-data.js";
const raw = execFileSync(
  "curl",
  ["--fail", "--silent", "--show-error", "--location", "--max-time", "30", url],
  { encoding: "utf8" },
);
// Parse string records, never evaluate downloaded JavaScript.
const records = [
  ...raw.matchAll(/'((?:BR|BL|R|G|O|Y)\d{2}[A-Z]?) ([^']+)'/g),
].map((m) => ({ code: m[1], nameZh: m[2] }));
if (
  records.length < 100 ||
  new Set(records.map((r) => r.code)).size !== records.length
)
  throw Error("Unexpected official catalogue schema; refusing overwrite");
mkdirSync("data-sources", { recursive: true });
writeFileSync(
  "data-sources/official-station-catalogue.json",
  JSON.stringify(
    {
      source: url,
      retrievedAt: new Date().toISOString(),
      scope:
        "Search catalogue only; not evidence of operating status, station sequence, English names, coordinates or physical grouping",
      records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Saved ${records.length} official line-code/Chinese-name catalogue records. This does not replace network data.`,
);
