# Official MRT sources and validation report

Scope: the six requested MRT lines, operating information as of **2026-10-16**. No Danhai, Ankeng or Sanying stations are included. This report supersedes the earlier fixture-only report.

## Acquisition and retained evidence

Public Taipei City CSVs were investigated before TDX. Their host initially returned proxy CONNECT 403. After adding `data.taipei` to the existing environment allowlist, catalogue pages and CSV downloads succeeded. No TDX credentials or authenticated dataset calls were needed in this task. The public official website API used by the bilingual station menu is unauthenticated.

All evidence is retained under `data-sources/raw/2026-10-16/`. `manifest.json` records source URLs, request parameters when applicable, retrieval timestamps, and SHA-256 digests. `downloads.json` maps CSV files to their dataset pages and exact resource-download URLs. Raw bytes are not edited.

| Source | Dataset / evidence | Observed result |
|---|---|---|
| https://data.taipei/dataset/detail?id=1eefa68d-7c8d-491b-8e75-66a161947426 | Station information, bilingual names, grouped codes and coordinates; resource `c77e91bf-067c-475e-917b-545ff62b7d76` | 110 CSV rows; update 20260902 |
| https://data.taipei/dataset/detail?id=8bf00fa8-86a5-437e-b5c7-9bc0fe0e2971 | Line-station membership; resource `e3c0e67f-5916-405f-ad9a-41f52a65c2d2` | 8 branch/membership records |
| https://data.taipei/dataset/detail?id=733ff034-5a2b-442f-832a-c7d89add0ccb | Operating route sequences; resource `cca16a48-2753-4d3d-9142-ce14f7f9fdd0` | 22 directional CSV records |
| https://web.metro.taipei/apis/metrostationapi/menuline | POST `{"LineID":"0","Lang":"en"}` and `tw`; endpoint discovered in the official website application bundle | 136 codes, bilingual names, 120 physical SIDs |
| https://web.metro.taipei/pages2026/WebRouteMap | Current route-map HTML and `images/routemap2026-TW.webp` | R01, branches, interchange groups and two walking transfers compared visually |
| https://www.ntmetro.com.tw/basic/?node=10138 | Circular station table | 14 rows, ordered Y07–Y20, Chinese names match official menu |

The raw official diagram is retained only as comparison evidence. The app renders an original SVG network; it does not display the diagram behind click targets.

## Field mappings and reconciliations

`csv-parse` handles the actual BOM-prefixed CSV, quoted commas, and embedded tuple strings. No remote JavaScript is evaluated.

- `StationID` supplies raw line-code aliases. `StationName` tuple supplies Chinese/English names. `StationPosition` is **longitude, latitude**. `SEQNO` identifies the source record. `UpdateTime` is retained in the snapshot; it is not the retrieval date.
- English/Chinese menu entries join by `StationLabel`; matching `SID` identifies a shared physical location. Operator membership comes from the line family, retained separately from physical identity. Code → physical ID is explicit in the reviewed SID mapping.
- Route `RouteID` + `Direction` gives a stable namespaced route-record ID. The embedded numeric station sequence determines order. Both directions and short workings are retained. Codes are never sorted to generate operating order.
- Line-station records independently check membership, including the Orange branch whose sequence begins at 12, and branch line IDs `R-3`/`G-3`.
- The NTMC table supplies the ordered Circular chain. The physical adjacency is also compared with the official map. It is not labeled as an official TDX route identifier.

Raw discrepancies are not silently corrected:

1. Xiaobitan is `G01A` in the station CSV but `G03A` in route/membership/menu/map sources. Only this explicit raw alias is corrected.
2. Dongmen’s station row contains R07 only; the official SID menu, route CSV and map supply O06 on the same physical location.
3. BR24 and BL23 are separate station CSV rows but share official SID 031. They become one handoff location, preserving both line codes.
4. The authoritative website menu resolves English variants/errors such as `Minzuan` → `Minquan`, `Songliang` → `Songjiang`, `Xhongxiao` → `Zhongxiao`, and `St.lgnatius` → `St. Ignatius`. C.K.S./S.Y.S. abbreviations are the menu’s preferred display forms. Exact changed values and reasons are generated in `normalized/corrections.json`; raw spellings remain intact in CSV.
5. Banqiao BL07 and Y16 have different SIDs and an out-of-station connection. Xinpu BL08 and Xinpu Minsheng Y17 also remain separate. Dapinglin, Jingan and Touqianzhuang share official SIDs across operators.

## Validation evidence

`npm run validate:official` compares the active dataset to freshly parsed retained route/menu/operator sources, verifies all eleven source checksums, checks canonical code/SID groupings and two walking connections, and confirms one connected 120-location rail graph. `npm run validate:data` performs structural checks and invokes the pinned source comparison for this dataset. The automated tests additionally compare **every route’s exact ordered codes directly with the raw CSV**, test branch/terminal cases and R01, check all station names/codes/layout positions, preserve all 26 legacy identities, and search every imported station.

The reference comparison does not certify new future sources or permanently guarantee operations after the snapshot date. The Y sequence has operator-table and diagram evidence, rather than a machine-readable operating-route export. The full nominal operator-count definition remains qualified in STATION_INVENTORY.md.

## Executed checks

- 22 unit/integration tests passed across the existing interaction/importer suite and expanded official-network suite. The existing line-selection assertion now expects all 24 Wenhu stations instead of the former four loaded fixture stations; the behavior remains the same.
- TypeScript and Vite production build passed.
- Official comparison passed for 23 route records (22 TRTC directions plus the NTMC table-derived chain), 136 codes, 120 physical locations, all eleven source hashes, and a connected rail graph. JSON results are retained in `docs/data-validation.json`.
- The public downloader was exercised successfully against all eleven sources into a separate local directory, and repeated pinned imports produced deterministic active data.
- Chromium performed real pointer selection of every location as Owner on desktop and mobile (120 each), and every approved location as Borrower on desktop (120). It also verified unavailable-station rejection, simulation confirmation, 26-ID legacy persistence, refresh, search focus, pan/reset, distinct Banqiao endpoints and mobile horizontal layout. The successful run is recorded in `docs/browser-validation.json`. No browser runtime errors were observed.
- Desktop overview/detail and 390px mobile screenshots are in `docs/screenshots/`.

Current line colors are taken from the predominant route colors in the retained official diagram: BR `#c48c32`, R `#e3002c`, G `#00865a`, O `#f8b61d`, BL `#0070bd`, Y `#f4d30e`. These describe the retrieved image, not a claim about a separate branding specification.

## Remaining limitations

- The original SVG coordinates are a schematic, not surveyed coordinates or a reproduction of the official image. Labels are collision-culled according to zoom and revealed on hover, keyboard focus, or search. Local label refinement remains possible.
- Eleven Circular-only locations lack geographic coordinates in these selected sources. All 120 have finite SVG coordinates and can be selected.
- Official station IDs identify station complexes, not a specific exit or platform. Real handoffs need an agreed exit; booking integration is outside this experiment.
- The 118 TRTC operator-reported baseline came from the request; its statistical counting convention was not independently retrieved. This does not change the 120 physical identities supported by the code/SID evidence.
- No live service alerts, timetable guarantees, route planner, authentication or production booking integration is provided.

See STATION_INVENTORY.md for count reconciliation, DATA_IMPORT.md for reproducible acquisition/import, and docs/browser-validation.json for executed browser interaction coverage.
