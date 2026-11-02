"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export type BeadClubProps = {
  /** Plays a quiet demonstration on gallery cards. */
  loop?: boolean;
  /** Additional classes for the preview area. */
  className?: string;
};

type Bead = { x: number; y: number; color: string };
type BeadMaterial = "pressed" | "frosted" | "glitter";
type Artwork = { material: BeadMaterial; id: string; name: string; note: string; category: "Sweet things" | "Little friends"; background: string; beads: Bead[]; colors: string[] };
const PHONE_HEIGHT = 390 * 622 / 302;
const P = { pink: "#e7a9b1", rose: "#c97b8a", cream: "#fff1d8", white: "#f9f3e9", blue: "#a6c1d0", red: "#b93e48", dark: "#68343c", green: "#8baf83", leaf: "#547d60", yellow: "#efd07f", brown: "#a47659" };

// Original patterns, made from a bead grid rather than flattened pictures.
// Every occupied cell is a separate bead and can be replayed in placement order.
function makePattern(id: string): Bead[] {
  const cells = new Map<string, Bead>();
  const dot = (x: number, y: number, color: string) => cells.set(`${x},${y}`, { x, y, color });
  const oval = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) dot(x, y, color);
    }
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) dot(x + dx, y + dy, color);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i++) dot(Math.round(x1 + (x2 - x1) * i / steps), Math.round(y1 + (y2 - y1) * i / steps), color);
  };
  if (id === "cake") {
    oval(19, 35, 17, 5, P.pink);
    rect(5, 21, 29, 13, P.cream); oval(19, 32, 14, 5, P.cream);
    rect(5, 19, 29, 7, P.blue); oval(19, 25, 14, 4, P.blue);
    for (let x = 6; x < 34; x += 6) oval(x, 29, 3, 2, P.white);
    rect(5, 16, 29, 6, P.pink); oval(19, 17, 15, 5, P.white);
    for (let x = 6; x < 35; x += 5) oval(x, 20, 3, 3, P.pink);
    for (let x = 6; x < 35; x += 5) oval(x, 35, 3, 3, P.pink);
    for (const [x, y] of [[11, 13], [20, 10], [28, 14]]) {
      line(x, y - 2, x + 1, y - 8, P.dark); line(x + 1, y - 8, x + 3, y - 10, P.dark);
      oval(x, y, 3, 3, P.red); dot(x - 1, y - 1, P.rose);
    }
  } else if (id === "berry") {
    for (let y = 11; y < 35; y++) {
      const width = y < 17 ? 9 + (y - 11) * .6 : 13 - (y - 17) * .7;
      for (let x = 20 - width; x <= 20 + width; x++) dot(Math.round(x), y, x < 16 ? P.pink : P.red);
    }
    oval(15, 11, 7, 2, P.green); oval(25, 11, 7, 2, P.green); oval(20, 9, 2, 6, P.leaf);
    for (const [x, y] of [[12, 17], [21, 17], [28, 19], [16, 23], [24, 25], [20, 30], [11, 22]]) rect(x, y, 1, 2, P.cream);
  } else if (id === "bunny") {
    oval(13, 10, 4, 9, P.white); oval(26, 10, 4, 9, P.white);
    oval(13, 9, 1.5, 6, P.pink); oval(26, 9, 1.5, 6, P.pink);
    oval(20, 24, 13, 12, P.white); oval(13, 28, 3, 2, P.pink); oval(27, 28, 3, 2, P.pink);
    rect(14, 23, 2, 3, P.dark); rect(25, 23, 2, 3, P.dark); dot(20, 27, P.rose); dot(19, 29, P.dark); dot(21, 29, P.dark);
    rect(16, 35, 9, 2, P.blue); oval(15, 36, 4, 2, P.blue); oval(25, 36, 4, 2, P.blue);
  } else if (id === "flower") {
    line(20, 17, 20, 37, P.leaf); line(21, 17, 21, 37, P.green);
    oval(14, 29, 6, 2.5, P.green); oval(26, 33, 6, 2.5, P.leaf);
    for (let i = 0; i < 6; i++) oval(20 + Math.cos(i * Math.PI / 3) * 8, 15 + Math.sin(i * Math.PI / 3) * 8, 5, 5, i % 2 ? P.pink : P.rose);
    oval(20, 15, 5, 5, P.yellow); dot(18, 14, P.brown); dot(22, 14, P.brown); line(19, 17, 21, 17, P.brown);
  } else if (id === "pudding") {
    oval(20, 34, 17, 4, P.blue); oval(20, 33, 14, 3, P.white);
    for (let y = 15; y < 32; y++) { const w = 8 + (y - 15) * .35; rect(Math.round(20 - w), y, Math.round(w * 2), 1, P.yellow); }
    oval(20, 15, 8, 3, P.brown); rect(14, 17, 2, 5, P.brown); rect(23, 17, 2, 3, P.brown);
    oval(20, 11, 4, 2, P.white); oval(20, 8, 2, 2, P.red); line(21, 6, 23, 3, P.leaf);
    rect(15, 25, 1, 2, P.dark); rect(24, 25, 1, 2, P.dark); dot(20, 28, P.rose);
  } else {
    oval(11, 11, 5, 5, P.brown); oval(29, 11, 5, 5, P.brown); oval(11, 11, 2, 2, P.pink); oval(29, 11, 2, 2, P.pink);
    oval(20, 23, 14, 14, P.brown); oval(20, 28, 7, 5, P.cream);
    rect(13, 21, 2, 3, P.dark); rect(26, 21, 2, 3, P.dark); oval(20, 26, 2, 1, P.dark); line(20, 27, 20, 29, P.dark);
    oval(10, 27, 2, 1, P.pink); oval(30, 27, 2, 1, P.pink);
  }
  // Finish one color before picking up the next. Within each color, scatter
  // placements across the pattern instead of sweeping through horizontal rows.
  const colorGroups = new Map<string, Bead[]>();
  for (const bead of cells.values()) {
    const group = colorGroups.get(bead.color);
    if (group) group.push(bead);
    else colorGroups.set(bead.color, [bead]);
  }
  const placementOrder = (bead: Bead) => ((bead.x * 73856093) ^ (bead.y * 19349663)) >>> 0;
  return [...colorGroups.values()].flatMap(group =>
    group.sort((a, b) => placementOrder(a) - placementOrder(b) || a.y - b.y || a.x - b.x)
  );
}
const artworks: Artwork[] = [
  { id: "cake", name: "Cherry on top", note: "A little celebration", category: "Sweet things", background: "#efe5e3" },
  { id: "berry", name: "Berry sweet", note: "Freshly picked happiness", category: "Sweet things", background: "#e7ebdf" },
  { id: "bunny", name: "Somebunny", note: "Your pocket-sized friend", category: "Little friends", background: "#e5eaf0" },
  { id: "flower", name: "Hello, petal", note: "A flower that stays", category: "Little friends", background: "#eee5d9" },
  { id: "pudding", name: "Sweet little wobble", note: "Made for a slow afternoon", category: "Sweet things", background: "#e6e9ef" },
  { id: "bear", name: "Honey bear", note: "A very small hug", category: "Little friends", background: "#eadfd7" },
].map(item => { const beads = makePattern(item.id); return { ...item, material: (item.id === "cake" || item.id === "bunny" ? "pressed" : item.id === "pudding" || item.id === "bear" ? "glitter" : "frosted") as BeadMaterial, category: item.category as Artwork["category"], beads, colors: [...new Set(beads.map(bead => bead.color))] }; });

function BeadArt({ art, count = art.beads.length, animated = false }: { art: Artwork; count?: number; animated?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  const placed = art.beads.slice(0, count);
  const glitter = art.material === "glitter";
  // Overlapping cells fuse into one continuous surface. The material is lit
  // and textured once across the whole piece, never stamped onto each cell.
  // A separate silhouette mask keeps the gentle color bleed inside the piece.
  const cell = (bead: Bead) => `M${bead.x - .06} ${bead.y - .06}h1.12v1.12h-1.12Z`;
  const silhouette = placed.map(cell).join("");
  return <svg viewBox="0 0 40 42" role="img" aria-label={`${art.name} ${art.material} fused bead pattern`} className="bc-art" data-material={art.material}>
    <defs>
      <filter id={`${id}-edge`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation=".14" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -5.5" />
      </filter>
      <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x="-1" y="-1" width="42" height="44" style={{ maskType: "alpha" }}>
        <path d={silhouette} fill="#fff" filter={`url(#${id}-edge)`} />
      </mask>
      <filter id={`${id}-surface`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation=".14" result="melted" />
        <feTurbulence type="fractalNoise" baseFrequency={art.material === "pressed" ? "3.1 5.3" : "4.2"} numOctaves="3" seed="23" result="grain" />
        <feDiffuseLighting in="grain" surfaceScale=".16" diffuseConstant=".8" lightingColor="#fff" result="relief"><feDistantLight azimuth="225" elevation="50" /></feDiffuseLighting>
        <feComponentTransfer in="relief" result="softRelief"><feFuncA type="linear" slope=".13" /></feComponentTransfer>
        <feComposite in="softRelief" in2="melted" operator="in" result="texture" />
        <feBlend in="melted" in2="texture" mode="soft-light" result="pressed" />
        <feMorphology in="SourceAlpha" operator="erode" radius=".055" result="inside" />
        <feComposite in="SourceAlpha" in2="inside" operator="out" result="rim" />
        <feFlood floodColor="#fff" floodOpacity=".2" result="light" />
        <feComposite in="light" in2="rim" operator="in" result="lip" />
        <feMerge><feMergeNode in="pressed" /><feMergeNode in="lip" /></feMerge>
      </filter>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff" stopOpacity=".05" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#5c5149" stopOpacity=".04" /></linearGradient>
    </defs>
    <g className="bc-material-surface" mask={`url(#${id}-shape)`}>
      <g className="bc-fused-colors" filter={`url(#${id}-surface)`}>
        {placed.map(bead => <g key={`${bead.x}-${bead.y}`} data-bead-color={bead.color} className={animated ? "bc-bead-drop" : undefined} style={{ transformOrigin: `${bead.x + .5}px ${bead.y + .5}px` }}><path d={cell(bead)} fill={bead.color} /></g>)}
      </g>
      <path d={silhouette} fill={`url(#${id}-light)`} />
      {placed.map(bead => {
        const seed = ((bead.x * 73856093) ^ (bead.y * 19349663)) >>> 0;
        const x = bead.x + .13 + (seed % 71) / 100;
        const y = bead.y + .1 + ((seed >>> 6) % 76) / 100;
        if (glitter && seed % 5 === 0) return <path key={`${bead.x}-${bead.y}`} d={`M${x} ${y - .045}l.04 .04l-.035 .06l-.04 -.045Z`} fill="#fff" opacity=".65" />;
        if (seed % 19 === 0) return <circle key={`${bead.x}-${bead.y}`} cx={x} cy={y} r=".025" fill="#fff" opacity=".3" />;
        return null;
      })}
    </g>
  </svg>;
}

function Replay({ art, onBack, reduced }: { art: Artwork; onBack: () => void; reduced: boolean }) {
  const [progress, setProgress] = React.useState(reduced ? 1 : 0);
  const [wantsPlayback, setPlaying] = React.useState(!reduced);
  const playing = wantsPlayback && progress < 1;
  const backRef = React.useRef<HTMLButtonElement>(null);
  const statusId = React.useId();
  React.useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  React.useEffect(() => {
    if (!playing) return;
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (last && now - last < 40) { frame = requestAnimationFrame(tick); return; }
      const delta = last ? (now - last) / 8000 : 0;
      last = now;
      setProgress(value => Math.min(1, value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  return <motion.section className="bc-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .25 }} onKeyDown={event => { if (event.key === "Escape") onBack(); }} aria-label={`${art.name} replay`}>
    <div className="bc-detail-nav"><button ref={backRef} className="bc-icon" onClick={onBack} aria-label="Back to collection"><ArrowLeft size={21} /></button></div>
    <div className="bc-board"><BeadArt art={art} count={Math.floor(progress * art.beads.length)} animated={!reduced && playing} /></div>
    <div className="bc-detail-caption"><h2>{art.name}</h2>
    <div className="bc-playback">
      <button className="bc-play-button" aria-label="Play" aria-pressed={playing} aria-describedby={statusId} onClick={() => {
        if (progress >= 1) { setProgress(0); setPlaying(true); }
        else setPlaying(value => !value);
      }}>
        <svg className="bc-play-outline" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28.5" fill="none" stroke="#fff" strokeOpacity=".72" strokeWidth="1.5" /><circle className="bc-play-progress" cx="30" cy="30" r="28.5" fill="none" stroke="#3c5044" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} strokeLinecap="round" transform="rotate(-90 30 30)" /></svg>
        <svg className="bc-play-symbol" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.9l10.1 6.2a1 1 0 0 1 0 1.8L9.6 19.1c-.7.4-1.6-.1-1.6-.9Z" fill="currentColor" /></svg>
      </button>
      <span className="bc-sr-only" id={statusId} role="status">{progress >= 1 ? "Pattern complete." : playing ? "Playing pattern animation." : "Animation paused."}</span>
    </div></div>
  </motion.section>;
}

// Same 280 × 600 screen, 7px bezel, 4px band and 44px screen radius as
// UI Walkthrough's IPhoneFrame. A single width unit keeps every radius aligned.
function SilverIPhoneFrame() {
  return <div className="bc-silver-frame" aria-hidden="true">
    <span className="bc-side bc-side-action" /><span className="bc-side bc-side-up" /><span className="bc-side bc-side-down" /><span className="bc-side bc-side-power" />
    <span className="bc-frame-band" /><span className="bc-frame-bezel" />
  </div>;
}

function LittleFlower() {
  const petals = [[3, 0], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [4, 2], [5, 2], [2, 3], [3, 3], [4, 3], [3, 4]];
  return <svg className="bc-flower" width="32" height="36" viewBox="0 0 7 8" aria-hidden="true">
    <path d="M3 4h1v4H3zM1 5h2v1H1zM4 6h2v1H4z" fill="currentColor" />
    {petals.map(([x, y]) => <rect key={`${x}-${y}`} x={x + .04} y={y + .04} width=".92" height=".92" rx=".16" fill="currentColor" />)}
    <rect x="3.04" y="2.04" width=".92" height=".92" rx=".16" fill="currentColor" />
  </svg>;
}

export function BeadClub({ loop = false, className }: BeadClubProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const lastCard = React.useRef<HTMLButtonElement | null>(null);
  const reduced = !!useReducedMotion();
  const [scale, setScale] = React.useState(.8);
  const [selected, setSelected] = React.useState<Artwork | null>(null);
  React.useEffect(() => {
    const element = host.current;
    if (!element || !loop) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(.1, Math.min((entry.contentRect.width - 34) / 390, (entry.contentRect.height - 42) / PHONE_HEIGHT, 1))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [loop]);
  React.useEffect(() => {
    if (!loop || reduced) return;
    const open = setTimeout(() => setSelected(artworks[0]), 2600);
    const close = setTimeout(() => setSelected(null), 13600);
    const cycle = setInterval(() => {
      setSelected(artworks[0]);
      const timer = setTimeout(() => setSelected(null), 11000);
      pending.push(timer);
    }, 16200);
    const pending: ReturnType<typeof setTimeout>[] = [];
    return () => { clearTimeout(open); clearTimeout(close); clearInterval(cycle); pending.forEach(clearTimeout); };
  }, [loop, reduced]);
  const close = () => { setSelected(null); requestAnimationFrame(() => lastCard.current?.focus({ preventScroll: true })); };
  return <div ref={host} className={`bc-stage ${className ?? ""}`} data-preview={loop ? "loop" : "interactive"}>
    <style>{styles}</style>
    <div className="bc-phone-space" style={loop ? { width: 390 * scale, height: PHONE_HEIGHT * scale } : undefined}><div className="bc-phone" style={loop ? { width: 390, height: PHONE_HEIGHT, transform: `scale(${scale})` } : undefined}>
      <SilverIPhoneFrame />
      <div className="bc-screen" data-detail={!!selected}>
        <div className="bc-island" aria-hidden="true"><span /></div>
        <div className="bc-status" aria-hidden="true"><b>9:41</b><div className="bc-indicators"><svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8v3M5 6v5M9 3v8M13 0v11" stroke="currentColor" strokeWidth="2" /></svg><svg width="15" height="12" viewBox="0 0 15 12"><path d="M1 4Q7.5-1 14 4M3 7q4.5-4 9 0M6 10q1.5-2 3 0" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg><span className="bc-battery" /></div></div>
        <div className="bc-collection" inert={!!selected}>
          <header className="bc-header"><span>little bead club</span><LittleFlower /></header>
          <div className="bc-list" aria-label="Bead collection">
            {artworks.map((art, index) => <button className="bc-card" key={art.id} onClick={event => { lastCard.current = event.currentTarget; setSelected(art); }} aria-label={`Open ${art.name}`}>
              <div className="bc-card-copy"><span className="bc-number">{String(index + 1).padStart(2, "0")}</span><h2>{art.name}</h2><p>{art.note}.</p><span className="bc-card-link">Play <ArrowUpRight size={16} /></span></div>
              <div className="bc-art-panel"><BeadArt art={art} /></div>
            </button>)}
          </div>
        </div>
        <AnimatePresence>{selected && <Replay key={selected.id} art={selected} reduced={reduced} onBack={close} />}</AnimatePresence>
        <div className="bc-glass-edge" aria-hidden="true"><i /><i /><i /></div>
        <div className="bc-glass-reflection" aria-hidden="true" />
        <div className="bc-home" aria-hidden="true" />
      </div>

    </div></div>
  </div>;
}

const styles = `
.bc-stage{width:100%;height:100%;min-height:520px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent;color:#242a26;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;isolation:isolate}.bc-stage[data-preview="interactive"]{min-height:844px}
.bc-stage *{box-sizing:border-box}.bc-stage button{cursor:pointer;font-family:inherit;color:inherit}.bc-stage button:focus-visible{outline:2px solid #3c5044;outline-offset:4px}.bc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.bc-phone-space{position:relative;flex-shrink:0;width:min(390px,calc(100% - 16px));aspect-ratio:302/622}.bc-phone{position:absolute;inset:0;width:100%;height:100%;transform-origin:top left;container-type:inline-size;--bc-silver:linear-gradient(145deg,#e4e5e6 0%,#9b9da0 26%,#d7d8db 52%,#96989c 76%,#c7c9cd 100%)}
.bc-silver-frame{position:absolute;inset:0;pointer-events:none}.bc-frame-band{position:absolute;inset:0;border-radius:calc(100cqw * 55 / 302);background:var(--bc-silver);box-shadow:0 20px 36px -24px #17201a55}.bc-frame-bezel{position:absolute;inset:calc(100cqw * 4 / 302);border-radius:calc(100cqw * 51 / 302);background:#050506}.bc-side{position:absolute;left:-.83%;width:1.16%;border-radius:2px;background:var(--bc-silver)}.bc-side-action{top:19.13%;height:3.54%}.bc-side-up{top:25.56%;height:7.07%}.bc-side-down{top:34.24%;height:7.07%}.bc-side-power{left:auto;right:-.83%;top:28.78%;height:11.25%}
.bc-screen{position:absolute;inset:calc(100cqw * 11 / 302);overflow:hidden;border-radius:calc(100cqw * 44 / 302);clip-path:inset(0 round calc(100cqw * 44 / 302));background:#e4e4e4;isolation:isolate}.bc-island{position:absolute;left:50%;top:calc(100cqw * 10 / 302);width:calc(100cqw * 84 / 302);height:calc(100cqw * 24 / 302);transform:translateX(-50%);border-radius:calc(100cqw * 12 / 302);background:#000;pointer-events:none;z-index:15}.bc-island>span{position:absolute;right:calc(100cqw * 9 / 302);top:calc(100cqw * 8 / 302);width:calc(100cqw * 8 / 302);height:calc(100cqw * 8 / 302);border-radius:50%;background:#111a24;box-shadow:inset 0 0 0 1.5px #1c2733}

.bc-status{height:55px;position:relative;display:flex;align-items:center;justify-content:space-between;padding:4px clamp(15px,6cqw,24px) 0 clamp(16px,6.7cqw,26px);z-index:12;font-size:14px;font-weight:600;color:#242a26;background:transparent}.bc-indicators{display:flex;align-items:center;gap:5px}.bc-battery{width:21px;height:10px;border-radius:3px;border:1px solid currentColor;position:relative}.bc-battery:before{content:'';position:absolute;inset:1px;background:currentColor;border-radius:1px}.bc-battery:after{content:'';position:absolute;width:2px;height:4px;right:-4px;top:2px;background:currentColor;border-radius:1px}
.bc-header::before,.bc-detail-nav::before{content:'';position:absolute;left:0;right:0;top:-55px;bottom:-28px;z-index:-1;background:transparent;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);-webkit-mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);pointer-events:none}
.bc-screen[data-detail="true"] .bc-collection{visibility:hidden}.bc-collection{position:relative;height:calc(100% - 55px);display:flex;flex-direction:column}.bc-header{position:absolute;left:0;right:0;top:0;z-index:8;min-height:78px;color:#242a26;padding:14px 18px 26px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:1.0625rem;font-weight:500;letter-spacing:-.35px}.bc-flower{flex-shrink:0;color:#fff;stroke:#69736c;stroke-width:.09;paint-order:stroke fill;stroke-linejoin:round}.bc-list{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:94px 16px 72px;scrollbar-width:none;scroll-padding:16px 0 72px}.bc-list::-webkit-scrollbar{display:none}
.bc-card{width:100%;border:0;background:transparent;padding:0;margin:0 0 28px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:10px;text-align:left;align-items:center;scroll-margin:16px 0 72px}.bc-card-copy{padding:12px 0;display:flex;flex-direction:column;align-items:flex-start;min-width:0;overflow-wrap:anywhere}.bc-number{font-size:.875rem;color:#535e56;letter-spacing:.2px}.bc-card h2{font-size:1.25rem;line-height:1.25;font-weight:500;margin:10px 0 10px;letter-spacing:-.4px}.bc-card-copy p{font-size:1rem;line-height:1.5;color:#4c574f;margin:0}.bc-card-link{display:flex;align-items:center;gap:5px;font-size:1rem;line-height:1.5;min-height:44px;margin-top:12px}.bc-art-panel{height:252px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:transparent}.bc-art{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(1px 2px 1.5px #30393616)}.bc-art-panel>.bc-art{width:100%;height:100%;transition:transform .5s}.bc-card:hover .bc-art{transform:translateY(-2px)}
.bc-home{position:absolute;width:104px;height:4px;border-radius:4px;background:#424b45;bottom:9px;left:50%;transform:translateX(-50%);z-index:10}
.bc-glass-edge{position:absolute;bottom:0;left:51%;right:0;height:90px;pointer-events:none;z-index:6;background:transparent}.bc-glass-edge i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(transparent,#000);-webkit-mask-image:linear-gradient(transparent,#000)}.bc-glass-edge i:nth-child(2){top:25px;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bc-glass-edge i:nth-child(3){top:54px;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}.bc-screen[data-detail="true"] .bc-glass-edge{height:32px}
.bc-glass-reflection{position:absolute;inset:0;border-radius:inherit;z-index:7;pointer-events:none;box-shadow:inset 0 0 2px #fff4}
.bc-detail{position:absolute;inset:55px 0 0;background:#e4e4e4;z-index:4;overflow-y:auto;scrollbar-width:none;padding-bottom:58px}.bc-detail-nav{position:sticky;top:0;z-index:8;min-height:56px;display:flex;align-items:center;padding:0 12px;color:#fff}.bc-icon{width:44px;height:44px;min-width:44px;min-height:44px;border:1px solid #fff9;background:#ffffff24;backdrop-filter:blur(10px) saturate(1.25);-webkit-backdrop-filter:blur(10px) saturate(1.25);box-shadow:inset 1px 1px 1px #fffc,0 3px 9px #17231a0b;display:grid;place-items:center;border-radius:50%}.bc-icon svg{filter:drop-shadow(0 1px 1px #28362acc)}.bc-board{height:330px;margin:0 10px;position:relative;padding:8px 0;display:flex;justify-content:center;align-items:center}.bc-board .bc-art{width:100%;height:100%}.bc-detail-caption{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px 0}.bc-detail-caption h2{flex:1;min-width:0;font-size:1.375rem;line-height:1.35;font-weight:500;letter-spacing:-.4px;margin:0;overflow-wrap:anywhere}.bc-playback{flex:0 0 auto;position:relative}.bc-play-button{position:relative;display:grid;place-items:center;width:60px;height:60px;aspect-ratio:1;border:0;border-radius:50%;background:linear-gradient(145deg,#ffffff80,#ffffff20 48%,#ffffff45);backdrop-filter:blur(12px) saturate(1.3);-webkit-backdrop-filter:blur(12px) saturate(1.3);box-shadow:inset 1px 1px 1px #fffe,inset -1px -1px 2px #ffffff80,0 5px 16px #24372b12;color:#304236;padding:0;flex-shrink:0}.bc-play-button::before{content:'';position:absolute;inset:2px;border-radius:50%;background:radial-gradient(ellipse at 28% 14%,#ffffff90,transparent 65%);pointer-events:none}.bc-play-button[aria-pressed="true"]{box-shadow:inset 1px 1px 1px #fff,inset -1px -1px 3px #ffffff80,0 3px 12px #24372b16}.bc-play-outline{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.bc-play-symbol{position:relative;margin-left:2px}.bc-play-progress{transition:stroke-dashoffset .08s linear}

.bc-bead-drop{animation:bc-place .24s cubic-bezier(.2,.65,.3,1) both}@keyframes bc-place{from{opacity:0;transform:translateY(-.5px)}to{opacity:1;transform:translateY(0) scale(1)}}@media(prefers-reduced-motion:reduce){.bc-stage *{animation:none!important;transition:none!important}}`;
