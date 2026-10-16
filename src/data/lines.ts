import type { LineId } from "./types";
export const lines: { id: LineId; name: string; zh: string; color: string }[] =
  [
    { id: "BR", name: "Wenhu", zh: "文湖線", color: "#b08348" },
    { id: "R", name: "Tamsui–Xinyi", zh: "淡水信義線", color: "#e14c55" },
    { id: "G", name: "Songshan–Xindian", zh: "松山新店線", color: "#299c79" },
    { id: "O", name: "Zhonghe–Xinlu", zh: "中和新蘆線", color: "#f3a533" },
    { id: "BL", name: "Bannan", zh: "板南線", color: "#438cce" },
    { id: "Y", name: "Circular", zh: "環狀線", color: "#d3b833" },
  ];
