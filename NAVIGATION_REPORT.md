# Zoom and navigation repair

The existing SVG architecture and Owner/Borrower logic are preserved. No station data, IDs, topology, importers, raw evidence, booking logic or localStorage behavior was changed.

## Reproduced root causes

On the previous implementation in Chromium, actual mouse-wheel input without modifiers left the map transform at `scale(1)`. The same input with Ctrl changed it to approximately `scale(2.0544)`. The wheel listener existed and was non-passive, but its `ctrlKey || metaKey` gate ignored ordinary scrolling. This was a handler condition, not a missing SVG transform or a zoom-limit failure.

The old pointer-down handler spread a `DOMPoint` into its drag record. `DOMPoint.x/y` are accessor properties and are not copied by object spread. The first move therefore subtracted undefined coordinates, producing `translate(NaN NaN)`. Emulated two-finger input reproduced that invalid rendered transform with no scale increase. The old pan/reset smoke check merely asserted a changed transform string, so NaN incorrectly counted as a movement.

There was no multi-pointer pinch recognizer or Safari `gesturestart/change/end` handling. SVG `touch-action: none` correctly reserved gestures for the application, but there was no application pinch implementation to replace native page pinch. The single drag record also let additional pointers overwrite one another. Existing wheel/button scaling used the schematic center rather than the pointer or the center of a panned viewport.

Container overflow remains intentionally hidden to clip the moving network. Camera changes are confined to the inner SVG group; the floating controls remain outside that group. Mode changes do not reset the camera. The SVG canvas sizing/touch rule now targets `.map-stage > svg` so it does not resize navigation-button icons.

## Repair

- A small camera hook explicitly copies finite coordinates and keeps one coherent zoom/pan snapshot. No additional dependency was added.
- Normal mouse wheel and Ctrl-wheel trackpad-style input are handled by a non-passive listener attached only to the map SVG. Delta modes are normalized. The world location under the pointer stays fixed while scale changes.
- Two captured touch pointers zoom around their midpoint and support midpoint translation. A remaining single pointer rebases smoothly into pan. Safari gesture events have a compatibility path; concurrent gesture/pointer input is not applied twice.
- A one-pointer movement threshold distinguishes taps from drags, including drags that start on a station. Gesture-generated clicks are suppressed; ordinary station clicks, touch taps and keyboard activation still use the existing selection callback.
- Buttons zoom around the viewport center, retaining its current world location after panning. The range is **60–800%**, preserving the high detail level needed by the full schematic. Limit buttons disable at their bounds.
- Reset restores the original fitted camera and clears search highlighting through the existing callback. Every station fits in both desktop and mobile views. Search still centers a station after zoom/pan.
- The floating controls retain the existing design, accessible labels and percentage display, with **44×44px minimum touch targets**.
- Wheel/pinch/pointer listeners do not attach to the page, search field, or other content. Browser/page behavior outside the map remains available.

## Files

- `src/components/MRTMap.tsx`: connect the existing rendering to the camera hook; bounded floating controls.
- `src/hooks/useMapCamera.ts`: wheel, pointer, pinch and Safari gesture handling; capture lifecycle and click suppression.
- `src/utils/map-camera.ts`: finite, clamped, anchor-preserving camera mathematics.
- `src/styles.css`: scoped canvas rule and navigation touch targets.
- `tests/map-camera.test.ts`: anchor, panned-center, finite-value and limit regression tests.
- `scripts/navigation-smoke.mjs`: actual rendered-geometry/browser regressions.
- `package.json`, `README.md`: the navigation check command and usage instructions.
- `docs/navigation-validation.json`, existing browser report/screenshots: results of executed checks.

## Verification

TypeScript and the production build pass. All **25 automated tests** pass, including the existing 22 tests. The official-data validator still passes against all retained source hashes; protected data and application state files are unchanged.

`npm run test:navigation` measures actual SVG screen matrices, station separation and rendered anchor positions. It covers +/−, ordinary wheel, Ctrl-wheel, drag from a station without selection, viewport-centered button zoom after pan, search centering, zoomed station selection, Borrower confirmation without a camera reset, both zoom limits, reset fitting every location, page scrolling and typing outside the map, synthetic Safari compatibility events, 390px Chromium two-touch input, one-finger touch pan, and mobile touch controls/selection. Numeric geometry must remain finite; a changed string alone is insufficient.

Use a running server, preferably a stable production preview while validating:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
# In another terminal:
MRT_DEMO_URL=http://127.0.0.1:4173 npm run test:navigation
MRT_DEMO_URL=http://127.0.0.1:4173 npm run test:browser
```

The latter retains the all-120-station Owner/Borrower checks, legacy-ID persistence and desktop/mobile workflow validation. Result artifacts are written only after the complete corresponding run passes. Production preview prevents source hot reloads from interrupting a gesture test.

## Native-device qualification and macOS manual check

**Native MacBook trackpad hardware and Safari were not tested.** Chromium Ctrl-wheel input, Chromium CDP touch input, and synthetic Safari compatibility events are separate automated coverage, not proof of native macOS behavior.

On a MacBook, check both your normal browser and Safari:

1. Open the app and place the pointer over a recognizable station. Pinch open/closed on the trackpad; the map should change scale around that point, while the browser page/UI does not zoom.
2. Scroll over the map and use +/−; inspect station labels. Drag the map, then use a button again: the viewport center should remain on the same world location.
3. Drag beginning on a station, release, and verify availability did not change. Click normally to select it, switch modes, and confirm an approved station.
4. Search for R01 after panning; its marker should center. Reset should restore the entire network overview.
5. Move outside the map and verify ordinary page scrolling, typing and the browser’s normal trackpad gesture behavior.
6. On a real touch device, pinch with two fingers, lift one and continue dragging, then lift both and tap a station. Confirm that only the deliberate tap selects a station.

A hardware-specific failure should be recorded with browser/OS version and the gesture used. No native-device success is inferred from the emulation results.
