"use client";
import { useEffect, useState } from "react";
import { bus, setCustom, subscribe } from "./bus";
import { ACCESSORIES } from "./dots/accessories";
import { SHAPES, THEMES, type ThemeId } from "./dots/theme";

/** The bar at the bottom: burn it off, dress him up, bribe him. Replaces a top menu. */
export default function Dock({ onAsk, onBurn, burning }: { onAsk: () => void; onBurn: () => void; burning: boolean }) {
  const [dress, setDress] = useState(false);
  return (
    <>
      <nav className="dock" aria-label="Actions">
        <button className="dock-btn" onClick={onBurn} disabled={burning}>
          <Ball /> <span>{burning ? "Heading…" : "Burn it off"}</span>
        </button>
        <button className="dock-btn" onClick={() => setDress((d) => !d)} aria-expanded={dress}>
          <span className="dock-ic" aria-hidden>✦</span> <span>Dress him up</span>
        </button>
        <button className="dock-cta" onClick={onAsk}>Bribe me <span aria-hidden>→</span></button>
      </nav>
      <Dress open={dress} onClose={() => setDress(false)} />
    </>
  );
}

function Ball() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden className="dock-ic">
      <circle cx="10" cy="10" r="8.5" fill="#fff" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.2 l3.1 2.3 -1.2 3.6 h-3.8 l-1.2 -3.6 Z" fill="currentColor" />
    </svg>
  );
}

function Dress({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [c, setC] = useState(bus.custom);
  useEffect(() => subscribe(() => setC({ ...bus.custom })), []);
  return (
    <aside className="dress" data-open={open ? "1" : "0"} aria-hidden={!open} aria-label="Dress him up">
      <div className="dress-head">
        <h2>Dress him up</h2>
        <button className="dress-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="dress-note">Only you see this.</p>

      <h3>Print</h3>
      <div className="swatches">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => (
          <button key={id} className="swatch" aria-pressed={c.theme === id} onClick={() => setCustom({ theme: id })} title={THEMES[id].label}>
            <span style={{ background: THEMES[id].bg }}><i style={{ background: THEMES[id].ink }} /><i style={{ background: THEMES[id].glow }} /></span>
            {THEMES[id].label}
          </button>
        ))}
      </div>

      <h3>Dots</h3>
      <div className="chips">
        {SHAPES.map((s, i) => (
          <button key={s} className="chip" aria-pressed={c.shape === i} onClick={() => setCustom({ shape: i })}>{s}</button>
        ))}
        <button className="chip" aria-pressed={c.bold} onClick={() => setCustom({ bold: !c.bold })}>Bold</button>
      </div>

      <h3>Wear</h3>
      <div className="chips">
        {ACCESSORIES.map((a) => (
          <button key={a.id} className="chip" aria-pressed={c.acc === a.id} onClick={() => setCustom({ acc: a.id })}>{a.label}</button>
        ))}
      </div>

      <button className="link-btn" onClick={() => setCustom({ theme: "box", shape: 0, acc: "none", bold: false })}>Reset</button>
    </aside>
  );
}
