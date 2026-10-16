# Hustlen’ MRT handoff playground

Standalone React + TypeScript + Vite + Tailwind CSS application. No production integration, accounts, API, database, or booking writes. This repository was empty, so the application lives at its root.

## Run

Node 22+ recommended (validated with Node 24.19.0 and npm 11.9.0).

```sh
npm install
npm run dev
```

Open the address Vite prints in your local browser. In a restricted cloud filesystem, use `npm install --cache /tmp/mrt-npm-cache`. To reproduce locked dependencies, use `npm ci --cache /tmp/mrt-npm-cache`.

```sh
npm run build
npm test
npm run validate:data
```

Owner mode toggles multiple stations, selects loaded stations by line, removes selections, and saves availability to browser localStorage. Changes autosave; Save availability explicitly acknowledges saving. Borrower mode enables only approved stations, permits one selection, and shows a simulated summary. No real booking occurs. Both modes and selections survive refresh on the same browser origin. Playground controls provide samples, clearing, resetting, IDs, and provenance. Reset clears this app’s saved selection without clearing other sites’ data.

Search English, Traditional Chinese, or station codes. Select a search result to highlight its marker; use zoom and pan to inspect. Keyboard users can tab to enabled markers and press Enter/Space. Drag the map background to pan, use +/− to zoom, and the target button to reset the view. The layout adapts to mobile widths.

## Accuracy limitation — read before evaluating network coverage

**This is a working interaction prototype, not a complete official MRT map.** The official search catalogue was retrieved after an initial network block, but the TDX station API requires an API key and a complete official operating network could not be obtained. The official code/Chinese-name catalogue is preserved in `data-sources/`; the interactive map ships a hand-authored 26-station illustrative subset, without claiming authoritative topology, coordinates, or complete branches. All six line families appear, but no complete line is represented. Line selection means all **loaded** stations of that line. See [SOURCE_REPORT.md](SOURCE_REPORT.md) and [DATA_IMPORT.md](DATA_IMPORT.md).

Banqiao Bannan and Circular stops have separate IDs and a dashed walking connection; this example must be checked against official transfer guidance. Interchanges within the fixture use one physical ID with multiple line codes. The disconnected BL Banqiao and O Touqianzhuang markers do not imply missing segments are direct connections. No synthetic edges join omitted stations. River shape and all positions are schematic artwork, not geographic data.

## Structure

- `src/data/types.ts`: data contract, physical stations, routes, external transfers, layout
- `src/data/fixture.ts`: clearly labeled illustrative records
- `src/data/network.ts`: loads official normalized data when imported; otherwise fixture
- `src/data/lines.ts`: line colors and bilingual line labels
- `src/components/MRTMap.tsx`: original SVG network, marker interactions, pan and zoom
- `src/App.tsx`: owner/borrower panels, search, controls, persistence
- `src/utils/station-validation.ts`: data integrity, search and availability rules
- `scripts/`: import and validation CLIs
- `tests/`: interaction/persistence/identity/validation tests

SVG extents adapt to imported layout coordinates. Route polylines follow explicit source sequences; branches must be separate routes sharing canonical station IDs. Official order verification requires source comparison, not just a passing structural check.

## Preview and evaluation

Run the dev server, choose Taipei Main Station and Zhongshan, switch to Borrower mode, and confirm one. Refresh to check persistence. Grey stations must remain unavailable. Open Playground controls to load samples or reset. Run tests for automated coverage. No cloud preview URL is assumed; use a locally supported browser or forwarded development server.

Captured previews: [desktop](docs/screenshots/desktop.png) · [mobile](docs/screenshots/mobile.png). These show the illustrative subset, not a verified complete MRT network. Validation results are recorded in SOURCE_REPORT.md.
