import { useId } from "react";
import type { SweetId } from "@/lib/types";

/** Flat-but-glossy mithai icons. 32×32 viewBox, drawn by hand. */
export function SweetIcon({ id, size = 24, ghost = false, className }: { id: SweetId; size?: number; ghost?: boolean; className?: string }) {
  const g = `sw-${id}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} style={ghost ? { opacity: 0.5 } : undefined} aria-hidden>
      <defs>
        <radialGradient id={`${g}-a`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={LIGHT[id]} />
          <stop offset="1" stopColor={DARK[id]} />
        </radialGradient>
        <linearGradient id={`${g}-v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#c9ccd3" />
          <stop offset="0.7" stopColor="#f4f4f6" />
          <stop offset="1" stopColor="#a9adb6" />
        </linearGradient>
      </defs>
      {SHAPES[id](g)}
    </svg>
  );
}

const LIGHT: Record<SweetId, string> = { kaju: "#f3e7cf", jamun: "#9a4419", laddoo: "#ffcf6b", rasgulla: "#ffffff", jalebi: "#ffb347", choco: "#6e4029", chai: "#d07a4c" };
const DARK: Record<SweetId, string> = { kaju: "#d9c39c", jamun: "#2f0f04", laddoo: "#d9801a", rasgulla: "#e4dccb", jalebi: "#d8650a", choco: "#2e170b", chai: "#8f3f1f" };

const gloss = <ellipse cx="11.5" cy="10" rx="4.2" ry="2.6" fill="#fff" opacity="0.55" transform="rotate(-28 11.5 10)" />;

const SHAPES: Record<SweetId, (g: string) => React.ReactNode> = {
  kaju: (g) => (
    <>
      <path d="M16 6.5 L28.5 16 L16 25.5 L3.5 16 Z" fill={`url(#${g}-a)`} />
      <path d="M16 5 L28.5 14.5 L16 24 L3.5 14.5 Z" fill={`url(#${g}-v)`} />
      <path d="M10 13 l4 2 M17 10 l3 3 M18 17 l4 -1 M11 16.5 l3 -1" stroke="#9097a3" strokeWidth="0.6" opacity="0.6" />
    </>
  ),
  jamun: (g) => (
    <>
      <ellipse cx="16" cy="17" rx="11.5" ry="10.5" fill={`url(#${g}-a)`} />
      {gloss}
      <ellipse cx="21" cy="22" rx="2" ry="1" fill="#fff" opacity="0.18" />
    </>
  ),
  laddoo: (g) => (
    <>
      <circle cx="16" cy="16.5" r="11" fill={`url(#${g}-a)`} />
      {[[10, 12], [14, 9], [19, 11], [22, 15], [12, 17], [17, 15], [20, 20], [14, 21], [9, 19], [24, 19], [17, 24]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="#ffe2a0" opacity="0.7" />
      ))}
      <rect x="15" y="5.2" width="5" height="1.8" rx="0.9" fill="#8db36b" transform="rotate(-20 17 6)" />
    </>
  ),
  rasgulla: (g) => (
    <>
      <ellipse cx="16" cy="25.5" rx="11" ry="2.4" fill="#e9c98f" opacity="0.5" />
      <circle cx="16" cy="15.5" r="10.5" fill={`url(#${g}-a)`} stroke="#e2d9c5" strokeWidth="0.6" />
      {gloss}
    </>
  ),
  jalebi: () => (
    <path
      d="M16 16 m0 -1.5 a1.5 1.5 0 1 1 -1.6 1.7 a3.6 3.6 0 1 1 4.6 3.1 a6 6 0 1 1 -7.9 -7.4 a8.4 8.4 0 1 1 9 14.6 l-2 -2.5"
      fill="none"
      stroke="#e87708"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "drop-shadow(0 0.6px 0 #b04f00)" }}
    />
  ),
  choco: (g) => (
    <>
      <rect x="4" y="8" width="24" height="16" rx="2.4" fill={`url(#${g}-a)`} />
      {[0, 1, 2, 3].map((i) => [0, 1].map((j) => <rect key={`${i}${j}`} x={5.6 + i * 5.6} y={9.6 + j * 6.8} width="4.4" height="5.6" rx="1" fill="#7a4a30" opacity="0.55" />))}
    </>
  ),
  chai: (g) => (
    <>
      <path d="M12 6 q-1.5 2 0 4 M16 4.5 q-1.5 2 0 4 M20 6 q-1.5 2 0 4" stroke="#b9b2a6" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M6.5 12 h19 l-2.6 13.2 a2 2 0 0 1 -2 1.6 h-9.8 a2 2 0 0 1 -2 -1.6 Z" fill={`url(#${g}-a)`} />
      <ellipse cx="16" cy="12.2" rx="9.5" ry="2" fill="#c58a59" stroke="#8f3f1f" strokeWidth="0.8" />
    </>
  ),
};
