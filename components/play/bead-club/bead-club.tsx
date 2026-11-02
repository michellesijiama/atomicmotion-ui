"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Flower2, Pause, Play } from "lucide-react";

export type BeadClubProps = {
  /** Plays a quiet demonstration on gallery cards. */
  loop?: boolean;
  /** Additional classes for the preview area. */
  className?: string;
};

type Bead = { x: number; y: number; color: string };
type BeadMaterial = "pressed" | "frosted" | "glitter" | "terry" | "jelly";
type Artwork = { material: BeadMaterial; id: string; name: string; price: string; description: string; category: "Bento" | "Mains" | "Sides"; background: string; beads: Bead[]; colors: string[]; translucentColors?: readonly string[] };
const PHONE_HEIGHT = 390 * 2822 / 1406;
const P = { white: "#fffdf2", cream: "#f8eccf", rim: "#a9cbd6", blue: "#75a8bc", rice: "#e8dfc9", green: "#82bc68", leaf: "#397f57", red: "#e85d50", orange: "#f39a54", yellow: "#f4ce69", brown: "#985737", dark: "#593e35" };

const APP_BACKGROUND = "#f2f2f2";
const JELLY_COLORS: Record<string, readonly string[]> = {
  sushi: ["#ff9a68", "#ef7654"],
  ramen: ["#bc7d41", "#e0a45c"],
};

// Original meal patterns; every occupied cell is replayed in color order.
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
  const roundedRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
      const dx = Math.max(x + r - px, 0, px - (x + w - 1 - r));
      const dy = Math.max(y + r - py, 0, py - (y + h - 1 - r));
      if (dx * dx + dy * dy <= r * r) dot(px, py, color);
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
  const broccoli = (x: number, y: number) => {
    rect(x - 1, y, 3, 4, P.green);
    for (const [dx,dy] of [[-2,0],[2,0],[0,-2]]) oval(x+dx,y+dy,2.5,2,P.leaf);
    dot(x - 1, y - 2, P.green); dot(x + 2, y, P.green);
  };
  const tomato = (x: number, y: number, size = 2) => { oval(x,y,size,size,P.red); dot(x-1,y-1,"#ffba8d"); dot(x,y-size,P.leaf); };
  const plate = () => { oval(20,25,18,13,P.rim); oval(20,24,17,12,P.white); oval(20,24,14,9,P.cream); };

  if (id.startsWith("bento-")) {
    // A tall, thin-rimmed lunch box, packed above a lower bed of rice.
    roundedRect(6,1,28,39,4,"#96755d"); roundedRect(7,2,26,37,3,"#efd8b5");
    roundedRect(8,3,24,35,2,"#fff9e9");
    const rice = id === "bento-salmon" ? "#c8a9b3" : "#fff9e9";
    roundedRect(8,22,24,16,2,rice); line(8,21,31,21,"#cfb79a");
    for(let y=23;y<37;y+=3)for(let x=9;x<31;x+=3){
      const shift=(y%2), color=id==="bento-salmon"?"#ad8593":"#dfcfb1";
      dot(x+shift,y,color); dot(x+1+shift,y+1,color);
      if((x+y)%4===0)dot(x,y+1,id==="bento-salmon"?"#e1c2c8":P.white);
    }
    const noodles = (x: number,y: number,w: number,h: number,base: string,edge: string) => {
      roundedRect(x,y,w,h,1,base);
      for(let row=0;row<h-1;row+=2)for(let i=0;i<w;i++){
        const py=Math.max(y,Math.min(y+h-1,y+row+Math.round(Math.sin(i*.9+row))));dot(x+i,py,edge);
      }
    };
    if(id === "bento-salmon") {
      noodles(17,5,8,14,"#d8a252","#a6783d");
      roundedRect(26,4,6,15,2,"#b57a43"); roundedRect(26,4,5,14,1,"#f0b16a");
      for(let y=6;y<17;y+=3)line(26,y,30,y+2,"#ffe0a0");
      for(const [x,y]of [[11,6],[16,6]]){oval(x,y,4,3,"#6e9853");oval(x,y,3,2,"#bed07f");dot(x,y,"#e2dfa4");dot(x+1,y+1,"#a4b369");}
      for(const y of [10,14,18]){
        roundedRect(8,y,8,4,1,"#c3a04e");roundedRect(8,y,7,3,1,"#f5d46e");line(9,y+1,13,y+1,"#fff0a9");dot(11,y+2,"#93a267");
      }
      for(const [x,y]of [[20,19],[24,20],[29,18]]){oval(x,y,2.5,2.5,"#987043");dot(x-1,y-1,"#b9945a");}
      line(26,18,30,17,"#e4d7aa");
    } else if(id === "bento-ebi") {
      broccoli(11,6); broccoli(17,6);
      tomato(11,12,2.5); tomato(17,12,2.5);
      noodles(8,15,12,6,"#efbb5b","#b98437");
      oval(28,9,4,5,"#e9dfbf"); oval(28,8,3,4,P.white);oval(28,9,2,3,"#f6ce4b");
      oval(28,17,4,4,"#987044");oval(29,16,2,2,"#b48b54");
      roundedRect(21,4,5,16,2,"#b88d3f");roundedRect(21,4,4,15,1,"#dbb25e");
      for(const [x,y]of [[22,6],[23,9],[22,12],[24,15],[22,17]])dot(x,y,"#f5d58a");
      polygon([[21,18],[20,22],[23,21],[25,23],[25,19]],"#d98142");
    } else if(id === "bento-chicken") {
      for(const [x,y]of [[11,5],[16,5],[10,9]]){oval(x,y,4,3,"#6f9e54");oval(x-1,y-1,3,2,"#a8c66c");}
      for(const [x,y]of [[13,8],[18,8],[16,12]]){oval(x,y,3,3,"#956a3b");oval(x,y-1,2,2,"#bd9556");dot(x+1,y-1,"#d5b47a");}
      noodles(22,4,10,11,"#f4ecd2","#c8c2a0");
      for(const [x,y]of [[10,16],[17,17]]){
        oval(x,y,2,4,"#c87242");oval(x,y-1,2,3,"#eb9a61");dot(x-1,y-1,P.dark);dot(x+1,y-1,P.dark);
        for(let dx=-2;dx<=2;dx+=2)line(x+dx,y+2,x+dx+(dx?Math.sign(dx):0),y+5,"#e98b54");
      }
      roundedRect(22,17,10,5,1,"#c59a42");roundedRect(22,17,9,4,1,"#f1c95e");
      for(let x=23;x<31;x+=2)line(x,17,x,20,"#ffe29a");line(22,19,30,19,"#d2aa4d");
    } else if(id === "bento-nori") {
      for(let y=4;y<20;y+=4)for(let x=9;x<31;x+=4){dot(x,y,"#dfcfb1");dot(x+1,y+1,"#dfcfb1");}
      oval(20,11,10,8,"#4b4b3c");oval(20,10,9,7,"#535242");
      oval(20,11,2.5,2.5,"#fff0b3");line(19,9,21,9,P.white);
      roundedRect(10,25,20,12,1,"#514e3d");rect(12,26,16,9,P.white);rect(15,35,11,2,"#514e3d");
      oval(20,29,3.5,3.5,"#b34d55");oval(20,28,2.5,2.5,"#d96971");dot(19,27,"#ee9190");
      for(const [x,y]of [[15,32],[18,33],[22,33],[25,32],[14,30]])dot(x,y,"#746149");
    }
  } else if (id === "steak") {
    plate();
    for(const [x,y]of [[25,11],[28,10],[31,12],[33,13]]) { line(x,y,x-2,y+8,"#cf994c"); line(x-1,y,x-3,y+7,P.yellow); }
    broccoli(10,14); broccoli(15,13);
    const outline=[[7,22],[10,18],[18,17],[24,20],[27,26],[24,31],[17,33],[10,31],[6,27]];
    polygon(outline,"#784332"); polygon([[9,22],[12,19],[18,19],[23,22],[25,26],[22,30],[16,31],[10,29],[8,26]],"#be7351");
    polygon([[11,23],[15,21],[20,22],[23,26],[20,29],[15,29],[11,27]],"#d99476");
    for(const [x,y]of [[10,22],[14,20],[18,21],[21,24]])line(x,y,x+4,y+6,"#8b4b36");
    rect(15,23,3,2,"#ffdf8f"); dot(16,23,P.white); dot(19,29,P.leaf); dot(12,28,P.leaf);
  } else if (id === "burger") {
    oval(20,36,18,2,P.rim); oval(20,35,17,2,P.white);
    oval(20,31,14,4,"#c98640"); roundedRect(6,28,29,5,2,"#efb965");
    roundedRect(5,25,30,5,2,"#754533"); line(8,26,31,26,"#a16542");
    polygon([[6,24],[34,24],[30,28],[24,26],[19,29],[14,26],[8,27]],"#ffcf53");
    for(let x=6;x<=34;x+=4)oval(x,23,3,2,P.leaf);
    roundedRect(6,20,29,3,1,P.red); line(9,21,30,21,"#ff9c71");
    roundedRect(5,16,31,5,2,"#ce8e40"); oval(20,15,15,7,"#f2bb63");
    oval(20,13,13,5,"#ffd581");
    for(const [x,y]of [[11,13],[17,11],[24,12],[29,15],[20,15],[14,16]])line(x,y,x+1,y,P.white);
  } else if (id === "pasta") {
    plate(); oval(20,24,12,8,"#77a46b");
    for (let row=0;row<5;row++) for(let step=0;step<15;step++) {
      const x=10+step, y=18+row*3+Math.round(Math.sin(step*.8+row)*1.5);
      dot(x,y,P.yellow); if(step%3!==0)dot(x+1,y,"#f9e0a1");
    }
    for(const [x,y]of [[11,20],[29,23],[18,29]])tomato(x,y,2.5);
    for(const [x,y]of [[16,17],[25,28],[28,18]]){oval(x,y,3,1,P.leaf);dot(x,y-1,P.green);}
    for(const [x,y]of [[14,25],[22,20],[25,25],[18,23],[21,30]])line(x,y,x+1,y,P.white);
  } else if (id === "ramen") {
    roundedRect(28,7,6,13,1,"#36594c"); line(29,8,29,17,"#6c8d64");
    for(let y=18;y<=33;y++){const w=Math.round(16-(y-18)*.36);rect(20-w,y,w*2+1,1,P.rim);}
    oval(20,33,11,3,P.rim); oval(20,16,17,7,"#688fa3"); oval(20,16,16,6,P.cream); oval(20,16,14,5,"#bc7d41");
    oval(20,16,12,3,"#e0a45c");
    for(let i=0;i<18;i++)dot(9+i,16+Math.round(Math.sin(i*1.1)*2),P.yellow);
    oval(12,16,5,2.5,"#ce9474"); oval(12,16,3,1.5,"#f4c3a6"); dot(12,16,"#c87f64");
    oval(27,17,4,3,P.white); oval(27,17,2,2,"#eeac46"); dot(27,16,P.yellow);
    for(const [x,y]of [[17,13],[21,14],[23,18],[18,20]]){dot(x,y,P.leaf);dot(x+1,y,P.green);}
    line(8,25,32,25,P.blue); line(10,30,30,30,P.blue); rect(17,35,7,2,P.blue);
  } else if (id === "sushi") {
    plate();
    for(const [x,y]of [[11,22],[23,29]]) { oval(x,y,7,5,"#3f5c4c");oval(x,y-1,6,4,P.white);oval(x,y-1,3,2,"#ff9a68");rect(x,y-2,2,2,P.green);dot(x-2,y,P.rice); }
    oval(25,15,9,4,P.rice); oval(25,14,9,4,P.white); oval(25,12,9,3,"#ef7654");
    for(const x of [20,24,28])line(x,10,x+2,14,"#ff9a68");
    oval(8,12,3,2,"#f2c1b4"); oval(10,10,2,1,"#ffdaca"); oval(32,31,3,2,P.green); dot(31,30,"#c4dea0");
  } else if (id === "salad") {
    plate();
    for(const [x,y]of [[10,21],[15,16],[22,16],[29,20],[28,27],[20,31],[12,28],[20,23]]) { oval(x,y,4,3,P.leaf);oval(x-1,y-1,3,2,P.green); }
    for(const [x,y]of [[13,19],[27,25],[18,29]])tomato(x,y,2.5);
    for(const [x,y]of [[21,19],[12,26]]){oval(x,y,3,2,"#629c68");oval(x,y,2,1,"#d3e3b0");dot(x,y,"#8fb075");}
    line(23,27,27,29,"#d7a5be"); line(16,22,19,24,"#d7a5be");
    for(const [x,y]of [[17,18],[23,24],[18,27]])rect(x,y,2,2,"#ffedb9");
  } else if (id === "tempura") {
    oval(20,29,18,9,P.rim); oval(20,28,17,8,P.white);
    for(const [sx,sy]of [[10,16],[19,13],[27,16]]) {
      for(let i=9;i>=0;i--){const x=sx+Math.round(Math.sin(i*.32)*3);oval(x,sy+i,2.5,2,"#d59743");oval(x-1,sy+i,2,1,"#f5cc74");if(i%3===0)dot(x,sy+i,P.cream);}
      polygon([[sx-2,sy],[sx-3,sy-5],[sx,sy-3],[sx+3,sy-5],[sx+2,sy]],"#e58255");
    }
    oval(28,32,4,3,P.yellow); oval(28,32,2,2,"#fff1b3"); line(25,30,30,34,P.white);
    oval(10,31,4,2,P.leaf); line(8,32,13,29,P.green);
  }
  // Finish each color before moving on; scatter placements within that color.
  const colorGroups = new Map<string, Bead[]>();
  for (const bead of cells.values()) {
    const group = colorGroups.get(bead.color);
    if (group) group.push(bead);
    else colorGroups.set(bead.color, [bead]);
  }
  const placementOrder = (bead: Bead) => ((bead.x * 73856093) ^ (bead.y * 19349663)) >>> 0;
  return [...colorGroups.values()].flatMap(group => group.sort((a,b)=>placementOrder(a)-placementOrder(b)||a.y-b.y||a.x-b.x));
}
const artworks: Artwork[] = [
  { id:"bento-salmon", name:"Salmon bento", price:"$18.50", description:"Grilled salmon, tamagoyaki, cucumber and meatballs over shiso rice.", category:"Bento", background:"#eee5d9" },
  { id:"bento-ebi", name:"Ebi fry bento", price:"$17.50", description:"Crispy prawn, egg, spaghetti, tomatoes and broccoli with rice.", category:"Bento", background:"#eee5d9" },
  { id:"bento-chicken", name:"Karaage bento", price:"$16.50", description:"Karaage chicken, octopus sausages, corn, sprouts and steamed rice.", category:"Bento", background:"#eee5d9" },
  { id:"bento-nori", name:"Nori bento", price:"$15.00", description:"Nori rice, a soft egg centre and a little umeboshi rice parcel.", category:"Bento", background:"#eee5d9" },
  { id:"steak", name:"Steak & fries", price:"$26.00", description:"Grilled steak with herb butter, golden fries and broccoli.", category:"Mains", background:"#e5edf0" },
  { id:"burger", name:"House burger", price:"$16.00", description:"Beef patty, cheddar, lettuce and tomato on a sesame bun.", category:"Mains", background:"#f4ead8" },
  { id:"pasta", name:"Pesto pasta", price:"$17.50", description:"Pasta tossed in basil pesto with cherry tomatoes and Parmesan.", category:"Mains", background:"#e8efdd" },
  { id:"ramen", name:"Tonkotsu ramen", price:"$18.00", description:"Rich pork broth, noodles, chashu, egg and spring onions.", category:"Mains", background:"#e3edf0" },
  { id:"sushi", name:"Salmon rolls", price:"$12.00", description:"Salmon nigiri and maki with cucumber, ginger and wasabi.", category:"Sides", background:"#e3edf0" },
  { id:"salad", name:"Garden salad", price:"$9.00", description:"Leafy greens, cucumber, cherry tomatoes and lemon dressing.", category:"Sides", background:"#e8efdd" },
  { id:"tempura", name:"Crispy tempura", price:"$11.00", description:"Golden prawn tempura with shiso and a wedge of lemon.", category:"Sides", background:"#f4ead8" },
].map(item=>{const beads=makePattern(item.id);return {...item, material:(JELLY_COLORS[item.id]?"jelly":item.id.startsWith("bento-")?"terry":"frosted") as BeadMaterial, translucentColors:JELLY_COLORS[item.id], category:item.category as Artwork["category"], beads, colors:[...new Set(beads.map(bead=>bead.color))]};});

function FlatBeadArt({ art, count = art.beads.length, animated = false }: { art: Artwork; count?: number; animated?: boolean }) {
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

function BeadArt({ art, count = art.beads.length, animated = false }: { art: Artwork; count?: number; animated?: boolean }) {
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
    {!ready && <div aria-hidden="true" style={{ display: "contents" }}><FlatBeadArt art={art} count={count} animated={animated} /></div>}
  </div>;
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
      <button className="bc-play-button" aria-label={playing ? "Pause" : progress >= 1 ? "Replay" : "Play"} aria-pressed={playing} aria-describedby={statusId} onClick={() => {
        if (progress >= 1) { setProgress(0); setPlaying(true); }
        else setPlaying(value => !value);
      }}>
        <svg className="bc-play-outline" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28.5" fill="none" stroke="#78827b" strokeWidth="1.5" /><circle className="bc-play-progress" cx="30" cy="30" r="28.5" fill="none" stroke="#3c5044" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} strokeLinecap="round" transform="rotate(-90 30 30)" /></svg>
        {playing ? <Pause className="bc-play-symbol" size={22} fill="currentColor" aria-hidden="true" /> : <Play className="bc-play-symbol" size={23} fill="currentColor" aria-hidden="true" />}
      </button>
      <span className="bc-sr-only" id={statusId} role="status">{progress >= 1 ? "Pattern complete." : playing ? "Playing pattern animation." : "Animation paused."}</span>
    </div></div>
  </motion.section>;
}


const menuSections = (["Bento", "Mains", "Sides"] as const).map(category => ({
  id: category.toLowerCase(), title: category, items: artworks.filter(art => art.category === category),
}));

function MenuShelf({ items, onOpen }: { items: Artwork[]; onOpen: (art: Artwork, button: HTMLButtonElement) => void }) {
  const start = React.useRef<{ x: number; left: number } | null>(null);
  const suppressClick = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);
  return <div className={`bc-shelf${dragging ? " bc-shelf-dragging" : ""}`} role="group" aria-label="Swipe to browse patterns"
    onPointerDown={event => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      start.current = { x: event.clientX, left: event.currentTarget.scrollLeft }; suppressClick.current = false;
    }}
    onPointerMove={event => {
      const point = start.current; if (!point) return;
      const delta = event.clientX - point.x;
      if (!suppressClick.current && Math.abs(delta) < 8) return;
      suppressClick.current = true; setDragging(true);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.scrollLeft = point.left - delta;
      event.preventDefault();
    }}
    onPointerUp={event => {
      start.current = null; setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (!suppressClick.current) return;
      const track = event.currentTarget;
      const step = (track.firstElementChild?.getBoundingClientRect().width ?? 0) + 16;
      if (step) track.scrollTo({ left: Math.round(track.scrollLeft / step) * step, behavior: "smooth" });
    }}
    onPointerCancel={() => { start.current = null; setDragging(false); suppressClick.current = false; }}
    onPointerLeave={() => { if (!suppressClick.current) start.current = null; }}
    onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
    {items.map(art => <article className="bc-menu-card" key={art.id}>
      <button className="bc-menu-open" aria-label={`Open ${art.name}`} onClick={event => onOpen(art, event.currentTarget)}><BeadArt art={art} /></button>
      <div className="bc-menu-caption"><div className="bc-menu-info"><h3>{art.name}</h3><p className="bc-menu-price">{art.price}</p><p className="bc-menu-description">{art.description}</p></div><button className="bc-play-button" aria-label={`Play ${art.name}`} onClick={event => onOpen(art, event.currentTarget)}><Play className="bc-play-symbol" size={23} fill="currentColor" aria-hidden="true" /></button></div>
    </article>)}
  </div>;
}

export function BeadClub({ loop = false, className }: BeadClubProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const lastCard = React.useRef<HTMLButtonElement | null>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<(HTMLElement | null)[]>([]);
  const [activeSection, setActiveSection] = React.useState(0);
  const menuId = React.useId();
  const reduced = !!useReducedMotion();
  const [scale, setScale] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = artworks.find(art => art.id === selectedId) ?? null;
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(0, Math.min((entry.contentRect.width - (loop ? 34 : 16)) / 390, (entry.contentRect.height - (loop ? 42 : 24)) / PHONE_HEIGHT, 1))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [loop]);
  React.useEffect(() => {
    if (!loop || reduced) return;
    const open = setTimeout(() => setSelectedId(artworks[0].id), 2600);
    const close = setTimeout(() => setSelectedId(null), 13600);
    const cycle = setInterval(() => {
      setSelectedId(artworks[0].id);
      const timer = setTimeout(() => setSelectedId(null), 11000);
      pending.push(timer);
    }, 16200);
    const pending: ReturnType<typeof setTimeout>[] = [];
    return () => { clearTimeout(open); clearTimeout(close); clearInterval(cycle); pending.forEach(clearTimeout); };
  }, [loop, reduced]);
  const open = (art: Artwork, button: HTMLButtonElement) => { lastCard.current = button; setSelectedId(art.id); };
  const close = () => { setSelectedId(null); requestAnimationFrame(() => lastCard.current?.focus({ preventScroll: true })); };
  return <div ref={host} className={`bc-stage ${className ?? ""}`} data-preview={loop ? "loop" : "interactive"}>
    <style>{styles}</style>
    <div className="bc-phone-space" style={{ width: 390 * (scale ?? 0), height: PHONE_HEIGHT * (scale ?? 0), visibility: scale === null ? "hidden" : "visible" }}><div className="bc-phone" style={loop ? { width: 390, height: PHONE_HEIGHT, transform: `scale(${scale ?? 0})` } : undefined}>

      <div className="bc-screen" data-detail={!!selected}>
        <div className="bc-status" aria-hidden="true"><b>9:41</b><div className="bc-indicators"><svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8v3M5 6v5M9 3v8M13 0v11" stroke="currentColor" strokeWidth="2" /></svg><svg width="15" height="12" viewBox="0 0 15 12"><path d="M1 4Q7.5-1 14 4M3 7q4.5-4 9 0M6 10q1.5-2 3 0" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg><span className="bc-battery" /></div></div>
        <div className="bc-collection" inert={!!selected}>
          <header className="bc-header"><span>little bead club</span><Flower2 className="bc-flower" size={24} strokeWidth={1.8} aria-hidden="true" /></header>
          <nav className="bc-menu-tabs" aria-label="Pattern categories">{menuSections.map((section, index) => <button key={section.id} aria-current={activeSection === index ? "location" : undefined} onClick={() => { const target = sectionRefs.current[index]; if (target && menu.current) menu.current.scrollTo({ top: target.offsetTop - 12, behavior: reduced ? "instant" : "smooth" }); }}>{section.title}</button>)}</nav>
          <div ref={menu} className="bc-list" aria-label="Bead menu" onScroll={event => { const top = event.currentTarget.scrollTop; let index = 0; sectionRefs.current.forEach((section, i) => { if (section && section.offsetTop <= top + 40) index = i; }); if (top + event.currentTarget.clientHeight >= event.currentTarget.scrollHeight - 1) index = menuSections.length - 1; setActiveSection(index); }}>
            {menuSections.map((section, index) => <section className="bc-menu-section" key={section.id} ref={element => { sectionRefs.current[index] = element; }} aria-labelledby={`${menuId}-${section.id}`}>
              <h2 id={`${menuId}-${section.id}`}>{section.title}</h2>
              <MenuShelf items={section.items} onOpen={open} />
            </section>)}
          </div>
        </div>
        <AnimatePresence>{selected && <Replay key={selected.id} art={selected} reduced={reduced} onBack={close} />}</AnimatePresence>
        <div className="bc-glass-edge" aria-hidden="true"><i /><i /><i /></div>
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
.bc-screen[data-detail="true"] .bc-collection{visibility:hidden}.bc-collection{position:relative;height:calc(100% - 55px);display:flex;flex-direction:column}.bc-header{position:relative;z-index:8;flex-shrink:0;min-height:68px;color:#242a26;padding:10px 20px 18px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:clamp(18px,5.65cqw,22px);font-weight:500;letter-spacing:-.35px}.bc-flower{flex-shrink:0;color:#fff;filter:drop-shadow(0 1px 1px #28362a99)}
.bc-menu-tabs{display:flex;gap:20px;flex-shrink:0;overflow-x:auto;scrollbar-width:none;padding:0 20px;min-height:48px;border-bottom:1px solid #242a2614;z-index:8}.bc-menu-tabs button{flex-shrink:0;position:relative;min-height:48px;border:0;background:transparent;padding:0;font-size:16px;font-weight:500;white-space:nowrap;color:#58635b}.bc-menu-tabs button[aria-current]{color:#242a26}.bc-menu-tabs button[aria-current]::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:currentColor;border-radius:3px}
.bc-list{position:relative;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 0 52px;scrollbar-width:none}.bc-list::-webkit-scrollbar,.bc-shelf::-webkit-scrollbar{display:none}.bc-menu-section{padding:0 0 28px;scroll-margin-top:12px}.bc-menu-section>h2{font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-.4px;margin:10px 20px 8px}.bc-shelf{display:flex;gap:16px;overflow-x:auto;overflow-y:hidden;padding:0 14px 14px;scroll-snap-type:x mandatory;scroll-padding:14px;scrollbar-width:none;overscroll-behavior-x:contain;cursor:grab}.bc-shelf-dragging{cursor:grabbing;scroll-snap-type:none;user-select:none}.bc-menu-card{flex:0 0 100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always}.bc-menu-open{display:block;width:100%;height:auto;aspect-ratio:1;border:0;background:transparent;padding:0;cursor:inherit!important}.bc-menu-caption{display:grid;grid-template-columns:minmax(0,1fr) 60px;column-gap:16px;align-items:start;min-height:80px;padding:6px}.bc-menu-caption h3{grid-column:1;grid-row:1;font-size:22px;line-height:1.25;font-weight:500;letter-spacing:-.4px;margin:0;min-width:0;overflow-wrap:anywhere}.bc-menu-caption .bc-play-button{border:1.5px solid #78827b;margin-top:2px;grid-column:2;grid-row:1 / 3}.bc-menu-info{display:contents}.bc-menu-price{grid-column:1;grid-row:2;font-size:18px;line-height:1.4;font-weight:500;margin:7px 0}.bc-menu-description{grid-column:1 / -1;grid-row:3;font-size:16px;line-height:1.5;color:#58635b;margin:8px 0 0}.bc-stage svg{flex-shrink:0}
.bc-art{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(.5px 3px 1.5px #493d3033)}.bc-art-3d{position:relative;filter:none}.bc-art-3d>canvas{position:absolute;inset:0;pointer-events:none}
.bc-home{position:absolute;width:104px;height:4px;border-radius:4px;background:#424b45;bottom:9px;left:50%;transform:translateX(-50%);z-index:10}
.bc-glass-edge{position:absolute;bottom:0;left:0;right:0;height:28px;pointer-events:none;z-index:6;background:transparent}.bc-glass-edge i{position:absolute;inset:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);mask-image:linear-gradient(transparent,#000);-webkit-mask-image:linear-gradient(transparent,#000)}.bc-glass-edge i:nth-child(2){top:10px;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.bc-glass-edge i:nth-child(3){top:18px;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}.bc-screen[data-detail="true"] .bc-glass-edge{height:32px}
.bc-glass-reflection{position:absolute;inset:0;border-radius:inherit;z-index:7;pointer-events:none;box-shadow:inset 0 0 2px #fff4}
.bc-detail{position:absolute;inset:55px 0 0;background:${APP_BACKGROUND};z-index:4;overflow-y:auto;scrollbar-width:none;padding-bottom:58px}.bc-detail-nav{position:sticky;top:0;z-index:8;min-height:56px;display:flex;align-items:center;padding:0 12px;color:#fff}.bc-icon{width:44px;height:44px;min-width:44px;min-height:44px;border:1px solid #fff9;background:#4e5b53cc;backdrop-filter:blur(10px) saturate(1.25);-webkit-backdrop-filter:blur(10px) saturate(1.25);box-shadow:inset 1px 1px 1px #fffc,0 3px 9px #17231a0b;display:grid;place-items:center;border-radius:50%}.bc-icon svg{filter:drop-shadow(0 1px 1px #28362acc)}.bc-board{height:clamp(180px,85cqw,330px);margin:0 10px;position:relative;padding:8px 0;display:flex;justify-content:center;align-items:center}.bc-board .bc-art{width:100%;height:100%}.bc-detail-caption{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px 0}.bc-detail-caption h2{flex:1;min-width:0;font-size:1.375rem;line-height:1.35;font-weight:500;letter-spacing:-.4px;margin:0;overflow-wrap:anywhere}.bc-playback{flex:0 0 auto;position:relative}.bc-play-button{position:relative;display:grid;place-items:center;width:60px;height:60px;aspect-ratio:1;border:0;border-radius:50%;background:linear-gradient(145deg,#ffffff80,#ffffff20 48%,#ffffff45);backdrop-filter:blur(12px) saturate(1.3);-webkit-backdrop-filter:blur(12px) saturate(1.3);box-shadow:inset 1px 1px 1px #fffe,inset -1px -1px 2px #ffffff80,0 5px 16px #24372b12;color:#304236;padding:0;flex-shrink:0}.bc-play-button::before{content:'';position:absolute;inset:2px;border-radius:50%;background:radial-gradient(ellipse at 28% 14%,#ffffff90,transparent 65%);pointer-events:none}.bc-play-button[aria-pressed="true"]{box-shadow:inset 1px 1px 1px #fff,inset -1px -1px 3px #ffffff80,0 3px 12px #24372b16}.bc-play-outline{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.bc-play-symbol{position:relative;margin-left:0}.bc-play-symbol.lucide-play{margin-left:2px}.bc-play-progress{transition:stroke-dashoffset .08s linear}

.bc-bead-drop{animation:bc-place .24s cubic-bezier(.2,.65,.3,1) both}@keyframes bc-place{from{opacity:0;transform:translateY(-.5px)}to{opacity:1;transform:translateY(0) scale(1)}}@container(max-width:280px){.bc-indicators{gap:3px}.bc-indicators svg{width:13px}.bc-battery{width:18px}}@media(prefers-reduced-motion:reduce){.bc-stage *{animation:none!important;transition:none!important}}`;
