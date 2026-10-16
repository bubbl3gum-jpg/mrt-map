import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
const directory =
  process.argv[2] ??
  `data-sources/raw/${new Date().toISOString().slice(0, 10)}`;
if (existsSync(directory))
  throw Error(
    "Snapshot directory already exists. Choose a NEW directory; raw evidence is immutable.",
  );
mkdirSync(directory, { recursive: true });
const entries: {
  file: string;
  url: string;
  retrievedAt: string;
  sha256: string;
  request?: unknown;
}[] = [];
function get(file: string, url: string, body?: unknown) {
  const args = [
    "--fail",
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    "45",
  ];
  if (body)
    args.push(
      "-H",
      "Content-Type: application/json",
      "--data",
      JSON.stringify(body),
    );
  args.push(url);
  const data = execFileSync("curl", args, { maxBuffer: 5 * 1024 * 1024 });
  writeFileSync(join(directory, file), data);
  entries.push({
    file,
    url,
    retrievedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(data).digest("hex"),
    ...(body ? { request: body } : {}),
  });
  return data.toString("utf8");
}
const downloads = [];
for (const [name, id] of [
  ["stations", "1eefa68d-7c8d-491b-8e75-66a161947426"],
  ["line-stations", "8bf00fa8-86a5-437e-b5c7-9bc0fe0e2971"],
  ["route-stations", "733ff034-5a2b-442f-832a-c7d89add0ccb"],
]) {
  const catalogue = "https://data.taipei/dataset/detail?id=" + id;
  const html = get(name + "-page.html", catalogue);
  const urls = [
    ...new Set(
      html.match(
        /https:\/\/data\.taipei\/api\/frontstage\/tpeod\/dataset\/resource.download\?rid=[a-z0-9-]+/g,
      ),
    ),
  ];
  if (urls.length !== 1)
    throw Error(
      `Expected one CSV resource for ${name}; inspect catalogue before choosing`,
    );
  const url = urls[0];
  get(name + ".csv", url);
  downloads.push({ file: join(directory, name + ".csv"), url, catalogue });
}
get(
  "official-menu-en.json",
  "https://web.metro.taipei/apis/metrostationapi/menuline",
  { LineID: "0", Lang: "en" },
);
get(
  "official-menu-zh.json",
  "https://web.metro.taipei/apis/metrostationapi/menuline",
  { LineID: "0", Lang: "tw" },
);
get("circular-page.html", "https://www.ntmetro.com.tw/basic/?node=10138");
get("route-map.html", "https://web.metro.taipei/pages2026/WebRouteMap");
get(
  "official-map.webp",
  "https://web.metro.taipei/pages2026/images/routemap2026-TW.webp",
);
writeFileSync(
  join(directory, "downloads.json"),
  JSON.stringify(downloads, null, 2) + "\n",
);
writeFileSync(
  join(directory, "manifest.json"),
  JSON.stringify(entries, null, 2) + "\n",
);
console.log(
  `Retained ${entries.length} dated source snapshots in ${directory}. Review before changing the pinned importer directory.`,
);
