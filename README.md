# Hustlen’ MRT handoff playground

Standalone React + TypeScript + Vite + Tailwind CSS + original SVG experiment. The existing Owner/Borrower experience is preserved; no production application, authentication, database or booking API is involved.

## Run

Node 22+ (validated on Node 24). From this repository:

```sh
npm install
npm run dev
```

Use Vite’s printed development address in a supported local browser. For a restricted cloud filesystem, append `--cache /tmp/mrt-npm-cache` to installation commands. Reproduce the lockfile with `npm ci`.

The active network now includes **all 136 line-specific codes mapped to 120 physical handoff locations**, using October 2026 official sources. It includes R01 Guangci/Fengtian Temple, Xinbeitou, Xiaobitan, both Orange branches, and all Y07–Y20 stations. This is a dated source comparison, not a live service-status guarantee. See [station inventory and count reconciliation](STATION_INVENTORY.md).

## Use the existing demo

- **Owner mode:** select/deselect multiple station markers, select every station on a line, remove individual locations, clear all, or save availability. Changes autosave locally; Save availability acknowledges an explicit save.
- **Borrower mode:** only owner-approved stations are selectable. Choose exactly one station and confirm to see a simulated summary. Grey stations cannot be confirmed. No booking is created.
- **Persistence:** the same `hustlen-mrt-demo-v1` localStorage key and all 26 legacy IDs are retained with their exact physical meaning. Availability, mode and choice survive browser refresh on the same origin. The official English display names may differ from the old fixture; IDs do not.
- **Search:** English, Traditional Chinese or any station code. Choosing a result zooms and centers on its marker without changing availability.
- **Map:** all 120 markers appear in the overview; terminal/selected labels provide context. Zoom +/− (up to 800%), drag the background to pan, mouse-wheel or trackpad/touch pinch to zoom, or reset the view. Label density adapts to zoom and avoids overlaps. Hover or keyboard-focus a marker for bilingual details; labels never intercept another station’s click.
- **Playground controls:** sample availability, clear selection, reset app state, inspect IDs/source status and independently show/hide transport systems. Network visibility does not change saved availability. The current task contains one MRT system; no future LRT was added.

Banqiao BL07/Y16 and Xinpu BL08/Xinpu Minsheng Y17 are separate handoff locations with dashed walking connections. Shared in-station interchanges have one selectable identity with all line codes. A station complex is not a specific exit; agree on an exit for any real-world handoff.

## Validation

```sh
npm test
npm run validate:data
npm run validate:official
npm run build
```

The tests compare raw CSV route order, branch/terminal coverage, official code/SID identities, bilingual search, coordinates, legacy compatibility and selection rules. The official validator checks the eleven raw snapshot hashes and connectivity as well as topology. A structural pass alone does not establish network accuracy.

To repeat the full Chromium interaction check and refresh screenshots, keep the Vite server running:

```sh
npx playwright install chromium  # only if no supported Chromium is already installed
npm run test:browser
npm run test:navigation
```

The smoke script uses `/usr/bin/chromium` when available, otherwise Playwright’s installed browser. Set `MRT_BROWSER_PATH` for another executable or `MRT_DEMO_URL` for a different server address. It performs real pointer selections for every station on desktop/mobile, every approved borrower choice on desktop, refresh checks, unavailable-station rejection, confirmation, legacy IDs, search centering, and pan/reset. It writes `docs/browser-validation.json` only after the complete run passes. Screenshots: [desktop overview](docs/screenshots/desktop.png), [desktop detail](docs/screenshots/desktop-detail.png), [mobile](docs/screenshots/mobile.png).

## Data, isolation and future expansion

- [SOURCE_REPORT.md](SOURCE_REPORT.md): sources, raw discrepancies, field mappings, verification scope and limitations.
- [DATA_IMPORT.md](DATA_IMPORT.md): downloading official CSV/JSON/HTML evidence and reproducing the import.
- `data-sources/raw/2026-10-16/`: dated unmodified official sources, download URLs, request bodies and SHA-256 manifest.
- `data-sources/physical-identities.json`: explicit official SID → stable handoff-ID mapping, preserving legacy IDs.
- `data-sources/schematic-layout.json`: independently authored coordinates keyed by line code; no operating sequence is inferred from position.
- `data-sources/normalized/`: per-station inventory CSV, count/coverage JSON and field corrections.
- `src/data/official-network.json`: generated active data. `fixture.ts` remains for compatibility tests only; there is no silent fixture fallback.
- `src/utils/`: validation, search, availability checks and screen-space label collision handling.
- `src/components/MRTMap.tsx`: original vector rendering and interaction; no static-image overlay.

The schema includes open line IDs, configurable code formats, line colors, operators, metro/light-rail systems, route variants, shared canonical stations and separate walking transfers. UI lines come from the network data. Additional transport systems can be toggled independently without conflating operators or stations. Danhai, Ankeng and Sanying are intentionally outside the current dataset.

Remaining qualifications: the Y topology is verified from the operator’s ordered station table and official diagram rather than a TDX RouteID export; eleven Circular-only stations lack geographic coordinates in these sources but have valid SVG coordinates; the supplied nominal 132 operator baseline has a different counting basis from physical locations; schematic label placement can still be refined. Complete evidence and count arithmetic are documented rather than forcing 132 markers.

Zoom/navigation diagnosis, regression coverage and native macOS test steps are in [NAVIGATION_REPORT.md](NAVIGATION_REPORT.md). Map controls use 44px touch targets and a 60–800% range; wheel/pinch zoom follows the pointer or gesture center. Dragging from a station pans without selecting it. Gestures outside the map retain normal browser behavior.
