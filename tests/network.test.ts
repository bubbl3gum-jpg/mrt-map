// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import type { Network } from "../src/data/types";
import { fixture } from "../src/data/fixture";
import {
  compareTopology,
  searchStations,
  validateNetwork,
} from "../src/utils/station-validation";
const n: Network = JSON.parse(
  readFileSync("src/data/official-network.json", "utf8"),
);
const raw = "data-sources/raw/2026-10-16/";
const byCode = (code: string) =>
  n.stations.find((s) => Object.values(s.codes).includes(code))!;
const codesFor = (id: string, line: string) =>
  n.stations.find((s) => s.id === id)!.codes[line];
describe("complete October 2026 network", () => {
  it("has 136 official codes, 120 physical locations, 6 line families and valid bilingual identities/layout", () => {
    expect(n.stations).toHaveLength(120);
    expect(n.stations.flatMap((s) => Object.values(s.codes))).toHaveLength(136);
    expect(n.lines).toHaveLength(6);
    expect(validateNetwork(n)).toEqual([]);
    for (const s of n.stations) {
      expect(s.operational).toBe(true);
      expect(s.officialId).toMatch(/^metro-taipei:SID:/);
      expect(s.operatorIds!.length).toBeGreaterThan(0);
      expect(s.nameEn).toBeTruthy();
      expect(s.nameZh).toMatch(/[\u3400-\u9fff]/);
      expect(
        Number.isFinite(n.layout[s.id].x) && Number.isFinite(n.layout[s.id].y),
      ).toBe(true);
    }
  });
  it("matches every directional route exactly to the raw official CSV", () => {
    const rows: Record<string, string>[] = parse(
      readFileSync(raw + "route-stations.csv", "utf8"),
      { columns: true, bom: true },
    );
    expect(rows).toHaveLength(22);
    for (const row of rows) {
      const route = n.routes.find(
        (r) =>
          r.sourceRouteId === row.RouteID.replaceAll("'", "") &&
          r.direction === Number(row.Direction),
      )!;
      const expected = [
        ...row.Stations.matchAll(/\d+,((?:BR|BL|R|G|O)\d{2}[A-Z]?),/g),
      ].map((m) => m[1]);
      expect(route).toBeTruthy();
      expect(route.stations.map((id) => codesFor(id, route.line))).toEqual(
        expected,
      );
    }
  });
  it("has both Orange forks, branch spurs and the new R01 terminal without invented direct links", () => {
    const sequences = n.routes.map((r) =>
      r.stations.map((id) => codesFor(id, r.line)),
    );
    expect(sequences).toContainEqual(["R22", "R22A"]);
    expect(sequences).toContainEqual(["G03", "G03A"]);
    expect(sequences.some((c) => c[0] === "O01" && c.at(-1) === "O21")).toBe(
      true,
    );
    expect(sequences.some((c) => c[0] === "O01" && c.at(-1) === "O54")).toBe(
      true,
    );
    expect(sequences.some((c) => c[0] === "R01" && c.at(-1) === "R28")).toBe(
      true,
    );
    expect(
      n.stations.some((s) => Object.values(s.codes).includes("G01A")),
    ).toBe(false);
  });
  it("agrees with the Circular operator table for all fourteen codes and names", () => {
    const html = readFileSync(raw + "circular-page.html", "utf8");
    for (let i = 7; i <= 20; i++) {
      const code = "Y" + String(i).padStart(2, "0");
      expect(html).toContain(code);
      expect(html).toContain(byCode(code).nameZh);
    }
    expect(
      n.routes
        .find((r) => r.line === "Y")!
        .stations.map((id) => codesFor(id, "Y")),
    ).toEqual(
      Array.from(
        { length: 14 },
        (_, i) => "Y" + String(i + 7).padStart(2, "0"),
      ),
    );
  });
  it("uses the official SID to merge interchanges and keeps walking transfers distinct", () => {
    expect(byCode("BR24").id).toBe(byCode("BL23").id);
    for (const [a, b] of [
      ["G04", "Y07"],
      ["O02", "Y11"],
      ["O17", "Y18"],
      ["R07", "O06"],
    ])
      expect(byCode(a).id).toBe(byCode(b).id);
    for (const [a, b] of [
      ["BL07", "Y16"],
      ["BL08", "Y17"],
    ]) {
      expect(byCode(a).id).not.toBe(byCode(b).id);
      expect(
        n.transfers.some(
          (t) =>
            new Set([t.from, t.to]).has(byCode(a).id) &&
            new Set([t.from, t.to]).has(byCode(b).id),
        ),
      ).toBe(true);
    }
  });
  it("retains all previously saved IDs with exactly their original code meaning", () => {
    for (const old of fixture.stations) {
      const current = n.stations.find((s) => s.id === old.id)!;
      expect(current).toBeTruthy();
      for (const [line, code] of Object.entries(old.codes))
        expect(current.codes[line]).toBe(code);
    }
  });
  it("finds every imported station in English, Chinese and every line code", () => {
    for (const s of n.stations)
      for (const query of [s.nameEn, s.nameZh, ...Object.values(s.codes)])
        expect(searchStations(n, query).map((s) => s.id)).toContain(s.id);
  });
  it("preserves all raw source snapshots by SHA-256", () => {
    const files = JSON.parse(readFileSync(raw + "manifest.json", "utf8")) as {
      file: string;
      sha256: string;
    }[];
    expect(files).toHaveLength(11);
    for (const f of files)
      expect(
        createHash("sha256")
          .update(readFileSync(raw + f.file))
          .digest("hex"),
      ).toBe(f.sha256);
  });
  it("has one connected rail graph including all branches and Circular stations", () => {
    const adj = new Map(n.stations.map((s) => [s.id, new Set<string>()]));
    for (const r of n.routes)
      for (let i = 1; i < r.stations.length; i++) {
        adj.get(r.stations[i])!.add(r.stations[i - 1]);
        adj.get(r.stations[i - 1])!.add(r.stations[i]);
      }
    const visited = new Set<string>(),
      queue = [n.stations[0].id];
    while (queue.length) {
      const id = queue.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(...adj.get(id)!);
    }
    expect(visited.size).toBe(120);
  });
  it("supports another operator, transport system and arbitrary station code format", () => {
    const future: Network = {
      schemaVersion: 1,
      status: "illustrative",
      sources: [],
      lines: [
        {
          id: "future-lrt",
          name: "Example",
          zh: "測試",
          color: "#abc123",
          operatorId: "TEST",
          systemId: "test-lrt",
          codePattern: "^T-[A-Z]+$",
        },
      ],
      operators: [{ id: "TEST", name: "Test operator" }],
      systems: [
        { id: "test-lrt", name: "Test light rail", kind: "light-rail" },
      ],
      stations: [
        {
          id: "test1",
          nameEn: "Example one",
          nameZh: "測試一",
          codes: { "future-lrt": "T-ONE" },
        },
        {
          id: "test2",
          nameEn: "Example two",
          nameZh: "測試二",
          codes: { "future-lrt": "T-TWO" },
        },
      ],
      routes: [
        { id: "branch-a", line: "future-lrt", stations: ["test1", "test2"] },
      ],
      transfers: [],
      layout: { test1: { x: 0, y: 0 }, test2: { x: 1, y: 1 } },
    };
    expect(validateNetwork(future)).toEqual([]);
    const reordered = structuredClone(n);
    reordered.routes[0].stations.reverse();
    expect(compareTopology(reordered, n)).toContain(
      "Route ordering, branch or membership differs from reference",
    );
  });
});

import { placeMapLabels } from "../src/utils/map-labels";
it("reduces label density at overview and always reveals a focused station", () => {
  const ends = new Set(
    n.routes.flatMap((r) => [r.stations[0], r.stations.at(-1)!]),
  );
  const overview = placeMapLabels(
    n.stations,
    n.layout,
    0.2,
    1,
    ends,
    new Set(),
    null,
  );
  const detail = placeMapLabels(
    n.stations,
    n.layout,
    1,
    5,
    ends,
    new Set(),
    null,
  );
  expect(overview.length).toBeLessThan(detail.length);
  const focused = placeMapLabels(
    n.stations,
    n.layout,
    0.2,
    1,
    ends,
    new Set(),
    n.stations[10].id,
  );
  expect(focused.find((l) => l.station.id === n.stations[10].id)?.detail).toBe(
    true,
  );
});
