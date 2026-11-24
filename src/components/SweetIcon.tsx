import { useId } from "react";
import type { SweetId } from "@/lib/types";

/** Riso-print sweets: flat ink, a halftone shadow, an off-register outline. 32×32. */
export function SweetIcon({ id, size = 24, ghost = false, className }: { id: SweetId; size?: number; ghost?: boolean; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const dots = `ht-${uid}`;
  const shape = SHAPE[id];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} style={ghost ? { opacity: 0.45 } : undefined} aria-hidden>
      <defs>
        <pattern id={dots} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="1.3" cy="1.3" r="0.75" fill={INK[id]} />
        </pattern>
        <clipPath id={`${dots}-c`}>{shape}</clipPath>
      </defs>
      <g transform="translate(1.2 1)" opacity="0.9">{wrap(shape, "none", "var(--ink-blue, #1f3fbf)", 1.1)}</g>
      {wrap(shape, FILL[id], "none", 0)}
      <g clipPath={`url(#${dots}-c)`}>
        <rect x="0" y="0" width="32" height="32" fill={`url(#${dots})`} mask={undefined} transform="translate(9 9)" opacity="0.85" />
      </g>
      {DETAIL[id]}
    </svg>
  );
}

const wrap = (shape: React.ReactElement, fill: string, stroke: string, w: number) => (
  <g fill={fill} stroke={stroke} strokeWidth={w} strokeLinejoin="round">{shape}</g>
);

const FILL: Record<SweetId, string> = { kaju: "#ece6db", jamun: "#6b2309", laddoo: "#f7a51e", rasgulla: "#ffffff", jalebi: "#f28a14", choco: "#4a2412" };
const INK: Record<SweetId, string> = { kaju: "#b9a77f", jamun: "#2a0a02", laddoo: "#c96d05", rasgulla: "#dccfb2", jalebi: "#b85700", choco: "#24100a" };

const SHAPE: Record<SweetId, React.ReactElement> = {
  kaju: <path d="M16 6 L29 16 L16 26 L3 16 Z" />,
  jamun: <ellipse cx="16" cy="16.5" rx="12" ry="11" />,
  laddoo: <circle cx="16" cy="16.5" r="11.5" />,
  rasgulla: <circle cx="16" cy="16" r="11" />,
  jalebi: <path d="M16 15.5 m-1.6 0 a1.6 1.6 0 1 1 3.2 0 a3.6 3.6 0 1 1 -7.2 0 a6 6 0 1 1 12 0 a8.6 8.6 0 1 1 -17.2 0" fill="none" />,
  choco: <rect x="4" y="8" width="24" height="16" rx="2" />,
};

const DETAIL: Partial<Record<SweetId, React.ReactNode>> = {
  kaju: <path d="M9 14 l4 1 M17 10 l3 2.5 M18 18 l4 -1.5 M11 18 l3 -1" stroke="#9aa0ab" strokeWidth="0.7" />,
  jamun: <ellipse cx="11.5" cy="11.5" rx="3" ry="1.8" fill="#fff" opacity="0.45" transform="rotate(-30 11.5 11.5)" />,
  laddoo: <rect x="15" y="4.4" width="5" height="1.8" rx="0.9" fill="#58a83c" transform="rotate(-20 17 5)" />,
  rasgulla: <ellipse cx="12" cy="11" rx="3" ry="1.8" fill="#f3e7cd" />,
  jalebi: <path d="M16 15.5 m-1.6 0 a1.6 1.6 0 1 1 3.2 0 a3.6 3.6 0 1 1 -7.2 0 a6 6 0 1 1 12 0 a8.6 8.6 0 1 1 -17.2 0" fill="none" stroke="#f28a14" strokeWidth="3.2" strokeLinecap="round" />,
  choco: <g stroke="#7a4428" strokeWidth="1"><path d="M10 8 v16 M16 8 v16 M22 8 v16 M4 16 h24" /></g>,
};
