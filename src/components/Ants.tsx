"use client";
import { useEffect, useRef, useState } from "react";

/** Ants marching around a token that has (or had) sweets on it. CSS offset-path, no JS per frame. */
export default function Ants({ count, note }: { count: number; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState("");
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight, r = 14;
      setPath(`path("M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z")`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = Math.min(16, count);
  return (
    <div className="ants" ref={ref} aria-hidden>
      {path &&
        Array.from({ length: n }, (_, i) => {
          const dur = 26 + ((i * 7) % 11);
          return (
            <span
              key={i}
              className="ant"
              style={{
                offsetPath: path,
                animationDuration: `${dur}s`,
                animationDelay: `${-(i / n) * dur - (i % 3)}s`,
                animationDirection: i % 4 === 3 ? "reverse" : "normal",
              }}
            >
              <svg width="12" height="8" viewBox="0 0 12 8">
                <g fill="#2a1a10">
                  <ellipse cx="2.2" cy="4" rx="2" ry="1.6" />
                  <ellipse cx="5.6" cy="4" rx="1.4" ry="1.1" />
                  <ellipse cx="9" cy="4" rx="1.8" ry="1.5" />
                </g>
                <g className="legs" stroke="#2a1a10" strokeWidth="0.7" strokeLinecap="round">
                  <path d="M4.6 4 L3.2 0.6 M4.6 4 L3.2 7.4 M5.8 4 L6 0.4 M5.8 4 L6 7.6 M6.8 4 L8.4 0.8 M6.8 4 L8.4 7.2" />
                </g>
                <path d="M10.6 3 L12 1.4 M10.6 5 L12 6.6" stroke="#2a1a10" strokeWidth="0.5" />
              </svg>
            </span>
          );
        })}
      {note && <span className="ant-note">{note}</span>}
    </div>
  );
}
