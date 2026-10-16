import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Search,
  Check,
  Layers,
  SlidersHorizontal,
  Info,
  X,
  Bookmark,
  TrainFront,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { network } from "./data/network";
import { lines as fallbackLines } from "./data/lines";
const lines = network.lines ?? fallbackLines;
import {
  approvedChoice,
  searchStations,
  validateNetwork,
} from "./utils/station-validation";
import { MRTMap } from "./components/MRTMap";
const key = "hustlen-mrt-demo-v1";
type Saved = {
  available: string[];
  choice: string | null;
  mode: "owner" | "borrower";
};
export function readSaved(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    const available = Array.isArray(s.available)
      ? s.available.filter((id: unknown) =>
          network.stations.some((st) => st.id === id),
        )
      : [];
    return {
      available,
      choice: approvedChoice(s.choice, available) ? s.choice : null,
      mode: s.mode === "borrower" ? "borrower" : "owner",
    };
  } catch {
    return { available: [], choice: null, mode: "owner" };
  }
}
export default function App() {
  const [initial] = useState(readSaved);
  const [available, setAvailable] = useState<string[]>(initial.available);
  const [choice, setChoice] = useState<string | null>(initial.choice);
  const [mode, setMode] = useState(initial.mode);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState(false);
  const [dev, setDev] = useState(false);
  const [visibleSystems, setVisibleSystems] = useState(
    network.systems?.map((s) => s.id) ?? [],
  );
  const borrower = mode === "borrower";
  const errors = validateNetwork(network);
  const selected = network.stations.filter((s) => available.includes(s.id));
  const station = network.stations.find((s) => s.id === choice);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify({ available, choice, mode }));
  }, [available, choice, mode]);
  function update(ids: string[]) {
    setAvailable(ids);
    setSaved(false);
    setSummary(false);
    if (!approvedChoice(choice, ids)) setChoice(null);
  }
  function select(id: string) {
    if (borrower) {
      if (available.includes(id)) {
        setChoice(id);
        setSummary(false);
      }
    } else
      update(
        available.includes(id)
          ? available.filter((x) => x !== id)
          : [...available, id],
      );
  }
  function reset() {
    update([]);
    setChoice(null);
    setMode("owner");
    setQuery("");
    setFocus(null);
    setVisibleSystems(network.systems?.map((s) => s.id) ?? []);
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="./">
          hustlen<span>’</span>
          <span className="brand-dot">•</span>
        </a>
        <span className="header-divider" />
        <span className="lab-label">THE PLAYGROUND</span>
        <span className="experiment-pill">Experiment 001</span>
        <a
          className="header-link"
          href="https://web.metro.taipei/pages2026/WebRouteMap"
          target="_blank"
          rel="noreferrer"
        >
          Official MRT map <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">
              <span /> BUILT FOR THE IN-BETWEEN
            </div>
            <h1>Good gear. Easy handoffs.</h1>
            <p>
              Find a meeting point that works for both of you. Explore MRT
              station handoffs.
            </p>
          </div>
          <div className="prototype">
            <span className="dot" /> Standalone prototype{" "}
            <span>No bookings. Just possibilities.</span>
          </div>
        </div>
        <div className="workspace">
          <section className="map-card">
            <div className="map-header">
              <div className="map-title">
                <div className="icon-box">
                  <TrainFront size={19} />
                </div>
                <div>
                  <h2>Taipei MRT network</h2>
                  <span>台北捷運 · Your next meeting point</span>
                </div>
              </div>
              <span className="region-tag">TAIPEI & NEW TAIPEI</span>
            </div>
            <div className="map-filter">
              <div className="search-wrap">
                <Search size={17} />
                <input
                  aria-label="Search stations"
                  placeholder="Search station name or code…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
                {query && (
                  <div className="search-results">
                    {searchStations(network, query).length ? (
                      searchStations(network, query).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setFocus(s.id);
                            setFocusRevision((n) => n + 1);
                            setQuery("");
                          }}
                        >
                          <span>
                            {s.nameEn}
                            <small>{s.nameZh}</small>
                          </span>
                          <span>{Object.values(s.codes).join(" / ")}</span>
                        </button>
                      ))
                    ) : (
                      <p>No matching stations</p>
                    )}
                  </div>
                )}
              </div>
              <span className="station-count">
                <Layers size={14} /> {network.stations.length} stations
              </span>
            </div>
            <div className="data-notice">
              <Info size={14} />
              <span>
                {network.status === "illustrative"
                  ? "Illustrative subset — complete official network not imported. Topology and layout are not verified."
                  : "Official route data · October 2026 · Schematic layout under review."}
              </span>
            </div>
            <MRTMap
              network={network}
              available={available}
              choice={choice}
              borrower={borrower}
              onSelect={select}
              focus={focus}
              focusRevision={focusRevision}
              onResetView={() => setFocus(null)}
              visibleSystemIds={network.systems ? visibleSystems : undefined}
            />
            <div className="line-legend">
              {lines.map((l) => (
                <span key={l.id}>
                  <i style={{ background: l.color }} />
                  {l.id}
                  <em>{l.name}</em>
                </span>
              ))}
            </div>
            <div className="map-footer">
              <span>
                <i className="legend-circle" /> Station
              </span>
              <span>
                <i className="legend-circle transfer" /> Interchange
              </span>
              <span>
                <i className="legend-circle chosen" /> Available for handoff
              </span>
              <span className="external-legend">- - Walking transfer</span>
            </div>
          </section>
          <aside>
            <div className="selection-panel">
              <div className="panel-top">
                <span className="eyebrow">MAKE IT A MEETING POINT</span>
                <div className="mode-switch">
                  <button
                    className={!borrower ? "active" : ""}
                    onClick={() => {
                      setMode("owner");
                      setSummary(false);
                    }}
                  >
                    Owner mode
                  </button>
                  <button
                    className={borrower ? "active" : ""}
                    onClick={() => {
                      setMode("borrower");
                      setSummary(false);
                    }}
                  >
                    Borrower mode
                  </button>
                </div>
                <h2>
                  {borrower ? "Pick your handoff." : "Where can you meet?"}
                </h2>
                <p>
                  {borrower
                    ? "Choose one of the owner’s available stations to collect your gear."
                    : "Choose the stations where you’re happy to hand off your gear."}
                </p>
              </div>
              {!borrower ? (
                <>
                  <div className="panel-section">
                    <div className="section-label">
                      SELECT BY LINE <span>Quick select</span>
                    </div>
                    <div className="line-buttons">
                      {lines.map((l) => (
                        <button
                          key={l.id}
                          title={`Select all loaded ${l.name} stations`}
                          onClick={() =>
                            update([
                              ...new Set([
                                ...available,
                                ...network.stations
                                  .filter((s) => s.codes[l.id])
                                  .map((s) => s.id),
                              ]),
                            ])
                          }
                        >
                          <i style={{ background: l.color }}>{l.id}</i>
                          {l.name}
                          <span>+</span>
                        </button>
                      ))}
                    </div>
                    <small className="muted">
                      Selects every station loaded for that line.
                    </small>
                  </div>
                  <div className="panel-section stations-section">
                    <div className="section-label">
                      YOUR HANDOFF STATIONS <b>{selected.length}</b>
                      {selected.length > 0 && (
                        <button onClick={() => update([])}>Clear all</button>
                      )}
                    </div>
                    <div className="selected-list">
                      {selected.length ? (
                        selected.map((s) => (
                          <div className="station-row" key={s.id}>
                            <span className="pin-icon">
                              <MapPin size={17} />
                            </span>
                            <span>
                              <strong>{s.nameEn}</strong>
                              <small>
                                {s.nameZh}{" "}
                                <em>{Object.values(s.codes).join(" · ")}</em>
                              </small>
                            </span>
                            <button
                              aria-label={`Remove ${s.nameEn}`}
                              onClick={() =>
                                update(available.filter((id) => id !== s.id))
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="empty">
                          <MapPin size={26} />
                          <strong>A good place to start.</strong>
                          <p>
                            Click a station on the map or select a line to add
                            handoff spots.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="panel-action">
                    <button
                      className="primary"
                      onClick={() => {
                        localStorage.setItem(
                          key,
                          JSON.stringify({ available, choice, mode }),
                        );
                        setSaved(true);
                      }}
                    >
                      {saved ? <Check size={17} /> : <Bookmark size={17} />}{" "}
                      {saved ? "Availability saved" : "Save availability"}
                      <ArrowRight size={17} />
                    </button>
                    <p>
                      <span className="dot" /> Saved on this device. No account
                      needed.
                    </p>
                  </div>
                </>
              ) : (
                <div className="borrower-body">
                  <div className="availability-count">
                    <MapPin size={20} />
                    <strong>{available.length}</strong> stations available
                  </div>
                  {station && approvedChoice(choice, available) ? (
                    <div className="chosen-detail">
                      <span className="eyebrow">YOUR MEETING POINT</span>
                      <h3>{station.nameEn}</h3>
                      <p>{station.nameZh}</p>
                      <div className="code-pills">
                        {Object.entries(station.codes).map(([line, code]) => (
                          <span
                            key={line}
                            style={{
                              background: lines.find((l) => l.id === line)
                                ?.color,
                            }}
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty">
                      <MapPin size={28} />
                      <strong>
                        {available.length
                          ? "Meet somewhere convenient."
                          : "No handoff stations yet."}
                      </strong>
                      <p>
                        {available.length
                          ? "Click a highlighted station on the map. Grey stations are unavailable."
                          : "Switch to Owner mode to add availability, or load the sample below."}
                      </p>
                    </div>
                  )}
                  <button
                    className="primary"
                    disabled={!approvedChoice(choice, available)}
                    onClick={() => setSummary(true)}
                  >
                    Confirm handoff station <ArrowRight size={17} />
                  </button>
                  {summary && station && approvedChoice(choice, available) && (
                    <div className="summary" role="status">
                      <Check size={18} />
                      <div>
                        <strong>Handoff preview confirmed</strong>
                        <p>
                          Meet at {station.nameEn} · {station.nameZh}. This is a
                          simulation; no booking was created.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="tip-card">
              <span>↗</span>
              <div>
                <strong>A little flexibility goes a long way.</strong>
                <p>
                  More meeting points mean more chances to connect with someone
                  nearby.
                </p>
              </div>
            </div>
          </aside>
        </div>
        <section className="developer">
          <button
            className="developer-heading"
            aria-expanded={dev}
            onClick={() => setDev(!dev)}
          >
            <SlidersHorizontal size={17} />
            <strong>Playground controls</strong>
            <span>Try it out. Nothing here touches a real booking.</span>
            <ChevronDown
              size={17}
              style={{ transform: dev ? "rotate(180deg)" : undefined }}
            />
          </button>
          {dev && (
            <div className="developer-body">
              <div className="system-filters">
                {network.systems?.map((system) => (
                  <label key={system.id}>
                    <input
                      type="checkbox"
                      checked={visibleSystems.includes(system.id)}
                      onChange={(e) =>
                        setVisibleSystems((ids) =>
                          e.target.checked
                            ? [...ids, system.id]
                            : ids.filter((id) => id !== system.id),
                        )
                      }
                    />
                    {system.name} network
                  </label>
                ))}
              </div>
              <div className="dev-actions">
                <button
                  onClick={() => {
                    update(
                      network.stations
                        .filter((s) => Object.keys(s.codes).length > 1)
                        .slice(0, 5)
                        .map((s) => s.id),
                    );
                  }}
                >
                  Load sample availability
                </button>
                <button
                  onClick={() =>
                    borrower ? (setChoice(null), setSummary(false)) : update([])
                  }
                >
                  Clear selected stations
                </button>
                <button onClick={reset}>
                  <RotateCcw size={13} /> Reset application
                </button>
              </div>
              <div className="dev-data">
                <p>
                  <strong>Selected physical IDs</strong>
                  <code>{JSON.stringify(borrower ? choice : available)}</code>
                </p>
                <p>
                  <strong>Data & validation</strong>
                  {network.status} ·{" "}
                  {errors.length
                    ? errors.join(", ")
                    : "Structural checks passed"}{" "}
                  ·{" "}
                  {network.validation?.topology === "source-compared"
                    ? "Route sequences compared with retained official sources. Layout remains schematic."
                    : "Official topology unverified."}{" "}
                  {network.sources.length
                    ? network.sources
                        .map((s) => `${s.url} (${s.retrievedAt})`)
                        .join("; ")
                    : "Official code/name catalogue saved in data-sources; full network not imported. See SOURCE_REPORT.md and DATA_IMPORT.md."}
                </p>
              </div>
            </div>
          )}
        </section>
        <footer>
          <span>
            hustlen’ <em>Less friction. More possibility.</em>
          </span>
          <span>
            MRT handoff playground <i> / </i> Local-only experiment
          </span>
        </footer>
      </main>
    </>
  );
}
