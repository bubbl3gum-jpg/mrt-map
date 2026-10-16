import type { Network } from "../data/types";
import { lines as defaultLines } from "../data/lines";
export function validateNetwork(n: Network): string[] {
  const errors: string[] = [];
  const lines = n.lines ?? defaultLines;
  const definedLines = new Set<string>();
  const patterns = new Map<string, RegExp>();
  for (const line of lines) {
    if (definedLines.has(line.id)) errors.push(`Duplicate line ID: ${line.id}`);
    definedLines.add(line.id);
    try {
      patterns.set(
        line.id,
        new RegExp(line.codePattern ?? `^${line.id}\\d{2}[A-Z]?$`),
      );
    } catch {
      errors.push(`Invalid code pattern: ${line.id}`);
    }
    if (
      n.operators &&
      line.operatorId &&
      !n.operators.some((o) => o.id === line.operatorId)
    )
      errors.push(`Unknown operator: ${line.operatorId}`);
    if (
      n.systems &&
      line.systemId &&
      !n.systems.some((s) => s.id === line.systemId)
    )
      errors.push(`Unknown transport system: ${line.systemId}`);
  }
  const ids = new Set<string>();
  const codes = new Set<string>();
  if (n.schemaVersion !== 1) errors.push("Unsupported schema version");
  if (!["illustrative", "imported"].includes(n.status))
    errors.push("Unknown provenance status");
  for (const s of n.stations) {
    if (ids.has(s.id) || !s.id)
      errors.push(`Duplicate/empty station ID: ${s.id}`);
    ids.add(s.id);
    if (s.operational === false)
      errors.push(`Non-operational station in selectable network: ${s.id}`);
    if (!s.nameEn || !s.nameZh) errors.push(`Missing bilingual name: ${s.id}`);
    if (!Object.keys(s.codes).length) errors.push(`Missing codes: ${s.id}`);
    for (const [line, code] of Object.entries(s.codes)) {
      if (!lines.some((l) => l.id === line) || !patterns.get(line)?.test(code!))
        errors.push(`Invalid code: ${code}`);
      if (codes.has(`${line}:${code}`)) errors.push(`Duplicate code: ${code}`);
      codes.add(`${line}:${code}`);
    }
    const p = n.layout[s.id];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
      errors.push(`Missing finite layout: ${s.id}`);
  }
  const routeIds = new Set<string>();
  for (const r of n.routes) {
    if (routeIds.has(r.id)) errors.push(`Duplicate route: ${r.id}`);
    routeIds.add(r.id);
    if (!lines.some((l) => l.id === r.line))
      errors.push(`Unknown line: ${r.line}`);
    if (r.stations.length < 2 || new Set(r.stations).size !== r.stations.length)
      errors.push(`Invalid sequence: ${r.id}`);
    for (const id of r.stations) {
      const s = n.stations.find((s) => s.id === id);
      if (!s || !s.codes[r.line])
        errors.push(`Unknown station/line membership: ${id} on ${r.id}`);
    }
  }
  for (const t of n.transfers)
    if (
      !ids.has(t.from) ||
      !ids.has(t.to) ||
      t.from === t.to ||
      t.kind !== "out-of-station"
    )
      errors.push("Invalid external transfer");
  if (
    n.status === "imported" &&
    (!n.sources.length ||
      n.sources.some(
        (s) =>
          !s.url.startsWith("https://") ||
          !/^\d{4}-\d{2}-\d{2}/.test(s.retrievedAt),
      ))
  )
    errors.push("Imported data requires dated HTTPS provenance");
  return errors;
}
export function searchStations(n: Network, q: string) {
  const term = q.trim().toLocaleLowerCase();
  const exactCodes = n.stations.filter((s) =>
    Object.values(s.codes).some((code) => code.toLocaleLowerCase() === term),
  );
  if (exactCodes.length) return exactCodes;
  return n.stations.filter((s) =>
    [s.nameEn, s.nameZh, ...Object.values(s.codes)].some((v) =>
      v?.toLocaleLowerCase().includes(term),
    ),
  );
}
export function approvedChoice(id: string | null, available: string[]) {
  return id !== null && available.includes(id);
}

/** Compare against a separately normalized official reference, preserving sequence order. */
export function compareTopology(actual: Network, reference: Network): string[] {
  const errors: string[] = [];
  const canonical = (n: Network) =>
    n.stations
      .map(
        (s) =>
          `${s.id}:${Object.entries(s.codes)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(",")}`,
      )
      .sort();
  if (
    JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(reference))
  )
    errors.push(
      "Physical station identities or line codes differ from reference",
    );
  const routes = (n: Network) =>
    n.routes.map((r) => `${r.id}:${r.line}:${r.stations.join(">")}`).sort();
  if (JSON.stringify(routes(actual)) !== JSON.stringify(routes(reference)))
    errors.push("Route ordering, branch or membership differs from reference");
  const transfers = (n: Network) =>
    n.transfers.map((t) => [t.from, t.to].sort().join("<>")).sort();
  if (
    JSON.stringify(transfers(actual)) !== JSON.stringify(transfers(reference))
  )
    errors.push("Out-of-station connections differ from reference");
  return errors;
}
