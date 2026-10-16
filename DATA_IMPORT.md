# Reproduce the official data import

The complete network uses public Taipei City CSV downloads and the official website’s station menu. It does not require TDX credentials. Original sources are pinned to `data-sources/raw/2026-10-16/`; never modify raw snapshots to make validation pass.

## Rebuild from checked-in evidence (offline)

```sh
npm ci
npm run import:official
npm run validate:official
npm run validate:data
npm test
npm run build
```

`import:official` verifies the pinned source hashes, parses the actual CSV/JSON/HTML formats, joins official physical SIDs through the reviewed identity mapping, compares membership and directional route pairs, attaches separately authored SVG coordinates, and validates before writing. It regenerates `src/data/official-network.json`, `normalized/coverage.json`, `normalized/corrections.json`, and `normalized/station-inventory.csv`. Repeated imports are deterministic. Runtime rendering does not need source-site access.

The CSV is UTF-8 with a BOM. `csv-parse` handles quoted fields; custom explicit field parsers decode the official embedded tuple strings, never arbitrary code. Station `StationPosition` is longitude then latitude. Route `Stations` records carry sequence numbers; their order is preserved and checked for consecutiveness. Orange’s independent branch membership starts at sequence 12, so membership checks respect its source offset. Branch line IDs and operating route IDs remain separate concepts.

The official bilingual website menu supplies the authoritative English display forms and physical SID groups, resolving specific CSV discrepancies. Chinese names agree across station/menu sources. Only G01A → G03A is a code-alias correction; O06 is supplied through its documented shared SID. See SOURCE_REPORT.md for field-level evidence and normalization decisions.

## Acquire fresh official source snapshots

Requires curl and allowed HTTPS access to `data.taipei`, `web.metro.taipei` and `www.ntmetro.com.tw`:

```sh
npm run fetch:official -- .local/new-official-snapshot
```

Choose a **new** directory. The downloader refuses an existing directory and preserves each response, retrieval time, URL, request parameters and SHA-256 digest. It discovers the CSV resource URL from each provided catalogue, failing if the resource choice becomes ambiguous. It uses normal certificate verification and the environment proxy. Do not pass credentials in shell arguments or source files.

This download command was exercised successfully against all eleven endpoints. New downloads are not silently promoted to active data. Review new source versions, compare their raw records, update the pinned `rawDirectory` and as-of metadata in `scripts/official-data.ts` deliberately, and extend `physical-identities.json` only when a new official SID is verified. Review any changed interchanges, branch order, code aliases, operating dates or station status; add layout coordinates independently. Then rerun import, official comparison, tests and browser checks. The current source set is intentionally pinned to October 2026.

A failed multi-file download may leave an incomplete new directory; keep it for diagnostics and use another new directory after correcting access. It cannot replace the pinned evidence. No station order or branch is invented to fill missing responses.

## Import an independently normalized JSON file

The generic v1 importer remains supported:

```sh
npm run validate:data -- .local/network.json
npm run import:data -- .local/network.json --replace
```

It requires `status: imported`, dated HTTPS source metadata, valid bilingual physical station records, route references and finite layout coordinates. It refuses to overwrite an existing network unless `--replace` is provided and validates before writing. Invalid input does not overwrite existing data. This importer supplies structure checks, not automatic proof of real-world accuracy.

The current schema is documented in `src/data/types.ts`. Use a station `id` for a stable physical handoff location, `officialId` for its namespaced source identity, `codes` for line-ID → station-code mappings, `operatorIds`/`systemIds` for memberships, and `operational` for snapshot operating coverage. Define new lines in `network.lines` with an arbitrary stable ID, display names/color, operator/system IDs and `codePattern`; do not assume every future code is two digits. Station geographic coordinates stay on station records; schematic coordinates stay in `layout`. Operating variants live in `routes`, with optional source route IDs, directions, operator IDs and provenance. In-station codes share an explicit reviewed physical identity. Out-of-station transfers use separate endpoints in `transfers`.

For comparison with an independent normalized reference using the same canonical/route IDs:

```sh
npm run validate:data -- .local/network.json --reference .local/independent-reference.json
```

This compares physical identity/code mappings, exact ordered route arrays (including branch variants) and out-of-station connections. Comparing a file with itself provides no independent accuracy evidence. An absent explicit input fails instead of falling back.

The older `npm run fetch:catalogue` command is retained for the public Chinese code/name search inventory. That list alone must never be converted into operating topology; use the route CSV and operator evidence described above.
