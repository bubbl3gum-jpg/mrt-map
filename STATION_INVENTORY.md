# Station inventory and count reconciliation

As of **2026-10-16**. Sources were retrieved on that date; Taipei City CSV records are updated **2026-09-02**. All displayed locations participate in the retained operating route sequences or the Circular operator station table and current official map. R01 Guangci/Fengtian Temple appears in the main Red route, station menu, station CSV, and current diagram. Its August 30 opening date was provided in the request; this work verifies inclusion in the post-opening sources rather than independently dating the opening announcement.

| Measure | TRTC | NTMC Circular | Combined |
|---|---:|---:|---:|
| Operator-reported baseline supplied in request | 118 | 14 | 132 nominal |
| Unique line-specific codes in retrieved sources | 122 | 14 | **136** |
| Unique physical locations served by each operator | 109 | 14 | **120** after three shared locations |
| Physical locations displayed/selectable | — | — | **120** |
| Physical locations with operational source evidence | — | — | **120** |

The 118 TRTC baseline and its precise counting convention have not been independently confirmed from an operator statistics publication. The NTMC 14 is independently supported by its Y07–Y20 station table. Do not treat the nominal sum 132 as a physical handoff-location target. A counting convention that consolidates four cross-platform interchange pairs but counts nine other TRTC interchange complexes by line would produce 118 from 122 codes; that is a reconciliation hypothesis, not a retrieved operator definition.

The independently reproducible physical count is **136 codes − 13 TRTC interchange consolidations − 3 cross-operator interchange consolidations = 120**. Equivalently, **109 TRTC physical locations + 14 Circular locations − 3 shared locations = 120**. We group by the official website’s physical `SID`, never by name alone. The station CSV has 110 rows, including two Nangang Exhibition Center records that share one official SID, and a missing Dongmen alias; raw row count is not physical count.

| Line | Codes / locations on line | Retained route records | Coverage |
|---|---:|---:|---|
| BR Wenhu | 24 | 2 directions | BR01–BR24 |
| R Tamsui–Xinyi | 29 | 6 | R01–R28, R22A; main, short working, Xinbeitou branch |
| G Songshan–Xindian | 20 | 6 | G01–G19, G03A; main, short working, Xiaobitan branch |
| O Zhonghe–Xinlu | 26 | 4 | O01–O21 and O50–O54; both branches through O12 |
| BL Bannan | 23 | 4 | BL01–BL23; full and short working |
| Y Circular | 14 | 1 table-derived chain | Y07–Y20, checked with NTMC table and official diagram |

There are 22 TRTC directional route records, representing 11 service variants. The Y record is a documented ordered station-table chain, **not** an invented TDX RouteID or a timetable assertion. Reverse Y travel follows the same physical chain; no separate authenticated service-pattern data was acquired.

In-station cross-operator groupings: **G04/Y07 Dapinglin**, **O02/Y11 Jingan**, **O17/Y18 Touqianzhuang**. All preserve both codes under one selectable ID.

Out-of-station walking transfers: **BL07 ↔ Y16 Banqiao** and **BL08 Xinpu ↔ Y17 Xinpu Minsheng**. Each endpoint remains independently selectable, with dashed connections. Identical Banqiao names do not cause merging. The official route map’s dotted external-transfer symbols distinguish them from the in-station groupings.

All 26 legacy fixture IDs retain exactly their old code associations, including separate Banqiao IDs. Additional IDs use `taipei-mrt:station:<official SID>`. The reviewed, versioned mapping is `data-sources/physical-identities.json`; IDs do not depend on array order or English spelling. No selection migration is needed for v1. Unknown saved IDs are ignored by the existing safe loader, never mapped by approximate name.

Machine-readable deliverables:

- `data-sources/normalized/station-inventory.csv`: every physical ID, official SID, bilingual name, codes, operator membership, operational flag and available geographic coordinates.
- `data-sources/normalized/coverage.json`: counts by line/operator, source corrections and nominal baseline qualification.
- `src/data/official-network.json`: active topology and provenance, with a separate layout property.

Geographic coordinates are available for 109 TRTC/shared locations. Eleven Circular-only locations have no geographic coordinates in the selected station-table source; their SVG coordinates are present. No geographic coordinates were fabricated. The complete SVG coordinate file is separately authored and has no authority over station ordering or transfer identity.
