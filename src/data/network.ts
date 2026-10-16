import official from "./official-network.json";
import type { Network } from "./types";
// This file is produced by import:official and checked against raw sources by validate:official.
// Keep fixture.ts only as a legacy compatibility/test fixture; never silently fall back to it.
export const network = official as unknown as Network;
