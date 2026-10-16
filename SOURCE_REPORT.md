# Source and validation report

Attempt date: 2026-10-16. Initial requests returned proxy CONNECT 403. After the network update, the official catalogue, route-map HTML/JavaScript and New Taipei Metro homepage became accessible. TDX station data still returned HTTP 401, `Valid API Key Required`. No TDX/client credential variable names or saved credential bindings were present.

| Official source | Intended use | Observed result |
|---|---|---|
| https://www.metro.taipei/cp.aspx?n=BDEB860F2BE3E249 | API catalogue; station, line, sequence, transfer and network datasets | Initial 403; retry HTTP 200, catalogue inspected |
| https://tdx.transportdata.tw/ | Rail/Metro/TRTC station, line, station-of-line, route sequences, transfer, coordinates; NTMC where available | Station/TRTC endpoint retry HTTP 401: Valid API Key Required |
| https://web.metro.taipei/pages2026/WebRouteMap | Visual comparison of branches, order, interchange arrangement | Retry HTTP 200; Chinese station/code search catalogue retrieved |
| https://www.ntmetro.com.tw/ | Circular Line operator verification | Retry homepage HTTP 200; detailed Circular dataset not obtained |

The Taipei Metro API catalogue links to TDX Station, StationOfLine, LineTransfer, Line, Network, Route and StationOfRoute datasets. The public route map exposes a station-code / Traditional Chinese-name search catalogue at `https://web.metro.taipei/pages2026/js/stations-data.js`. Its extracted records and retrieval metadata are checked into `data-sources/official-station-catalogue.json`; `npm run fetch:catalogue` refreshes them without evaluating remote JavaScript. This inventory is official data, but does not supply English names, coordinates, operating status or route sequences. For example, R01 appears in the catalogue; its presence alone does not establish current operation. No route ordering is inferred from this list.

The route map’s button IDs also group some interchange codes, but a full identity/transfer audit is unfinished. New Taipei Metro’s homepage was reached; detailed Y route/transfer records remain unexamined. The attempted TDX data URL was `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC?$format=JSON`; it returned `Valid API Key Required`. Other TDX dataset contents were not retrieved because the same authenticated API prerequisite remains unresolved. Use downloaded official datasets through DATA_IMPORT.md, or configure TDX access securely according to its current official documentation. Do not put credentials in chat, source or browser bundles.

Official domain additions were saved to the environment draft. Saving does not establish publication; review/save changes in environment settings and publish when appropriate. No new snapshot restoration has been tested.

## Current data status

`fixture.ts` is a manual UI fixture, not an official import. It includes 26 named physical-station records and six partial route sequences. Six line families use conventional colors. It is deliberately incomplete, with no implied complete Orange branches, Xinbeitou/Xiaobitan service patterns, terminal coverage, or Circular network completeness. Official station coordinates are absent. Every layout coordinate is original schematic artwork. The supplied names, codes, topology and walking transfer remain unverified.

## What validation means

The validator detects duplicate physical IDs and codes, missing bilingual names/layout coordinates, malformed line codes, invalid route references/membership, repeated stations within a sequence, duplicate route IDs, and invalid external transfer endpoints. Tests cover canonical shared IDs and separate external transfer identities. It cannot certify real-world station order, current operation, branches, physical interchange equivalence, completeness, or accessibility. Even imported data is reported as topology unverified until manually compared against the retained official raw records and map.

Required follow-up: obtain official datasets; retain dated raw files; map line-specific IDs to documented canonical physical IDs; compare every route sequence and branch including service variants; verify Circular Line with New Taipei Metro; record transfer grouping evidence; assign and review schematic coordinates; then update this report with counts, source versions and discrepancies. Do not silently promote fixture data to verified status.

## Executed checks

- Locked clean dependency install (`npm ci`) passed.
- TypeScript and Vite production build passed.
- 11 automated tests passed across interaction and importer suites, including official catalogue code/name matching, persistence, borrower restrictions, empty state, sequence mutation detection, and importer overwrite protection.
- Data structure validator passed for 26 fixture stations / six partial routes. Official reference comparison was not run: no authenticated complete operating dataset was obtained.
- Chromium owner → borrower → confirmation → refresh flow passed without browser errors. Desktop 1440px and mobile 390px screenshots captured; mobile horizontal overflow check passed. Browser tests are a local smoke check, not comprehensive accessibility or cross-browser certification.
