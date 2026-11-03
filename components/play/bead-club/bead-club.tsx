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
type Artwork = { id: string; name: string; price: string; description: string; category: "Tarts" | "Cakes"; beads: Bead[]; material: BeadMaterial; translucentColors?: readonly string[] };
const PHONE_HEIGHT = 390 * 2822 / 1406;
const APP_BACKGROUND = "#f2f2f2";
// Simplified from the user-supplied cake illustration sheet. Each occupied cell
// represents one bead, with 166–177 beads per cake and a limited color palette.
// The reference artwork retains its own rights, separate from the component code.
const cakePatterns: Record<string, { palette: string[]; rows: string[] }> = {
  "lavender-grape-tart": {
    "palette": [
      "#b0696e",
      "#deba94",
      "#f2c884",
      "#d67e72",
      "#e4a66a",
      "#dea928",
      "#eebe6b",
      "#e6b145",
      "#f7c5b8",
      "#d2a696",
      "#edbca6",
      "#d79e7f",
      "#e68987",
      "#c86c37",
      "#dc8b4d",
      "#a24d31"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "..............bf........",
      ".............520f.......",
      ".........efe761eff0a....",
      "......a27622245dffe68...",
      "....83d7576667e64dd788..",
      "...8bee5557757776ed68a..",
      "...8ee446a166a42146a8a..",
      "..884488a9a1a991a8888...",
      "..0bba8ab0bb3b9bb1a99...",
      "...3c3df3c3cc33c33cf....",
      "...d4eddeeeeeeeeee3f....",
      "...ffdddddddddddddf.....",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "rose-lychee-tart": {
    "palette": [
      "#f6382a",
      "#f31505",
      "#e3a76a",
      "#e6c393",
      "#f5e0ca",
      "#f6ebda",
      "#f2d9bb",
      "#f3d091",
      "#f8daa7",
      "#eecba1",
      "#f89d76",
      "#dcb981",
      "#e18761",
      "#f0b786",
      "#e45f39",
      "#d38538"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "...............00.......",
      "...............000......",
      "..........00e8c110c.....",
      ".........a1002bf2e0e....",
      "......784d01ed366dce....",
      "....8884499346d9d656....",
      "...88964dd66466569646...",
      "...877d87799939646389...",
      "...2787b33999739969a....",
      "....23233bb3bb33993d....",
      "....fffcccccccbbbb9dc...",
      "....ffffffffeec2ccce....",
      ".....fffffffffffffef....",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "pistachio-roll": {
    "palette": [
      "#f2dcc4",
      "#7b8623",
      "#ceca99",
      "#a5ae56",
      "#b7bd6c",
      "#c6be7d",
      "#f7d1a1",
      "#e8cc89",
      "#efce97",
      "#e5cea9",
      "#e3a891",
      "#d1ca70",
      "#f4c99a",
      "#e7bd93",
      "#d27667",
      "#eebaa6"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "..............99d.......",
      "............15009d......",
      "...........139009dd.....",
      ".........34320999dd.....",
      "......3434334009994.....",
      ".....4444444459995b5....",
      "...77777786c6888866f....",
      "...77ccccc778c86886f....",
      "...bbbb97bbbbbbbbb7f....",
      "...bbbb8d77b8877bbcf....",
      "...76cccdadcaddcdc6f....",
      "...ffffafaaaeeeeaa0f....",
      "...fadfdaaadd...........",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "bayberry-lychee-cake": {
    "palette": [
      "#e8b832",
      "#dbb666",
      "#dba50f",
      "#e2ce99",
      "#ddc68c",
      "#e4d7ab",
      "#d7c7a7",
      "#eae6d9",
      "#cab7a2",
      "#d2bd92",
      "#dad1be",
      "#caaf7e",
      "#ecd79d",
      "#c8a144",
      "#e8d18d",
      "#eacd79"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "..........fbbce.........",
      ".........01d654f........",
      "........200d1d1ef.......",
      ".......2200fd2d003......",
      "......222200220e3aa.....",
      "......022015a569bb6.....",
      ".....7e0f3699b9bbb6.....",
      "....7769699b85f687a.....",
      "....b9b98888022b36a.....",
      "....157a8bd20b955b8.....",
      ".....691140db434338.....",
      ".....911f1b3e34333......",
      ".....1333c4ccec496......",
      ".....eccc4bbbb..........",
      ".....bb.................",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "blueberry-basque": {
    "palette": [
      "#d6a5b3",
      "#b57d90",
      "#d2b97a",
      "#3c484e",
      "#c592a2",
      "#e5c0d1",
      "#5f5a64",
      "#9d6c74",
      "#806a46",
      "#93944b",
      "#7a6d72",
      "#b0774a",
      "#8b8751",
      "#7c816a",
      "#876463",
      "#6d7580"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "...............0........",
      "..............045.......",
      "..............4100......",
      "............361114......",
      ".........1476614105.....",
      "......4100246364114.....",
      "....e1414420a3a4445.....",
      "....77777771a361405b....",
      "....9999ce77e3e17148....",
      "....88888ccc99ce777b....",
      ".....ffffa888888668b....",
      ".....fffd9cdccc9ff6b....",
      ".....e7aaddfc999ffa.....",
      "......eeeaaaddddffa.....",
      "............eaaaac8.....",
      ".................88.....",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "mango-lychee-basque": {
    "palette": [
      "#d4c3a0",
      "#e2d4bc",
      "#cb917e",
      "#c75e63",
      "#b28d8b",
      "#b3a580",
      "#f1e2d4",
      "#e5bec2",
      "#969b59",
      "#c3a59d",
      "#dbb8b7",
      "#d5adae",
      "#c7b19d",
      "#987a6a",
      "#a79a6c",
      "#878a4a"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "...........100..........",
      "..........160001........",
      "..........16100161......",
      "..........1cc22216......",
      ".......a77ff233e161.....",
      "....a7677794023c666.....",
      "....e5559a77aa01661.....",
      "....888888e5caaab7......",
      ".....ac9cc55e888eb......",
      "....ba9c994ba9cefb......",
      "....7aaaaabb99b7bb......",
      "....74ddde9c9cc997b.....",
      ".....59444dddde8fb7.....",
      ".....f88e5544ddb59b.....",
      "...........8e5cbbba.....",
      "...............ffba.....",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "guava-crepe-cake": {
    "palette": [
      "#e1da8d",
      "#f7cecc",
      "#f2c1c0",
      "#cabb3e",
      "#e89f9e",
      "#a3a37b",
      "#ef7a66",
      "#b6b18f",
      "#b0ba62",
      "#839b63",
      "#ce9182",
      "#bdb270",
      "#718f49",
      "#c9b19e",
      "#e0bab3",
      "#fbe2e6"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "............036.........",
      "..........600066........",
      ".....21112b8886622......",
      "....72221f03333ce1e.....",
      "....5577ddebbd7ca12.....",
      "....b8bd757d44ea42......",
      "....888888dd77d41e......",
      "....77bb888b877d4a......",
      ".....9577bb888d2aa......",
      ".....e599577b8b14a......",
      "....5e44d9c995d1ea4.....",
      ".....c9d142e599eee1.....",
      "........997e44dee12.....",
      "...........c997ff1......",
      "...............a2.......",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "yogurt-mille-feuille": {
    "palette": [
      "#edb886",
      "#dea16c",
      "#edd5af",
      "#fae6c4",
      "#fffcf3",
      "#e89615",
      "#eedcbc",
      "#f3e0be",
      "#957e22",
      "#b8c4d2",
      "#99b1d2",
      "#96b2d6",
      "#809bbf",
      "#9db5d7",
      "#92abcd",
      "#a3bad9"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      ".................0......",
      ".................0......",
      "..............88.11.0...",
      "..............81.1120...",
      "..............8811101...",
      "..........2732885101....",
      "........27363055811.....",
      "......6276666605555.....",
      ".....23226666662555.....",
      "...6322267777774155.....",
      "...9999999999999999.....",
      "...9faaaaeaeaaadebf.....",
      "...aeedffaaeeeadeaf.....",
      "...fdeaffeeffddaeaa.....",
      "...fdeeeeddddbaeeda.....",
      "......c........cc.......",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  },
  "raspberry-basque": {
    "palette": [
      "#d1b494",
      "#b65034",
      "#f5ca6f",
      "#f8f5ec",
      "#c3925e",
      "#f3ede1",
      "#dec7a3",
      "#eee6d8",
      "#e0c9be",
      "#e7d6c4",
      "#d3aa71",
      "#c8943d",
      "#d0ba51",
      "#dbd375",
      "#d6c963",
      "#e5df82"
    ],
    "rows": [
      "........................",
      "........................",
      "........................",
      "........................",
      "..............aa........",
      "............42141.......",
      "............12bb1.......",
      "..........b011111.......",
      "......662ce98411a9......",
      ".....3337955959664c.....",
      "....9577555597737693....",
      "....8888888988999573....",
      "....898888888889888.....",
      "....899999988880ba8.....",
      "....4aa00660686bccc.....",
      "....edcceecccccedfe.....",
      "....ffddddeeddfeced.....",
      "....dddddffffffdcec.....",
      ".............dddedc.....",
      "........................",
      "........................",
      "........................",
      "........................",
      "........................"
    ]
  }
};

const artworks: Artwork[] = [
  { id: "lavender-grape-tart", name: "Lavender grape tart", price: "$9.50", description: "Lavender cream, blackcurrant and grapes in a buttery tart shell.", category: "Tarts" },
  { id: "rose-lychee-tart", name: "Rose lychee tart", price: "$9.00", description: "Rose cream, juicy lychee and berries on a crisp tart base.", category: "Tarts" },
  { id: "pistachio-roll", name: "Pistachio roll cake", price: "$9.50", description: "Pistachio rolls layered with lychee cream and bayberry filling.", category: "Cakes" },
  { id: "bayberry-lychee-cake", name: "Bayberry lychee cake", price: "$8.50", description: "Airy sponge, fresh cream and a bright fruit topping.", category: "Cakes" },
  { id: "blueberry-basque", name: "Blueberry basque", price: "$9.50", description: "Blueberry cheesecake with pistachio cream and a flower finish.", category: "Cakes" },
  { id: "mango-lychee-basque", name: "Mango lychee basque", price: "$9.00", description: "Soft fruit cream, lychee pieces and layers of pistachio cake.", category: "Cakes" },
  { id: "guava-crepe-cake", name: "Guava crepe cake", price: "$9.50", description: "Pink guava cream, pistachio crepe rolls and fresh fruit.", category: "Cakes" },
  { id: "yogurt-mille-feuille", name: "Yogurt mille feuille", price: "$10.00", description: "Delicate blue layers, yogurt cream and golden physalis.", category: "Cakes" },
  { id: "raspberry-basque", name: "Raspberry basque", price: "$9.00", description: "Pistachio cheesecake, raspberry cream and a fresh berry.", category: "Cakes" },
].map(art => {
  const pattern = cakePatterns[art.id];
  const beads = pattern.rows.flatMap((row, y) => [...row].flatMap((color, x) => color === "." ? [] : [{ x, y, color: pattern.palette[parseInt(color, 16)] }]));
  return { ...art, category: art.category as Artwork["category"], material: "terry", beads };
});

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
  return <svg viewBox="0 0 24 24" role="img" aria-label={`${art.name} ${art.material} fused bead pattern`} className="bc-art" data-material={art.material} style={art.material === "jelly" ? { opacity: .8 } : undefined}>
    <defs>
      <filter id={`${id}-edge`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation=".14" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -5.5" />
      </filter>
      <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x="-1" y="-1" width="26" height="26" style={{ maskType: "alpha" }}>
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
    path.moveTo(corners[0].entry.x - 12, 12 - corners[0].entry.y);
    for (let i = 0; i < corners.length; i++) {
      const { p, exit } = corners[i], next = corners[(i + 1) % corners.length];
      path.quadraticCurveTo(p.x - 12, 12 - p.y, exit.x - 12, 12 - exit.y);
      const dx = next.p.x - p.x, dy = next.p.y - p.y, length = Math.hypot(dx, dy);
      // A restrained scallop keeps each melted bead visible along the cut edge.
      const mx = (exit.x + next.entry.x) / 2 + dy / length * .04;
      const my = (exit.y + next.entry.y) / 2 - dx / length * .04;
      path.quadraticCurveTo(mx - 12, 12 - my, next.entry.x - 12, 12 - next.entry.y);
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
  const color = document.createElement("canvas"); color.width = 24 * resolution; color.height = 24 * resolution;
  const ctx = color.getContext("2d")!;
  ctx.fillStyle = art.beads[0]?.color ?? "#f0eade"; ctx.fillRect(0, 0, color.width, color.height);
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect((bead.x - .2) * resolution, (bead.y - .2) * resolution, resolution * 1.4, resolution * 1.4); }
  for (const bead of art.beads) { ctx.fillStyle = bead.color; ctx.fillRect(bead.x * resolution, bead.y * resolution, resolution, resolution); }
  const fused = document.createElement("canvas"); fused.width = color.width; fused.height = color.height;
  const fusedCtx = fused.getContext("2d")!; fusedCtx.filter = "blur(.7px)"; fusedCtx.drawImage(color, 0, 0);
  const image = fusedCtx.getImageData(0, 0, color.width, color.height);
  for (let pixel = 0; pixel < color.width * color.height; pixel++) {
    const i = pixel * 4;
    const grainPixel = Math.floor(Math.floor(pixel / color.width) / color.height * 1344) * 1280 + Math.floor((pixel % color.width) / color.width * 1280);
    const pearl = !terry && beadGrain ? beadGrain[grainPixel * 4] / 255 : .86;
    const tint = surface.pigment[grainPixel] * (1 + (pearl - .86) * .15);
    for (let c = 0; c < 3; c++) image.data[i + c] *= tint;
  }
  ctx.putImageData(image, 0, 0);
  for (const bead of art.beads) {
    const x = bead.x * resolution, y = bead.y * resolution;
    const lip = ctx.createLinearGradient(x, y, x + resolution, y + resolution);
    lip.addColorStop(0, "#ffffff32"); lip.addColorStop(.3, "#ffffff00"); lip.addColorStop(.72, "#ffffff00"); lip.addColorStop(1, "#4a382423");
    ctx.fillStyle = lip; ctx.fillRect(x, y, resolution, resolution);
    ctx.beginPath(); ctx.roundRect(x + .45, y + .45, resolution - .9, resolution - .9, 2.5);
    ctx.strokeStyle = "#ffffff2b"; ctx.lineWidth = .7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + resolution - .6, y + 3); ctx.lineTo(x + resolution - .6, y + resolution - 2); ctx.quadraticCurveTo(x + resolution - .6, y + resolution - .6, x + resolution - 2, y + resolution - .6); ctx.lineTo(x + 3, y + resolution - .6);
    ctx.strokeStyle = "#5c493d18"; ctx.lineWidth = .65; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + resolution * .5, y + resolution * .5, resolution * .11, resolution * .09, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#574b3614"; ctx.fill();
  }
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
    map, normalMap: surface.normal, normalScale: new THREE.Vector2(.38, .38),
    color: new THREE.Color(1.1, 1.1, 1.1), roughness: 1, metalness: 0, specularIntensity: .06,
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
    const uv = (vertices: number[], index: number) => new THREE.Vector2((vertices[index * 3] + 12) / 24, (vertices[index * 3 + 1] + 12) / 24);
    geometry = new THREE.ExtrudeGeometry(fusedShapes(art.beads.slice(0, count)), {
      depth: .34, curveSegments: 3, bevelEnabled: true, bevelThickness: .13, bevelSize: .14, bevelSegments: 4, steps: 1,
      UVGenerator: { generateTopUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)), generateSideWallUV: (_g, vertices, ...indices) => indices.map(i => uv(vertices, i)) },
    });
    if (count === art.beads.length) studio.completed.set(art.id, geometry);
  }
  const materials = studio.materials.get(art.id) ?? physicalMaterials(art); studio.materials.set(art.id, materials);
  studio.mesh.geometry = geometry; studio.mesh.material = materials.faces;
  const aspect = width / height, viewHeight = Math.max(26, 26 / aspect);
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
  { id: "tarts", title: "Tarts", items: artworks.filter(art => art.category === "Tarts") },
  { id: "cakes", title: "Cakes", items: artworks.filter(art => art.category === "Cakes") },
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
          <div ref={menu} className="bc-list" aria-label="Cake menu">
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
