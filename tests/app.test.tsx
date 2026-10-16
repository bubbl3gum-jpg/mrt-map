import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../src/App";
import { fixture } from "../src/data/fixture";
import {
  compareTopology,
  approvedChoice,
  searchStations,
  validateNetwork,
} from "../src/utils/station-validation";
afterEach(cleanup);
beforeEach(() => localStorage.clear());
const station = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name} [\u3400-\u9fff]`) });
describe("handoff interaction", () => {
  it("selects multiple stations and persists after remount", () => {
    const view = render(<App />);
    fireEvent.click(station("Taipei Main Station"));
    fireEvent.click(station("Zhongshan"));
    expect(
      JSON.parse(localStorage.getItem("hustlen-mrt-demo-v1")!).available,
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Save availability/ }));
    view.unmount();
    render(<App />);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2);
  });
  it("permits one approved borrower selection and blocks grey stations", () => {
    render(<App />);
    fireEvent.click(station("Taipei Main Station"));
    fireEvent.click(station("Zhongshan"));
    fireEvent.click(screen.getByRole("button", { name: "Borrower mode" }));
    const disabled = station("Dongmen");
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(disabled);
    const confirm = screen.getByRole("button", { name: /Confirm handoff/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(station("Taipei Main Station"));
    fireEvent.click(station("Zhongshan"));
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.click(confirm);
    expect(screen.getByRole("status").textContent).toContain("Zhongshan");
  });
  it("clears availability and invalidates borrower selection", () => {
    render(<App />);
    fireEvent.click(station("Taipei Main Station"));
    fireEvent.click(screen.getByRole("button", { name: "Borrower mode" }));
    fireEvent.click(station("Taipei Main Station"));
    fireEvent.click(screen.getByRole("button", { name: "Owner mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    fireEvent.click(screen.getByRole("button", { name: "Borrower mode" }));
    expect(screen.getByText("No handoff stations yet.")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /Confirm handoff/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("selects and deselects lines, supports search and reset", () => {
    render(<App />);
    fireEvent.click(screen.getByTitle("Select all loaded Wenhu stations"));
    expect(
      JSON.parse(localStorage.getItem("hustlen-mrt-demo-v1")!).available,
    ).toHaveLength(24);
    fireEvent.change(screen.getByRole("textbox", { name: "Search stations" }), {
      target: { value: "BL12" },
    });
    expect(
      within(
        document.querySelector(".search-results") as HTMLElement,
      ).getByRole("button", { name: /Taipei Main Station/ }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /Playground controls/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reset application/ }));
    expect(
      JSON.parse(localStorage.getItem("hustlen-mrt-demo-v1")!).available,
    ).toEqual([]);
  });
});
describe("data checks", () => {
  it("searches English, Chinese, and codes", () => {
    for (const q of ["taipei main", "台北車站", "r10"])
      expect(searchStations(fixture, q)[0].id).toBe("taipei-main");
  });
  it("uses one canonical physical identity across lines", () => {
    expect(
      fixture.stations.filter(
        (s) => s.codes.R === "R10" || s.codes.BL === "BL12",
      ),
    ).toHaveLength(1);
    expect(fixture.transfers[0].from).not.toBe(fixture.transfers[0].to);
  });
  it("validates fixture structure and rejects duplicates, sequence errors and bad transfers", () => {
    expect(validateNetwork(fixture)).toEqual([]);
    const n = structuredClone(fixture);
    n.stations.push(n.stations[0]);
    n.routes[0].stations.push("missing");
    n.transfers.push({
      from: "missing",
      to: "missing",
      kind: "out-of-station",
    });
    expect(validateNetwork(n).length).toBeGreaterThanOrEqual(4);
  });
  it("never approves unavailable choices", () => {
    expect(approvedChoice("x", [])).toBe(false);
    expect(approvedChoice(null, ["x"])).toBe(false);
  });
});

it("detects reordered branches against a separate reference", () => {
  const changed = structuredClone(fixture);
  changed.routes[0].stations.reverse();
  expect(compareTopology(changed, fixture)).toContain(
    "Route ordering, branch or membership differs from reference",
  );
});

import catalogue from '../data-sources/official-station-catalogue.json';
it('matches every demo code/name to the retrieved official catalogue',()=>{
 for(const s of fixture.stations)for(const code of Object.values(s.codes)){
  const record=catalogue.records.find(r=>r.code===code);
  expect(record,`Official code ${code}`).toBeTruthy();
  expect(s.nameZh.startsWith(record!.nameZh)).toBe(true);
 }
});
