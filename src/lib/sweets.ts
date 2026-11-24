import type { SweetId } from "./types";

export interface Sweet {
  id: SweetId;
  name: string;
  points: number;
  kcal: number; // per serving, rounded (IFCT / common recipes)
  color: string;
  quip: string;
}

export const SWEETS: Sweet[] = [
  { id: "kaju", name: "Kaju katli", points: 8, kcal: 520, color: "#E9DCC4", quip: "Silver foil. Now we're talking." },
  { id: "jamun", name: "Gulab jamun", points: 5, kcal: 300, color: "#5B2410", quip: "Warm, please." },
  { id: "laddoo", name: "Laddoo", points: 4, kcal: 190, color: "#F2A12E", quip: "Boondi or besan, both count." },
  { id: "rasgulla", name: "Rasgulla", points: 4, kcal: 180, color: "#F7F3EA", quip: "Squeeze the syrup first." },
  { id: "jalebi", name: "Jalebi", points: 3, kcal: 150, color: "#F07D12", quip: "Crispy, not soggy." },
  { id: "choco", name: "Chocolate", points: 2, kcal: 230, color: "#4A2A1A", quip: "Dark. Fine." },
  { id: "chai", name: "Cutting chai", points: 1, kcal: 90, color: "#B4562E", quip: "Not a sweet. Still accepted." },
];

export const SWEET: Record<SweetId, Sweet> = Object.fromEntries(SWEETS.map((s) => [s.id, s])) as Record<SweetId, Sweet>;

export const isSweet = (x: unknown): x is SweetId => typeof x === "string" && x in SWEET;

export function parseSweets(v: unknown): [SweetId, number][] {
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, unknown>)
    .filter(([k, n]) => isSweet(k) && Number.isInteger(n) && (n as number) > 0)
    .map(([k, n]) => [k as SweetId, Math.min(20, n as number)]);
}

export function sweetLine(list: [SweetId, number][]) {
  return list.length ? list.map(([s, n]) => `${n}× ${SWEET[s].name}`).join(", ") : "no sweets";
}

