import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("src/components/codex-sidebar-reveal/codex-sidebar-reveal.tsx"),
  index: read("src/components/codex-sidebar-reveal/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
};

const checks = [
  ["component exists", files.component.length > 0],
  ["component exports CodexSidebarReveal", files.component.includes("export function CodexSidebarReveal")],
  ["component uses framer motion", files.component.includes('from "framer-motion"')],
  ["component uses animated React sidebar icon", files.component.includes("function AnimatedSidebarIcon") && files.component.includes("<motion.svg") && !files.component.includes("PanelLeft")],
  ["component keeps workspace arrow controls visible", files.component.includes("workspaceActions") && files.component.includes("ArrowLeft") && files.component.includes("ArrowRight")],
  ["component uses 16px icons", !files.component.includes("size-5") && files.component.includes("className=\"size-4\"")],
  ["component keeps top controls fixed above layout", files.component.includes("absolute left-3 top-3 z-50") && files.component.includes("pointer-events-none")],
  ["component uses 12px top icon spacing", files.component.includes("absolute left-3 top-3 z-50 flex h-9 items-center gap-3")],
  ["component renders workspace pane title", files.component.includes("Website Creation") && !files.component.includes("MoreHorizontal")],
  ["component leaves workspace pane unfilled", !files.component.includes('backgroundColor: open ? "#ffffff"') && !files.component.includes("overflow-hidden bg-white")],
  ["component keeps codex system nav labels", files.component.includes('"New chat"') && files.component.includes('"Search"') && files.component.includes('"Plugins"') && files.component.includes('"Automations"') && files.component.includes("Settings")],
  ["component keeps sample content as placeholders", files.component.includes("Project Aster") && files.component.includes("Draft thread sample") && !files.component.includes("Atomic Motion") && !files.component.includes("Create expanded navigation")],
  ["component uses regular title weight", files.component.includes("text-[21px] font-normal") && !files.component.includes("text-[21px] font-semibold")],
  ["component keeps title visible while collapsed", files.component.includes("paddingLeft: open ? 32 : 200") && files.component.includes("animate={{ opacity: 1, x: 0 }}")],
  ["component rounds right workspace pane when sidebar opens", files.component.includes("borderTopLeftRadius: open ? 24 : 0")],
  ["component models collapsed and expanded widths", files.component.includes("collapsedWidth") && files.component.includes("sidebarWidth")],
  ["component keeps loop preview inside gallery card", files.component.includes('loop ? "h-[560px] w-[620px]"')],
  ["component has clickable top-left trigger", files.component.includes("aria-label={open ? \"Collapse sidebar\" : \"Expand sidebar\"}")],
  ["component animates sidebar width", files.component.includes("width: open ? sidebarWidth : collapsedWidth")],
  ["component removes sidebar border when collapsed", files.component.includes("borderRightWidth: open ? 1 : 0")],
  ["component shifts workspace when sidebar opens", files.component.includes("animate={{ paddingLeft: open ? sidebarWidth : collapsedWidth }}")],
  ["component hides sidebar chrome while collapsed", files.component.includes("hiddenSidebarChrome") && files.component.includes('style={{ pointerEvents: open ? "auto" : "none" }}')],
  ["component loop starts collapsed before press", files.component.includes("setOpen(false)") && files.component.includes("setPressed(true)")],
  ["component loop reveals after simulated click", files.component.includes("setOpen(true)") && files.component.includes("}, 190)")],
  ["component loops the sidebar demo", files.component.includes("setInterval(revealSidebar, 5600)")],
  ["index re-exports component", files.index.includes("CodexSidebarReveal")],
  ["component map imports component", files.map.includes("@/components/codex-sidebar-reveal")],
  ["component map exposes route", files.map.includes('"codex-sidebar-reveal"')],
  ["registry registers fifth UI", files.registry.includes('id: "codex-sidebar-reveal"') && files.registry.includes('index: "005"')],
  ["registry names component", files.registry.includes('title: "Codex Sidebar Reveal"')],
  ["registry points to component source", files.registry.includes("src/components/codex-sidebar-reveal/codex-sidebar-reveal.tsx")],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("codex sidebar reveal checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`codex sidebar reveal checks passed (${checks.length}/${checks.length}).`);
