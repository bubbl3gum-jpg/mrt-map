# Import downloaded official data

The demo supports a normalized JSON import. Raw official CSV/JSON schemas vary, and the full authenticated datasets could not be inspected here. There is deliberately no guessed raw CSV field mapping. Convert downloaded CSV with a real CSV parser (quoted commas/newlines must be preserved), or map official JSON using a small local adapter after examining its documented fields. Retain originals in `.local/raw/` with source URLs, download dates, checksums and operator/schema version. This directory is ignored; do not store credentials with data.

Target shape (example contract, not station evidence):

```json
{
  "schemaVersion": 1,
  "status": "imported",
  "sources": [{"url":"https://www.metro.taipei/actual-download-url", "retrievedAt":"2026-10-16", "description":"Dataset title/version and original filename"}],
  "stations": [
    {"id":"stable-physical-id", "nameEn":"Official English name", "nameZh":"官方站名", "codes":{"R":"R01"}, "latitude":25.0,"longitude":121.5},
    {"id":"second-physical-id", "nameEn":"Second official name", "nameZh":"第二站", "codes":{"R":"R02"}}
  ],
  "routes": [{"id":"official-route-direction-variant", "line":"R", "stations":["stable-physical-id","second-physical-id"]}],
  "transfers": [],
  "layout": {"stable-physical-id":{"x":100,"y":100},"second-physical-id":{"x":200,"y":100}}
}
```

1. Download station information, lines, station-of-line membership, operating route sequences, transfers, network and geographic coordinates from the official catalogue/TDX where available. Verify Y with New Taipei Metro. Record omissions explicitly.
2. Preserve original line codes in `codes`. Assign stable physical IDs via an explicit reviewed mapping table; do not merge names merely because they match. In-station interchange codes share one physical ID. Out-of-station transfers remain separate IDs connected by `{ "from":"id-a", "to":"id-b", "kind":"out-of-station" }`.
3. Sort each operating route by its official sequence number; do not infer order from station codes. Represent Orange branches and operating variants as separate routes sharing the verified trunk; document spur patterns. Include all source stations. The generic line-code validator accepts a two-digit numeric suffix and optional letter; adapt separately if official schema requires a different format.
4. Keep station geographic coordinates separate from schematic `layout`. Supply finite SVG coordinates for every station. Route bend geometry uses intermediate stations, so manually review label collisions and paths after import. Schematic positions do not certify network topology.
5. Save the normalized object, then run:

```sh
npm run validate:data -- .local/normalized-official-network.json
npm run import:data -- .local/normalized-official-network.json
npm run validate:data
npm run build
npm test
```

The importer refuses overwrite unless `--replace` is appended, validates before writing, and writes `src/data/official-network.json`. Vite automatically uses that file on the next reload/build. Remove that file to restore the illustrative fixture. Validation failures exit nonzero. Bad input does not overwrite an existing import. Supply real source URLs/dates, never the example placeholder. The imported status records acquisition only; it does **not** claim official sequence comparison is complete. Update SOURCE_REPORT.md with your actual comparison evidence and remaining uncertainties.

For an automated comparison with a separately prepared official reference using the same physical IDs and route IDs:

```sh
npm run validate:data -- src/data/official-network.json --reference .local/official-reference.json
```

This compares canonical ID/code mappings, exact ordered route sequences (including branch route membership), and external transfer connections. A missing explicit file fails rather than falling back to the fixture. Keep reference normalization independent from layout editing; comparing a file to itself provides no evidence of official accuracy.

The public official Chinese-name/code inventory can be refreshed separately with `npm run fetch:catalogue` (requires curl and HTTPS access). This inventory is intentionally not converted into a complete network: a search list does not establish operating routes or branches.
