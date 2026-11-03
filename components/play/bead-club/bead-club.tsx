"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ArrowLeft, CakeSlice } from "lucide-react";

export type BeadClubProps = {
  /** Uses compact sizing for gallery previews. */
  loop?: boolean;
  /** Additional classes for the preview area. */
  className?: string;
};

type Bead = { x: number; y: number; color: string };
type BeadMaterial = "pressed" | "frosted" | "glitter" | "terry" | "jelly";
type Artwork = { material: BeadMaterial; id: string; name: string; price: string; description: string; category: "Cream" | "Jelly"; background: string; beads: Bead[]; colors: string[]; translucentColors?: readonly string[] };
const PHONE_HEIGHT = 390 * 2822 / 1406;

const APP_BACKGROUND = "#f2f2f2";
const JELLY_COLORS: Record<string, readonly string[]> = {
  "cake-peach": ["#ffad83", "#f18489", "#ffd1a3"],
  "cake-violet": ["#c5a6f4", "#967bcf", "#e1cefa"],
};

// Original cake patterns on a shared bead grid.
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
  const heart = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    for (let y = Math.floor(cy - ry * 1.3); y <= cy + ry; y++) for (let x = Math.floor(cx - rx * 1.2); x <= cx + rx * 1.2; x++) {
      const nx = (x - cx) / rx, ny = (cy - y) / ry;
      if ((nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0) dot(x, y, color);
    }
  };
  const polygon = (points: number[][], color: string) => {
    for (let y = Math.min(...points.map(p => p[1])); y <= Math.max(...points.map(p => p[1])); y++) for (let x = Math.min(...points.map(p => p[0])); x <= Math.max(...points.map(p => p[0])); x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      if (inside) dot(x, y, color);
    }
  };
  const flower = (x: number, y: number, size: number, petals: string, center: string) => {
    for (let i = 0; i < 5; i++) oval(x + Math.cos(i * Math.PI * 2 / 5) * size, y + Math.sin(i * Math.PI * 2 / 5) * size, size * .72, size * .6, petals);
    oval(x, y, Math.max(1, size * .45), Math.max(1, size * .45), center);
  };
  const fruit = (x: number, y: number, color: string, leaf: string, cream: string) => {
    line(x, y - 5, x + 1, y - 2, leaf);
    oval(x, y, 2.6, 2.8, color); dot(x, y + 3, color);
    line(x - 2, y - 2, x + 2, y - 2, leaf);
    dot(x - 1, y - 1, cream); dot(x + 1, y + 1, cream);
  };
  if (id === "cake-heart") {
    const pink = "#ff89ae", shade = "#de5688", cream = "#fff4d9", red = "#ef3d67", green = "#459f80";

    for (let dy = 12; dy >= 1; dy--) heart(20, 15 + dy, 12, 6, dy > 8 ? shade : dy > 5 ? cream : pink);
    heart(20, 15, 12, 6, "#f45c99"); heart(20, 14, 10.8, 5.2, cream);
    for (const [x,y] of [[8,23],[12,26],[17,29],[23,29],[28,26],[32,23]]) oval(x,y,1.5,1,cream);
    fruit(13, 11, red, green, cream); fruit(26, 11, red, green, cream); fruit(20, 18, "#ff6385", green, cream);
    oval(18, 31, 3, 1.8, "#d1b1ed"); oval(23, 31, 3, 1.8, "#d1b1ed");
    dot(20, 31, "#a57bcc"); line(20, 32, 17, 35, "#d1b1ed"); line(21, 32, 24, 35, "#d1b1ed");
  } else if (id === "cake-cloud") {
    const blue = "#81cfee", shade = "#579fcf", white = "#fff8e9", berry = "#5361a8";
     oval(20, 33, 15, 4, shade);
    rect(5, 24, 31, 10, blue); oval(20, 24, 15, 4, white);
    for (let x = 6; x <= 34; x += 4) { oval(x,26,2,2,white); if(x%8===6)rect(x,26,1,4,white); }
    oval(20, 22, 10, 3, "#b4a9e9"); rect(10, 13, 21, 10, "#d2e8f5");
    oval(20, 13, 10, 4, blue);
    for (let x = 11; x <= 29; x += 3) oval(x,15,2,2,white);
    for (const [x,y] of [[13,11],[17,9],[21,10],[25,9],[28,12]]) oval(x,y,3,2,white);
    for (const [x,y] of [[14,8],[22,7],[27,10]]) { oval(x,y,2,2,berry); dot(x-1,y-1,"#a2b7ef"); }
    line(22,4,22,6,"#5ba392"); oval(24,4,2,1,"#7fc7b0");
    for (const [x,y] of [[12,31],[27,30]]) { line(x-1,y,x+1,y,"#fff0b7");line(x,y-1,x,y+1,"#fff0b7"); }
    oval(20, 32, 4, 2, white);
  } else if (id === "cake-peach") {
    const [gel, shade, glow] = JELLY_COLORS["cake-peach"];

    oval(20,29,12,5,shade); rect(8,19,25,11,gel); oval(20,19,12,9,gel);
    oval(20,17,10,6,glow);
    for (const x of [10,15,25,30]) line(x,21,x,29, x<20?glow:shade);
    oval(20,30,11,3,gel); line(11,31,28,31,glow);
    oval(20,12,8,4,"#f28088"); oval(20,11,6,3,"#ffdfac");
    line(18,9,23,12,"#ffc58c"); dot(23,12,"#f59d7e");
    oval(13,9,3,1.6,"#69ad8e"); oval(16,7,1.5,3,"#96c9a4");
    rect(10,31,21,1,"#fff4dc"); rect(10,32,21,2,"#d1a16c");
    flower(29,30,2,"#fff7e4","#ffd27f");

  } else if (id === "cake-matcha") {
    const green = "#8fc480", dark = "#528b67", light = "#c5dfa4", cream = "#fff1d1";
    rect(6,16,29,17,dark); oval(20,33,14,2,dark);
    rect(6,20,29,5,green); rect(6,26,29,3,cream); rect(6,30,29,3,light);
    oval(20,16,14,5,dark); oval(20,15,14,5,light); rect(9,11,23,8,light);
    for(let x=7;x<=33;x+=4)oval(x,20,2,1.5,cream);
    for(const [x,y]of [[11,12],[24,13],[29,16]])flower(x,y,2,cream,"#e5bc65");
    flower(18,17,2.4,"#f8a9bc","#fff0b1");
    oval(14,14,3,1,dark); oval(27,11,2.5,1,dark); oval(23,17,2,1,green);
    for(const [x,y]of [[10,24],[20,24],[30,24]])dot(x,y,"#d7ebbb");

  } else if (id === "cake-violet") {
    const [gel, shade, glow] = JELLY_COLORS["cake-violet"];

    polygon([[6,17],[15,23],[15,34],[6,27]],shade);
    polygon([[15,23],[30,21],[30,32],[15,35]],gel);
    polygon([[30,21],[33,16],[33,27],[30,32]],shade);
    polygon([[20,9],[33,16],[30,22],[15,24],[6,17]],glow);
    line(16,25,16,32,glow); line(29,23,29,30,glow);
    for(const [x,y]of [[20,28],[25,31],[11,24]])dot(x,y,glow);
    oval(20,14,5,2,"#fff5e6"); oval(20,12,3,2,"#fff9ed");
    for(const [x,y]of [[12,15],[26,16]]){oval(x,y,2,2,"#7252ac");dot(x-1,y-1,"#b4a3df");}
    flower(27,12,1.8,"#fff4dc","#f1cf79");
    oval(16,11,2.5,1,"#7ebda3");
    polygon([[15,32],[30,30],[30,32],[15,34]],"#fff1d4");
    polygon([[15,34],[30,32],[30,33],[15,36]],"#c09a70");
  } else if (id === "cake-strawberry") {
     oval(20,31,14,5,"#e8c48d");
    rect(6,18,29,14,"#f6dca9"); rect(6,23,29,3,"#f78b9f"); rect(6,26,29,2,"#fff5db");
    oval(20,18,14,5,"#fff9e9");
    for(const x of [8,14,25,31])oval(x,21,2,2,"#fff9e9");
    oval(19,14,3,2,"#fff9e9"); fruit(12,14,"#ed4c68","#4f9873","#ffe1ad");
    fruit(24,13,"#ed4c68","#4f9873","#ffe1ad"); fruit(30,18,"#f3657c","#4f9873","#ffe1ad");
    for(const [x,y]of [[10,30],[19,32],[30,30]])dot(x,y,"#fff3cf");
  } else if (id === "cake-chocolate") {

    polygon([[6,18],[31,18],[31,34],[6,31]],"#95604a");
    polygon([[31,18],[35,13],[35,29],[31,34]],"#634335");
    polygon([[6,18],[19,6],[35,13],[31,18]],"#704936");
    polygon([[7,23],[30,23],[30,26],[7,25]],"#edcba1");
    polygon([[7,28],[30,29],[30,31],[7,30]],"#bf7f74");
    line(8,20,29,20,"#b58768");
    rect(22,10,8,3,"#493127"); line(23,10,28,10,"#b78968");
    oval(20,14,3,2,"#e6c79f");fruit(13,15,"#dc526a","#618761","#ffe2b1");
    for(const [x,y]of [[24,16],[28,15],[20,29],[11,27]])dot(x,y,"#dcb487");
  } else if (id === "cake-lemon") {
     oval(20,31,14,5,"#dfb75d");rect(6,18,29,14,"#efd07f");
    rect(6,24,29,3,"#fff4d4");rect(7,30,27,2,"#fff1bd");
    oval(20,18,14,5,"#fff8de");for(const x of [8,13,27,32])oval(x,21,2,2,"#fff8de");
    oval(20,12,6,6,"#dcaf43");oval(20,12,5,5,"#f8dc72");
    for(const [x,y]of [[20,7],[24,9],[25,12],[24,16],[20,17],[16,16],[15,12],[16,9]])line(20,12,x,y,"#fff4bf");
    oval(27,11,4,1.5,"#74a57a");oval(25,9,1.5,3,"#98c194");
    oval(10,17,3,1.5,"#fffdf0");oval(30,18,3,1.5,"#fffdf0");
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
  { id:"cake-strawberry", name:"Strawberry cake", price:"$8.50", description:"Vanilla sponge, strawberry cream and fresh berries.", category:"Cream", background:"#efe5e3" },
  { id:"cake-cloud", name:"Blueberry cloud", price:"$9.00", description:"Blueberry sponge layered with soft vanilla cream.", category:"Cream", background:"#e3eff5" },
  { id:"cake-matcha", name:"Matcha cake", price:"$8.00", description:"Matcha sponge, vanilla cream and little sugar flowers.", category:"Cream", background:"#e8efdd" },
  { id:"cake-chocolate", name:"Chocolate slice", price:"$9.50", description:"Chocolate sponge, ganache and a berry cream layer.", category:"Cream", background:"#eaded5" },
  { id:"cake-lemon", name:"Lemon chiffon", price:"$8.00", description:"Light lemon sponge with citrus glaze and fresh cream.", category:"Cream", background:"#f3ecd8" },
  { id:"cake-heart", name:"Berry heart", price:"$8.50", description:"Strawberry cream, vanilla sponge and a little sugar bow.", category:"Cream", background:"#efe5e3" },
  { id:"cake-peach", name:"Peach cheesecake", price:"$7.50", description:"Peach jelly, vanilla cheesecake and a biscuit base.", category:"Jelly", background:"#f8e8dd" },
  { id:"cake-violet", name:"Violet cheesecake", price:"$8.50", description:"Blackcurrant jelly, vanilla cheesecake and blueberries.", category:"Jelly", background:"#eee7f7" },
].map(item=>{const beads=makePattern(item.id);return {...item, material:(JELLY_COLORS[item.id]?"jelly":"terry") as BeadMaterial, translucentColors:JELLY_COLORS[item.id], category:item.category as Artwork["category"], beads, colors:[...new Set(beads.map(bead=>bead.color))]};});

function FlatBeadArt({ art, count = art.beads.length, }: { art: Artwork; count?: number }) {
  const id = React.useId().replace(/:/g, "");
  const placed = art.beads.slice(0, count);
  const glitter = art.material === "glitter";
  // Overlapping cells fuse into one continuous surface. The material is lit
  // and textured once across the whole piece, never stamped onto each cell.
  // A separate silhouette mask keeps the gentle color bleed inside the piece.
  const cell = (bead: Bead) => `M${bead.x - .06} ${bead.y - .06}h1.12v1.12h-1.12Z`;
  const silhouette = placed.map(cell).join("");
  const depth = { x: .1, y: .28 };
  const occupied = new Set(placed.map(bead => `${bead.x},${bead.y}`));
  const underside = new Map<string, string[]>();
  const sides: { path: string; color: string }[] = [];
  const shade = (color: string, amount: number) => `#${color.slice(1).match(/../g)!.map(channel => Math.round(parseInt(channel, 16) * amount).toString(16).padStart(2, "0")).join("")}`;
  const wall = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}L${x2 + depth.x} ${y2 + depth.y}L${x1 + depth.x} ${y1 + depth.y}Z`;
  for (const bead of placed) {
    const paths = underside.get(bead.color) ?? [];
    paths.push(cell(bead));
    underside.set(bead.color, paths);
    // Only the exposed perimeter has a side wall. Interior joins stay fused.
    if (!occupied.has(`${bead.x + 1},${bead.y}`)) sides.push({ path: wall(bead.x + 1.06, bead.y - .06, bead.x + 1.06, bead.y + 1.06), color: shade(bead.color, .84) });
    if (!occupied.has(`${bead.x},${bead.y + 1}`)) sides.push({ path: wall(bead.x - .06, bead.y + 1.06, bead.x + 1.06, bead.y + 1.06), color: shade(bead.color, .9) });
  }
  return <svg viewBox="0 0 40 42" role="img" aria-label={`${art.name} ${art.material} fused bead pattern`} className="bc-art" data-material={art.material} style={art.material === "jelly" ? { opacity: .8 } : undefined}>
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
    <g className="bc-bead-thickness" aria-hidden="true">
      <g transform={`translate(${depth.x} ${depth.y})`} mask={`url(#${id}-shape)`}>
        {[...underside].map(([color, paths]) => <path key={color} d={paths.join("")} fill={shade(color, .84)} />)}
      </g>
      {sides.map((side, index) => <path key={index} d={side.path} fill={side.color} stroke={side.color} strokeWidth=".045" strokeLinejoin="round" />)}
    </g>
    <g className="bc-material-surface" mask={`url(#${id}-shape)`}>
      <g className="bc-fused-colors" filter={`url(#${id}-surface)`}>
        {placed.map(bead => <g key={`${bead.x}-${bead.y}`} data-bead-color={bead.color} style={{ transformOrigin: `${bead.x + .5}px ${bead.y + .5}px` }}><path d={cell(bead)} fill={bead.color} /></g>)}
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

// One offscreen renderer serves every preview; displayed canvases are plain 2D.
// Geometry and lighting, rather than painted side-wall colors, create the depth.
function fusedShapes(beads: Bead[]) {
  type Edge = { x: number; y: number; ex: number; ey: number; dir: number; used?: boolean };
  const occupied = new Set(beads.map(b => `${b.x},${b.y}`));
  const edges: Edge[] = [];
  const starts = new Map<string, Edge[]>();
  const add = (edge: Edge) => { edges.push(edge); const key = `${edge.x},${edge.y}`; const list = starts.get(key) ?? []; list.push(edge); starts.set(key, list); };
  for (const b of beads) {
    if (!occupied.has(`${b.x},${b.y - 1}`)) add({ x: b.x, y: b.y, ex: b.x + 1, ey: b.y, dir: 0 });
    if (!occupied.has(`${b.x + 1},${b.y}`)) add({ x: b.x + 1, y: b.y, ex: b.x + 1, ey: b.y + 1, dir: 1 });
    if (!occupied.has(`${b.x},${b.y + 1}`)) add({ x: b.x + 1, y: b.y + 1, ex: b.x, ey: b.y + 1, dir: 2 });
    if (!occupied.has(`${b.x - 1},${b.y}`)) add({ x: b.x, y: b.y + 1, ex: b.x, ey: b.y, dir: 3 });
  }
  const loops: { points: { x: number; y: number }[]; area: number }[] = [];
  for (const first of edges) {
    if (first.used) continue;
    const points: { x: number; y: number }[] = [];
    let edge: Edge | undefined = first;
    while (edge && !edge.used) {
      edge.used = true; points.push({ x: edge.x, y: edge.y });
      if (edge.ex === first.x && edge.ey === first.y) break;
      const dir: number = edge.dir;
      edge = (starts.get(`${edge.ex},${edge.ey}`) ?? []).filter(candidate => !candidate.used).sort((a, b) => [1, 0, 3, 2].indexOf((a.dir - dir + 4) % 4) - [1, 0, 3, 2].indexOf((b.dir - dir + 4) % 4))[0];
    }
    const area = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;
    if (points.length > 2) loops.push({ points, area });
  }
  const outer = loops.filter(loop => loop.area > 0);
  const contains = (poly: { x: number; y: number }[], p: { x: number; y: number }) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
    }
    return inside;
  };
  const rounded = <T extends THREE.Path>(path: T, points: { x: number; y: number }[]) => {
    const outline = points.flatMap((p, i) => { const b = points[(i + 1) % points.length]; return [p, { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 }]; });
    const corners = outline.map((p, i) => {
      const a = outline[(i + outline.length - 1) % outline.length], b = outline[(i + 1) % outline.length];
      const da = Math.hypot(a.x - p.x, a.y - p.y), db = Math.hypot(b.x - p.x, b.y - p.y), r = Math.min(.09, da / 3, db / 3);
      return { p, entry: { x: p.x + (a.x - p.x) * r / da, y: p.y + (a.y - p.y) * r / da }, exit: { x: p.x + (b.x - p.x) * r / db, y: p.y + (b.y - p.y) * r / db } };
    });
    path.moveTo(corners[0].entry.x - 20, 21 - corners[0].entry.y);
    for (let i = 0; i < corners.length; i++) {
      const { p, exit } = corners[i], next = corners[(i + 1) % corners.length];
      path.quadraticCurveTo(p.x - 20, 21 - p.y, exit.x - 20, 21 - exit.y);
      const dx = next.p.x - p.x, dy = next.p.y - p.y, length = Math.hypot(dx, dy);
      // A restrained scallop keeps each melted bead visible along the cut edge.
      const mx = (exit.x + next.entry.x) / 2 + dy / length * .04;
      const my = (exit.y + next.entry.y) / 2 - dx / length * .04;
      path.quadraticCurveTo(mx - 20, 21 - my, next.entry.x - 20, 21 - next.entry.y);
    }
    path.closePath(); return path;
  };
  return outer.map(loop => {
    const shape = rounded(new THREE.Shape(), loop.points);
    for (const hole of loops.filter(item => item.area < 0)) {
      if (contains(loop.points, hole.points[0])) shape.holes.push(rounded(new THREE.Path(), hole.points));
    }
    return shape;
  });
}

let beadGrain: Uint8ClampedArray | undefined;
let beadGrainLoading: Promise<void> | undefined;
function loadBeadGrain() {
  if (!beadGrainLoading) beadGrainLoading = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 1344;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(image, 0, 0, canvas.width, canvas.height); beadGrain = ctx.getImageData(0, 0, canvas.width, canvas.height).data; }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = "/components/bead-club/fused-pearl-grain.png";
  });
  return beadGrainLoading;
}

type GrainSurface = { normal: THREE.CanvasTexture; roughness: THREE.CanvasTexture; pigment: Float32Array; sparkle?: THREE.CanvasTexture; sparkleNormal?: THREE.CanvasTexture };
let grainSurface: GrainSurface | undefined;
function fusedGrainSurface() {
  if (grainSurface) return grainSurface;
  const width = 1280, height = 1344, pitch = 8;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const normal = ctx.createImageData(width, height), roughness = ctx.createImageData(width, height);
  const pigment = new Float32Array(width * height);
  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801);
    n = Math.imul(n ^ n >>> 16, 2246822507);
    return (n ^ n >>> 13) >>> 0;
  };
  const columns = Math.ceil(width / pitch) + 2, rows = Math.ceil(height / pitch) + 2;
  const grains = Array.from({ length: columns * rows }, (_, i) => {
    const x = i % columns - 1, y = Math.floor(i / columns) - 1, seed = hash(x, y);
    const angle = (seed & 65535) / 65535 * Math.PI * 2, tilt = .24 + ((seed >>> 16) & 255) / 255 * .5;
    return { x: (x + .15 + (seed & 255) / 255 * .7) * pitch, y: (y + .15 + ((seed >>> 8) & 255) / 255 * .7) * pitch, nx: Math.cos(angle) * tilt, ny: Math.sin(angle) * tilt, seed };
  });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const gx = Math.floor(x / pitch), gy = Math.floor(y / pitch);
    let nearest = grains[(gy + 1) * columns + gx + 1], distance = Infinity;
    for (let cy = gy; cy <= gy + 2; cy++) for (let cx = gx; cx <= gx + 2; cx++) {
      const grain = grains[cy * columns + cx], dx = x - grain.x, dy = y - grain.y;
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; nearest = grain; }
    }
    const i = (y * width + x) * 4;
    const nx = nearest.nx + (x - nearest.x) / pitch * .18;
    const ny = nearest.ny - (y - nearest.y) / pitch * .18;
    const length = Math.hypot(nx, ny, 1);
    normal.data[i] = (nx / length * .5 + .5) * 255;
    normal.data[i + 1] = (ny / length * .5 + .5) * 255;
    normal.data[i + 2] = (1 / length * .5 + .5) * 255; normal.data[i + 3] = 255;
    const pearl = beadGrain ? beadGrain[i] / 255 : .86;
    const r = 75 + (nearest.seed >>> 8 & 255) / 255 * 120 + (pearl - .86) * 80;
    roughness.data[i] = roughness.data[i + 1] = roughness.data[i + 2] = r; roughness.data[i + 3] = 255;
    pigment[y * width + x] = .97 + (nearest.seed & 255) / 255 * .06;
  }
  ctx.putImageData(normal, 0, 0);
  const normalMap = new THREE.CanvasTexture(canvas); normalMap.generateMipmaps = false; normalMap.minFilter = THREE.LinearFilter;
  const roughCanvas = document.createElement("canvas"); roughCanvas.width = width; roughCanvas.height = height;
  roughCanvas.getContext("2d")!.putImageData(roughness, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas); roughnessMap.generateMipmaps = false; roughnessMap.minFilter = THREE.LinearFilter;
  grainSurface = { normal: normalMap, roughness: roughnessMap, pigment };
  return grainSurface;
}

let terrySurface: GrainSurface | undefined;
function terryGrainSurface() {
  if (terrySurface) return terrySurface;
  const width = 1280, height = 1344, pitch = 14;
  const pile = document.createElement("canvas"); pile.width = width; pile.height = height;
  const ctx = pile.getContext("2d")!;
  ctx.fillStyle = "#666"; ctx.fillRect(0, 0, width, height); ctx.lineCap = "round";
  for (let y = -pitch; y < height + pitch; y += pitch) for (let x = -pitch; x < width + pitch; x += pitch) {
    let seed = Math.imul(x + pitch, 1597334677) ^ Math.imul(y + pitch, 3812015801);
    seed = (Math.imul(seed ^ seed >>> 16, 2246822507) ^ seed >>> 13) >>> 0;
    const size = 9 + (seed & 255) / 255 * 7, curl = ((seed >>> 8) & 255) / 255;
    ctx.save();
    ctx.translate(x + (curl - .5) * pitch, y + (((seed >>> 16) & 255) / 255 - .5) * pitch);
    ctx.rotate((seed & 65535) / 65535 * Math.PI * 2);
    const loop = new Path2D();
    loop.moveTo(-size * .45, size * .12);
    loop.bezierCurveTo(-size * .55, -size * .55, size * .5, -size * .55, size * .4, size * .03);
    loop.bezierCurveTo(size * .3, size * .35, -size * .1, size * .3, -size * .1, size * .04);
    const thickness = 4 + curl * 2;
    for (const [color, scale] of [["#8c8c8c", 1.4], ["#aaa", 1], ["#c5c5c5", .6], ["#d6d6d6", .24]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = thickness * scale; ctx.stroke(loop);
    }
    ctx.restore();
  }
  const smooth = document.createElement("canvas"); smooth.width = width; smooth.height = height;
  const smoothCtx = smooth.getContext("2d")!; smoothCtx.filter = "blur(.65px)"; smoothCtx.drawImage(pile, 0, 0);
  const heights = smoothCtx.getImageData(0, 0, width, height).data;
  const normal = ctx.createImageData(width, height), roughness = ctx.createImageData(width, height);
  const pigment = new Float32Array(width * height);
  let mean = 0; for (let i = 0; i < heights.length; i += 4) mean += heights[i] / 255;
  mean /= width * height;
  const sample = (x: number, y: number) => heights[(Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4] / 255;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, h = heights[i] / 255;
    const nx = -(sample(x + 1, y) - sample(x - 1, y)) * 3;
    const ny = (sample(x, y + 1) - sample(x, y - 1)) * 3;
    const length = Math.hypot(nx, ny, 1);
    normal.data[i] = (nx / length * .5 + .5) * 255;
    normal.data[i + 1] = (ny / length * .5 + .5) * 255;
    normal.data[i + 2] = (1 / length * .5 + .5) * 255; normal.data[i + 3] = 255;
    roughness.data[i] = roughness.data[i + 1] = roughness.data[i + 2] = 255; roughness.data[i + 3] = 255;
    pigment[y * width + x] = 1 + (h - mean) * .18;
  }
  ctx.putImageData(normal, 0, 0);
  const normalMap = new THREE.CanvasTexture(pile); normalMap.generateMipmaps = false; normalMap.minFilter = THREE.LinearFilter;
  smoothCtx.putImageData(roughness, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(smooth); roughnessMap.generateMipmaps = false; roughnessMap.minFilter = THREE.LinearFilter;
  const sparkleCanvas = document.createElement("canvas"); sparkleCanvas.width = width; sparkleCanvas.height = height;
  const sparkleCtx = sparkleCanvas.getContext("2d")!;
  sparkleCtx.fillStyle = "#000"; sparkleCtx.fillRect(0, 0, width, height); sparkleCtx.fillStyle = "#fff";
  const facetCanvas = document.createElement("canvas"); facetCanvas.width = width; facetCanvas.height = height;
  const facetCtx = facetCanvas.getContext("2d")!; facetCtx.fillStyle = "rgb(128,128,255)"; facetCtx.fillRect(0, 0, width, height);
  for (let y = 5; y < height; y += 10) for (let x = 5; x < width; x += 10) {
    const seed = (Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801)) >>> 0;
    if (seed % 4 !== 0) continue;
    const px = x + (seed % 7 - 3), py = y + ((seed >>> 8) % 7 - 3);
    const nx = -.31 + ((seed >>> 8 & 255) / 255 - .5) * .32, ny = .43 + ((seed >>> 16 & 255) / 255 - .5) * .32;
    const length = Math.hypot(nx, ny, 1);
    facetCtx.fillStyle = `rgb(${Math.round((nx / length * .5 + .5) * 255)},${Math.round((ny / length * .5 + .5) * 255)},${Math.round((1 / length * .5 + .5) * 255)})`;
    for (const target of [sparkleCtx, facetCtx]) {
      const padding = target === facetCtx ? 2 : 0;
      target.beginPath(); target.ellipse(px, py, (seed % 23 === 0 ? 5.5 : 3 + (seed % 5) * .25) + padding, 1.7 + padding, seed % 628 / 100, 0, Math.PI * 2); target.fill();
    }
  }
  const sparkleMap = new THREE.CanvasTexture(sparkleCanvas); sparkleMap.generateMipmaps = false; sparkleMap.minFilter = THREE.LinearFilter;
  const sparkleNormal = new THREE.CanvasTexture(facetCanvas); sparkleNormal.generateMipmaps = false; sparkleNormal.minFilter = THREE.LinearFilter;
  terrySurface = { normal: normalMap, roughness: roughnessMap, pigment, sparkle: sparkleMap, sparkleNormal };
  return terrySurface;
}

type BeadMaterials = { faces: THREE.MeshPhysicalMaterial[]; mask?: THREE.MeshBasicMaterial };
function physicalMaterials(art: Artwork): BeadMaterials {
  const terry = art.material === "terry", jelly = art.material === "jelly";
  const resolution = 16, surface = terry ? terryGrainSurface() : fusedGrainSurface();
  const glints = terryGrainSurface();
  const color = document.createElement("canvas"); color.width = 40 * resolution; color.height = 42 * resolution;
  const ctx = color.getContext("2d")!;
  ctx.fillStyle = art.beads[0]?.color ?? "#f0eade"; ctx.fillRect(0, 0, color.width, color.height);
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect((bead.x - .2) * resolution, (bead.y - .2) * resolution, resolution * 1.4, resolution * 1.4); }
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect(bead.x * resolution, bead.y * resolution, resolution, resolution); }
  const fused = document.createElement("canvas"); fused.width = color.width; fused.height = color.height;
  const fusedCtx = fused.getContext("2d")!; fusedCtx.filter = "blur(.7px)"; fusedCtx.drawImage(color, 0, 0);
  const image = fusedCtx.getImageData(0, 0, color.width, color.height);
  for (let pixel = 0; pixel < color.width * color.height; pixel++) {
    const i = pixel * 4;
    const grainPixel = Math.floor(pixel / color.width) * 2 * 1280 + (pixel % color.width) * 2;
    const pearl = !terry && beadGrain ? beadGrain[grainPixel * 4] / 255 : .86;
    const tint = surface.pigment[grainPixel] * (1 + (pearl - .86) * .15);
    for (let c = 0; c < 3; c++) image.data[i + c] *= tint;
  }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  let transmissionMap: THREE.CanvasTexture | undefined, opacityMap: THREE.CanvasTexture | undefined, jellyNormal: THREE.CanvasTexture | undefined;
  if (jelly) {
    const transmission = document.createElement("canvas"), opacity = document.createElement("canvas");
    for (const canvas of [transmission, opacity]) { canvas.width = color.width; canvas.height = color.height; }
    const tctx = transmission.getContext("2d")!, actx = opacity.getContext("2d")!;
    tctx.fillStyle = "#000"; tctx.fillRect(0, 0, color.width, color.height);
    actx.fillStyle = "#fff"; actx.fillRect(0, 0, color.width, color.height);
    const gelColors = new Set(art.translucentColors);
    for (const bead of art.beads) if (gelColors.has(bead.color)) {
      tctx.fillStyle = "#fff"; actx.fillStyle = "#dedede";
      for (const target of [tctx, actx]) target.fillRect(bead.x * resolution, bead.y * resolution, resolution, resolution);
    }
    const gelBeads = art.beads.filter(bead => gelColors.has(bead.color));
    const minX = Math.min(...gelBeads.map(b => b.x)), maxX = Math.max(...gelBeads.map(b => b.x)) + 1;
    const minY = Math.min(...gelBeads.map(b => b.y)), maxY = Math.max(...gelBeads.map(b => b.y)) + 1;
    const lens = document.createElement("canvas"); lens.width = color.width; lens.height = color.height;
    const lensCtx = lens.getContext("2d")!, lensPixels = lensCtx.createImageData(lens.width, lens.height);
    const gelPixels = tctx.getImageData(0, 0, lens.width, lens.height).data;
    for (let y = 0; y < lens.height; y++) for (let x = 0; x < lens.width; x++) {
      const i = (y * lens.width + x) * 4, body = gelPixels[i] > 128;
      const left = minX, right = maxX, top = minY, bottom = maxY;
      const nx = body ? ((x / resolution - left) / (right - left) - .5) * 1.3 : 0;
      const ny = body ? -((y / resolution - top) / (bottom - top) - .5) * 1.4 : 0;
      const length = Math.hypot(nx, ny, 1);
      lensPixels.data[i] = (nx / length * .5 + .5) * 255;
      lensPixels.data[i + 1] = (ny / length * .5 + .5) * 255;
      lensPixels.data[i + 2] = (1 / length * .5 + .5) * 255; lensPixels.data[i + 3] = 255;
    }
    lensCtx.putImageData(lensPixels, 0, 0); jellyNormal = new THREE.CanvasTexture(lens);
    transmissionMap = new THREE.CanvasTexture(transmission); opacityMap = new THREE.CanvasTexture(opacity);
  }
  const face = jelly ? new THREE.MeshPhysicalMaterial({
    map, transmission: .62, transmissionMap, thickness: .5, ior: 1.45,
    roughness: .18, metalness: 0, attenuationDistance: 3,
    normalMap: jellyNormal, normalScale: new THREE.Vector2(1, 1),
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
  }) : terry ? new THREE.MeshPhysicalMaterial({
    map, normalMap: surface.normal, normalScale: new THREE.Vector2(.85, .85),
    color: new THREE.Color(1.23, 1.23, 1.23), roughness: 1, metalness: 0, specularIntensity: .06,
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
    sheen: .02, sheenRoughness: 1, sheenColor: new THREE.Color("#fff6f4"),
  }) : new THREE.MeshPhysicalMaterial({
    map, normalMap: surface.normal, normalScale: new THREE.Vector2(.3, .3),
    roughnessMap: surface.roughness, roughness: .85, metalness: 0, ior: 1.5,
    clearcoat: 1, clearcoatMap: glints.sparkle, clearcoatRoughness: .2,
    clearcoatNormalMap: glints.sparkleNormal, clearcoatNormalScale: new THREE.Vector2(1, 1),
  });
  const side = jelly ? face.clone() : new THREE.MeshPhysicalMaterial({ map, roughness: terry ? .95 : .48, metalness: 0, clearcoat: terry ? 0 : .25, clearcoatRoughness: .4, specularIntensity: terry ? .15 : 1 });
  if (jelly) { side.normalMap = null; side.clearcoatNormalMap = null; }
  return { faces: [face, side], mask: jelly ? new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: opacityMap, transparent: true, depthWrite: true }) : undefined };
}

type BeadStudio = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.OrthographicCamera; mesh: THREE.Mesh; materials: Map<string, BeadMaterials>; completed: Map<string, THREE.BufferGeometry> };
let beadStudio: BeadStudio | undefined;
let beadWebGLUnavailable = false;
function getBeadStudio() {
  if (beadStudio) return beadStudio;
  if (beadWebGLUnavailable) return null;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
  catch { beadWebGLUnavailable = true; return null; }
  renderer.setPixelRatio(1); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const room = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04).texture; scene.environment = environment; scene.environmentIntensity = .36; room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6edfa, .18));
  const light = new THREE.DirectionalLight(0xffffff, 1.7); light.position.set(-28, 38, 32); light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -26, right: 26, top: 27, bottom: -27, near: 1, far: 120 });
  light.shadow.mapSize.set(512, 512); light.shadow.bias = -.0002; light.shadow.normalBias = .03; light.shadow.radius = 3.5;
  scene.add(light);
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial()); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ opacity: .12 })); floor.position.z = -.16; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.OrthographicCamera(-23, 23, 23, -23, .1, 180); camera.position.set(0, 0, 95); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
  beadStudio = { renderer, scene, camera, mesh, materials: new Map(), completed: new Map() };
  return beadStudio;
}

function drawPhysicalBeads(canvas: HTMLCanvasElement, art: Artwork, count: number) {
  const studio = getBeadStudio();
  if (!studio || studio.renderer.getContext().isContextLost()) return false;
  const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.ceil(rect.width * pixelRatio), height = Math.ceil(rect.height * pixelRatio);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, width, height);
  if (!count) return true;
  let geometry = count === art.beads.length ? studio.completed.get(art.id) : undefined;
  if (!geometry) {
    const uv = (vertices: number[], index: number) => new THREE.Vector2((vertices[index * 3] + 20) / 40, (vertices[index * 3 + 1] + 21) / 42);
    geometry = new THREE.ExtrudeGeometry(fusedShapes(art.beads.slice(0, count)), {
      depth: .34, curveSegments: 3, bevelEnabled: true, bevelThickness: .13, bevelSize: .14, bevelSegments: 4, steps: 1,
      UVGenerator: { generateTopUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)), generateSideWallUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)) },
    });
    if (count === art.beads.length) studio.completed.set(art.id, geometry);
  }
  const materials = studio.materials.get(art.id) ?? physicalMaterials(art); studio.materials.set(art.id, materials);
  studio.mesh.geometry = geometry; studio.mesh.material = materials.faces;
  const aspect = width / height, viewHeight = Math.max(45, 43 / aspect);
  Object.assign(studio.camera, { left: -viewHeight * aspect / 2, right: viewHeight * aspect / 2, top: viewHeight / 2, bottom: -viewHeight / 2 }); studio.camera.updateProjectionMatrix();
  studio.scene.background = materials.mask ? new THREE.Color(APP_BACKGROUND) : null;
  studio.renderer.setSize(width, height, false); studio.renderer.render(studio.scene, studio.camera);
  ctx.drawImage(studio.renderer.domElement, 0, 0);
  if (materials.mask) {
    studio.scene.background = null; studio.mesh.material = materials.mask;
    studio.renderer.render(studio.scene, studio.camera);
    ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(studio.renderer.domElement, 0, 0); ctx.globalCompositeOperation = "source-over";
    studio.mesh.material = materials.faces;
  }
  if (count !== art.beads.length) geometry.dispose();
  return true;
}

function BeadArt({ art, count = art.beads.length, }: { art: Artwork; count?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let frame = 0, disposed = false, textureReady = false;
    const paint = () => { if (!textureReady || disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { try { if (drawPhysicalBeads(canvas, art, count)) setReady(true); } catch { setReady(false); } }); };
    const observer = new ResizeObserver(paint); observer.observe(canvas);
    void loadBeadGrain().then(() => { textureReady = true; paint(); });
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [art, count]);
  return <div className="bc-art bc-art-3d" role="img" aria-label={`${art.name}, ${art.material === "jelly" ? "translucent jelly" : art.material === "terry" ? "soft textured" : "pearlescent"} bead pattern`} data-material={art.material} data-render-mode={ready ? "physical" : "fallback"} data-placed={count} data-active-color={art.beads[Math.max(0, count - 1)]?.color}>
    <canvas ref={ref} aria-hidden="true" style={{ width: "100%", height: "100%", opacity: ready ? 1 : 0 }} />
    {!ready && <div aria-hidden="true" style={{ display: "contents" }}><FlatBeadArt art={art} count={count} /></div>}
  </div>;
}

function CakeDetail({ art, onBack }: { art: Artwork; onBack: () => void }) {
  const backRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  return <section className="bc-detail" onKeyDown={event => { if (event.key === "Escape") onBack(); }} aria-label={`${art.name} details`}>
    <div className="bc-detail-nav"><button ref={backRef} className="bc-icon" onClick={onBack} aria-label="Back to collection"><ArrowLeft size={21} /></button></div>
    <div className="bc-board"><BeadArt art={art} /></div>
    <div className="bc-detail-caption"><h2>{art.name}</h2><p className="bc-menu-price">{art.price}</p><p className="bc-detail-description">{art.description}</p></div>
  </section>;
}


const menuSections = [
  { id: "all", title: "All", items: artworks },
  { id: "cream", title: "Cream", items: artworks.filter(art => art.category === "Cream") },
  { id: "jelly", title: "Jelly", items: artworks.filter(art => art.category === "Jelly") },
];

function MenuGrid({ items, onOpen }: { items: Artwork[]; onOpen: (art: Artwork, button: HTMLButtonElement) => void }) {
  return <div className="bc-food-grid">
    {items.map(art => <article className="bc-menu-card" key={art.id}>
      <button className="bc-menu-open" aria-label={`Open ${art.name}`} onClick={event => onOpen(art, event.currentTarget)}><BeadArt art={art} /></button>
      <div className="bc-menu-caption"><h3>{art.name}</h3><p className="bc-menu-price">{art.price}</p><p className="bc-menu-description">{art.description}</p></div>
    </article>)}
  </div>;
}

export function BeadClub({ loop = false, className }: BeadClubProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const lastCard = React.useRef<HTMLButtonElement | null>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = React.useState(0);
  const menuId = React.useId();
  const [scale, setScale] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = artworks.find(art => art.id === selectedId) ?? null;
  const category = menuSections[activeSection];
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(0, Math.min((entry.contentRect.width - (loop ? 34 : 16)) / 390, (entry.contentRect.height - (loop ? 42 : 24)) / PHONE_HEIGHT, 1))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [loop]);
  const open = (art: Artwork, button: HTMLButtonElement) => { lastCard.current = button; setSelectedId(art.id); };
  const close = () => { setSelectedId(null); requestAnimationFrame(() => lastCard.current?.focus({ preventScroll: true })); };
  return <div ref={host} className={`bc-stage ${className ?? ""}`} data-preview={loop ? "loop" : "interactive"}>
    <style>{styles}</style>
    <div className="bc-phone-space" style={{ width: 390 * (scale ?? 0), height: PHONE_HEIGHT * (scale ?? 0), visibility: scale === null ? "hidden" : "visible" }}><div className="bc-phone" style={{ width: 390, height: PHONE_HEIGHT, transform: `scale(${scale ?? 0})` }}>

      <div className="bc-screen" data-detail={!!selected}>
        <div className="bc-status" aria-hidden="true"><b>9:41</b><div className="bc-indicators"><svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8v3M5 6v5M9 3v8M13 0v11" stroke="currentColor" strokeWidth="2" /></svg><svg width="15" height="12" viewBox="0 0 15 12"><path d="M1 4Q7.5-1 14 4M3 7q4.5-4 9 0M6 10q1.5-2 3 0" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg><span className="bc-battery" /></div></div>
        <div className="bc-collection" inert={!!selected}>
          <header className="bc-header"><span>Little Bead Club</span><CakeSlice className="bc-food-icon" size={21} strokeWidth={1.8} aria-hidden="true" /></header>
          <nav className="bc-menu-tabs" aria-label="Pattern categories">{menuSections.map((section, index) => <button key={section.id} aria-pressed={activeSection === index} onClick={() => { setActiveSection(index); menu.current?.scrollTo({ top: 0, behavior: "instant" }); }}>{section.title}</button>)}</nav>
          <div ref={menu} className="bc-list" aria-label="Bead menu">
            <section className="bc-menu-section" key={category.id} aria-labelledby={`${menuId}-${category.id}`}>
              <h2 className="bc-sr-only" id={`${menuId}-${category.id}`}>{category.title}</h2>
              <MenuGrid items={category.items} onOpen={open} />
            </section>
          </div>
        </div>
        {selected && <CakeDetail key={selected.id} art={selected} onBack={close} />}
        <div className="bc-top-glass" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="bc-glass-edge" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="bc-glass-reflection" aria-hidden="true" />
        <div className="bc-home" aria-hidden="true" />
      </div>
      {/* Apple Design Resources product bezel; retain its separate asset terms. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bc-device-frame" src="/components/bead-club/iphone-16-pro-white.png" width="1406" height="2822" alt="" aria-hidden="true" draggable={false} />
    </div></div>
  </div>;
}

const styles = `
.bc-stage{width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent;color:#242a26;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;isolation:isolate}
.bc-stage *{box-sizing:border-box}.bc-stage button{cursor:pointer;font-family:inherit;color:inherit}.bc-stage button:focus-visible{outline:2px solid #3c5044;outline-offset:4px}.bc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.bc-phone-space{position:relative;flex-shrink:0;width:min(390px,calc(100% - 8px));aspect-ratio:1406/2822}.bc-phone{position:absolute;inset:0;width:100%;height:100%;transform-origin:top left;container-type:inline-size}.bc-device-frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:20}
.bc-screen{position:absolute;left:7.254623%;top:3.543586%;width:85.775249%;height:92.912828%;overflow:hidden;mask-image:url('/components/bead-club/iphone-screen-mask.svg');-webkit-mask-image:url('/components/bead-club/iphone-screen-mask.svg');mask-size:100% 100%;-webkit-mask-size:100% 100%;background:${APP_BACKGROUND};isolation:isolate}

.bc-status{height:55px;position:relative;display:flex;align-items:center;justify-content:space-between;padding:4px clamp(15px,6cqw,24px) 0 clamp(16px,6.7cqw,26px);z-index:12;font-size:14px;font-weight:600;color:#242a26;background:transparent}.bc-indicators{display:flex;align-items:center;gap:5px}.bc-battery{width:21px;height:10px;border-radius:3px;border:1px solid currentColor;position:relative}.bc-battery:before{content:'';position:absolute;inset:1px;background:currentColor;border-radius:1px}.bc-battery:after{content:'';position:absolute;width:2px;height:4px;right:-4px;top:2px;background:currentColor;border-radius:1px}
.bc-header::before,.bc-detail-nav::before{content:'';position:absolute;left:0;right:0;top:-55px;bottom:-28px;z-index:-1;background:transparent;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);-webkit-mask-image:linear-gradient(#000 0%,#000 68%,transparent 100%);pointer-events:none}
.bc-screen[data-detail="true"] .bc-collection{visibility:hidden}.bc-collection{position:relative;height:calc(100% - 55px);display:flex;flex-direction:column}.bc-header{position:absolute;top:0;left:0;right:0;z-index:8;flex-shrink:0;min-height:48px;color:#242a26;padding:6px 20px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:16px;font-weight:500;letter-spacing:-.25px}.bc-food-icon{flex-shrink:0;color:#171b18;filter:none;background:none;box-shadow:none}
.bc-menu-tabs{position:absolute;top:48px;left:0;right:0;display:flex;align-items:center;gap:8px;flex-shrink:0;overflow-x:auto;scrollbar-width:none;padding:4px 20px 8px;min-height:56px;z-index:8}.bc-menu-tabs button{flex-shrink:0;min-height:40px;border:1px solid #242a2614;border-radius:999px;background:#ffffff80;padding:0 16px;font-size:14px;font-weight:500;white-space:nowrap;color:#58635b}.bc-menu-tabs button[aria-pressed="true"]{color:#fff;background:#28332c;border-color:#28332c}
.bc-list{position:absolute;inset:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:116px 18px 132px;scrollbar-width:none}.bc-list::-webkit-scrollbar{display:none}.bc-menu-section{padding:0}.bc-food-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px;row-gap:20px;align-items:start}.bc-menu-card{min-width:0}.bc-menu-open{display:block;width:100%;height:auto;aspect-ratio:1;border:0;background:transparent;padding:0}.bc-menu-caption{padding:4px 2px 0;text-align:center}.bc-menu-caption h3{font-size:14px;line-height:1.3;font-weight:500;letter-spacing:-.1px;margin:0;overflow-wrap:anywhere}.bc-menu-price{font-size:12.5px;line-height:1.4;font-weight:400;margin:4px 0;color:#58635b}.bc-menu-description{font-size:12px;line-height:1.4;color:#58635b;margin:5px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.bc-stage svg{flex-shrink:0}
.bc-art{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(.5px 3px 1.5px #493d3033)}.bc-art-3d{position:relative;filter:none}.bc-art-3d>canvas{position:absolute;inset:0;pointer-events:none}
.bc-home{position:absolute;width:104px;height:4px;border-radius:4px;background:#424b45;bottom:9px;left:50%;transform:translateX(-50%);z-index:10}
.bc-top-glass{position:absolute;top:0;left:0;right:0;height:176px;pointer-events:none;z-index:6;background:transparent}.bc-top-glass i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(#000 60%,transparent);-webkit-mask-image:linear-gradient(#000 60%,transparent)}.bc-top-glass i:nth-child(2){height:150px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.bc-top-glass i:nth-child(3){height:128px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.bc-top-glass i:nth-child(4){height:106px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.bc-glass-edge{position:absolute;bottom:0;left:0;right:0;height:124px;pointer-events:none;z-index:9;background:transparent}.bc-glass-edge i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(transparent,#000 75%);-webkit-mask-image:linear-gradient(transparent,#000 75%)}.bc-glass-edge i:nth-child(2){top:20px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.bc-glass-edge i:nth-child(3){top:42px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.bc-glass-edge i:nth-child(4){top:64px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.bc-glass-reflection{position:absolute;inset:0;border-radius:inherit;z-index:7;pointer-events:none;box-shadow:inset 0 0 2px #fff4}
.bc-detail{position:absolute;inset:55px 0 0;background:${APP_BACKGROUND};z-index:8;overflow-y:auto;scrollbar-width:none;padding-bottom:58px}.bc-detail-nav{position:sticky;top:0;z-index:8;min-height:56px;display:flex;align-items:center;padding:0 12px;color:#242a26}.bc-icon{width:44px;height:44px;min-width:44px;min-height:44px;border:1px solid #242a2624;background:#ffffff50;backdrop-filter:blur(10px) saturate(1.25);-webkit-backdrop-filter:blur(10px) saturate(1.25);box-shadow:none;display:grid;place-items:center;border-radius:50%}.bc-icon svg{filter:none}.bc-board{display:block;width:calc(100% - 20px);border:0;background:transparent;height:clamp(180px,85cqw,330px);margin:0 10px;position:relative;padding:8px 0;display:flex;justify-content:center;align-items:center}.bc-board .bc-art{width:100%;height:100%}.bc-detail-caption{padding:16px 22px 0}.bc-detail-caption h2{min-width:0;font-size:17px;line-height:1.35;font-weight:500;letter-spacing:-.4px;margin:0;overflow-wrap:anywhere}.bc-detail-description{font-size:14px;line-height:1.5;color:#58635b;margin:8px 0 0}.bc-detail-caption .bc-menu-price{font-size:14px;margin-top:6px}
`;
