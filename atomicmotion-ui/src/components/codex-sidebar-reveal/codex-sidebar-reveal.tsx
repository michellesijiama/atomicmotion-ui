"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Folder,
  MessageSquare,
  Puzzle,
  Search,
  Settings,
  SquarePen,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type CodexSidebarRevealProps = {
  className?: string;
  loop?: boolean;
};

const ease = [0.45, 0, 0.55, 1] as const;
const hiddenSidebarChrome = { opacity: 0, x: -8 };
const visibleSidebarChrome = { opacity: 1, x: 0 };

const navItems = [
  { label: "New chat", icon: MessageSquare },
  { label: "Search", icon: Search },
  { label: "Plugins", icon: Puzzle },
  { label: "Automations", icon: Clock },
] as const;

const projects = ["Project Aster", "Project Vale", "Project North"];
const chats = ["Draft thread sample", "Interface note stub", "Placeholder dialogue"];
const workspaceActions = [
  { label: "Action One", icon: ArrowLeft, muted: false },
  { label: "Action Two", icon: ArrowRight, muted: true },
  { label: "Action Three", icon: SquarePen, muted: false },
] as const;

function AnimatedSidebarIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      initial={false}
      animate={{ rotate: open ? 0 : 0 }}
      transition={{ duration: 0.28, ease }}
    >
      <motion.rect
        x="3.25"
        y="4.25"
        width="13.5"
        height="11.5"
        rx="2.4"
        animate={{ opacity: open ? 1 : 0.82 }}
        transition={{ duration: 0.28, ease }}
      />
      <motion.line
        y1="5.2"
        y2="14.8"
        animate={{ x1: open ? 8.4 : 6.8, x2: open ? 8.4 : 6.8 }}
        transition={{ duration: 0.34, ease }}
      />
      <motion.line
        y1="8.2"
        y2="8.2"
        animate={{ x1: open ? 5.6 : 10.2, x2: open ? 6.7 : 12.6, opacity: open ? 0.42 : 0.7 }}
        transition={{ duration: 0.34, ease }}
      />
      <motion.line
        y1="11.8"
        y2="11.8"
        animate={{ x1: open ? 5.6 : 10.2, x2: open ? 6.7 : 12.6, opacity: open ? 0.42 : 0.7 }}
        transition={{ duration: 0.34, ease }}
      />
    </motion.svg>
  );
}

export function CodexSidebarReveal({ className, loop = false }: CodexSidebarRevealProps) {
  const [open, setOpen] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  React.useEffect(() => {
    if (!loop) return;

    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const revealSidebar = () => {
      setOpen(false);
      setPressed(true);
      openTimer = setTimeout(() => {
        setPressed(false);
        setOpen(true);
        closeTimer = setTimeout(() => setOpen(false), 2500);
      }, 190);
    };

    const pressTimer = setTimeout(revealSidebar, 1400);
    const interval = setInterval(revealSidebar, 5600);

    return () => {
      clearTimeout(pressTimer);
      clearInterval(interval);
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [loop]);

  const sidebarWidth = loop ? 250 : 290;
  const collapsedWidth = 0;

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent px-5 py-5 text-[#202124]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border border-black/5",
          loop ? "h-[560px] w-[620px]" : "h-[min(72vh,680px)] w-[min(100%,980px)]",
        )}
      >
        <div className="pointer-events-none absolute left-3 top-3 z-50 flex h-9 items-center gap-3">
          <motion.button
            type="button"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            animate={{
              scale: pressed ? 0.9 : 1,
              backgroundColor: pressed || open ? "#dedede" : "rgba(255,255,255,0)",
            }}
            transition={{ duration: 0.18, ease }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#4d4d4d] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
          >
            <AnimatedSidebarIcon open={open} />
          </motion.button>
          {workspaceActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                className={cn(
                  "pointer-events-auto inline-flex size-8 items-center justify-center text-[#5f6368] transition-colors hover:text-[#202124] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
                  item.muted && "text-[#c6c6c6]",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <motion.aside
          initial={false}
          animate={{ width: open ? sidebarWidth : collapsedWidth, borderRightWidth: open ? 1 : 0 }}
          transition={{ duration: 0.52, ease }}
          className="absolute inset-y-0 left-0 z-30 overflow-hidden border-black/10 bg-[#f0f0f0]"
          style={{ borderRightStyle: "solid" }}
        >
          <div className="flex h-full min-w-[250px] flex-col px-3 pb-3 pt-[68px]">
            <motion.div
              initial={false}
              animate={open ? visibleSidebarChrome : hiddenSidebarChrome}
              transition={{ duration: open ? 0.3 : 0.16, ease }}
              style={{ pointerEvents: open ? "auto" : "none" }}
              className="space-y-1"
              aria-hidden={!open}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    tabIndex={open ? 0 : -1}
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] text-[#333] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                  >
                    <Icon className="size-4 shrink-0 text-[#5d5d5d]" aria-hidden="true" />
                    <motion.span
                      initial={false}
                      animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }}
                      transition={{ duration: 0.28, ease }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  </button>
                );
              })}
            </motion.div>

            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 8 }}
              transition={{ duration: 0.34, delay: open ? 0.08 : 0, ease }}
              className="mt-7 min-w-[220px]"
            >
              <p className="px-2 text-[12px] text-[#8a8a8a]">Group One</p>
              <div className="mt-2 space-y-1">
                {projects.map((project, index) => (
                  <div
                    key={project}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg px-2 text-[13px]",
                      index === 0 ? "bg-black/6 text-[#202124]" : "text-[#4c4c4c]",
                    )}
                  >
                    <Folder className="size-4 shrink-0 text-[#737373]" aria-hidden="true" />
                    <span className="truncate">{project}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 8 }}
              transition={{ duration: 0.34, delay: open ? 0.14 : 0, ease }}
              className="mt-6 min-w-[220px]"
            >
              <p className="px-2 text-[12px] text-[#8a8a8a]">Group Two</p>
              <div className="mt-2 space-y-1">
                {chats.map((chat, index) => (
                  <div
                    key={chat}
                    className={cn(
                      "h-8 truncate rounded-lg px-2 py-1.5 text-[13px]",
                      index === 0 ? "bg-black/6 text-[#202124]" : "text-[#4c4c4c]",
                    )}
                  >
                    {chat}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={false}
              animate={open ? visibleSidebarChrome : hiddenSidebarChrome}
              transition={{ duration: open ? 0.3 : 0.16, ease }}
              style={{ pointerEvents: open ? "auto" : "none" }}
              className="mt-auto flex h-9 items-center gap-3 rounded-lg px-2 text-[13px] text-[#444]"
              aria-hidden={!open}
            >
              <Settings className="size-4 shrink-0 text-[#5d5d5d]" aria-hidden="true" />
              <motion.span
                initial={false}
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }}
                transition={{ duration: 0.28, ease }}
                className="whitespace-nowrap"
              >
                Settings
              </motion.span>
            </motion.div>
          </div>
        </motion.aside>

        <motion.div
          initial={false}
          animate={{ paddingLeft: open ? sidebarWidth : collapsedWidth }}
          transition={{ duration: 0.52, ease }}
          className="relative h-full bg-transparent"
        >
          <motion.div
            initial={false}
            animate={{ borderTopLeftRadius: open ? 24 : 0 }}
            transition={{ duration: 0.52, ease }}
            className="flex h-full flex-col overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{ paddingLeft: open ? 32 : 200, paddingRight: 32 }}
              transition={{ duration: 0.52, ease }}
              className="flex h-16 shrink-0 items-center border-b border-black/10"
            >
              <motion.div
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24, ease }}
                className="flex min-w-0 items-center"
              >
                <h3 className="truncate text-[21px] font-normal tracking-[-0.01em] text-[#202124]">
                  Website Creation
                </h3>
              </motion.div>
            </motion.div>

            <div className="flex-1" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
