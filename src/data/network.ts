import type { Network } from "./types";
import { fixture } from "./fixture";
const imported = import.meta.glob("./official-network.json", {
  eager: true,
  import: "default",
});
export const network =
  (Object.values(imported)[0] as Network | undefined) ?? fixture;
