"use client";
/** Riso ink pairs. bg = the paper the face is printed on, ink = the dots, glow = the misprint layer + sugar glow. */
export type ThemeId = "box" | "kesar" | "pista" | "night" | "paper";
export const THEMES: Record<ThemeId, { label: string; bg: string; ink: string; glow: string; text: string }> = {
  box: { label: "Sweet box", bg: "#ff4fa0", ink: "#1f3fbf", glow: "#ffe14d", text: "#fff6fb" },
  kesar: { label: "Kesar", bg: "#ff7a1a", ink: "#2b1a6b", glow: "#ffe14d", text: "#fff4e6" },
  pista: { label: "Pista", bg: "#a6dd7f", ink: "#173a22", glow: "#fff3a0", text: "#f7ffe9" },
  night: { label: "Midnight", bg: "#151a3f", ink: "#ffe14d", glow: "#ff4fa0", text: "#fff7d6" },
  paper: { label: "Newsprint", bg: "#f3eee3", ink: "#17130f", glow: "#ff4fa0", text: "#17130f" },
};
export const SHAPES = ["Round", "Square", "Kaju", "Heart", "Star"] as const;
