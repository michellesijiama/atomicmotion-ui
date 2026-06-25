"use client";

import * as React from "react";
import { Clock, Folder, MessageSquare, PanelLeft, Puzzle, Search, Settings } from "lucide-react";
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

const projects = ["Atomic Motion", "Sijia Website", "Lumen"];
const chats = ["Create expanded navigation", "Filter dropdown reveal", "Emoji sketch sidebar"];

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
  const collapsedWidth = loop ? 54 : 62;

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent px-5 py-5 text-[#202124]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border border-black/5 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)]",
          loop ? "h-[560px] w-[620px]" : "h-[min(72vh,680px)] w-[min(100%,980px)]",
        )}
      >
        <motion.aside
          initial={false}
          animate={{ width: open ? sidebarWidth : collapsedWidth }}
          transition={{ duration: 0.52, ease }}
          className="absolute inset-y-0 left-0 z-30 overflow-hidden border-r border-black/10 bg-[#f0f0f0]"
        >
          <div className="flex h-full min-w-[250px] flex-col px-3 py-3">
            <div className="flex h-9 items-center gap-2">
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
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#4d4d4d] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
              >
                <PanelLeft className="size-4" aria-hidden="true" />
              </motion.button>
              <motion.span
                initial={false}
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }}
                transition={{ duration: 0.26, ease }}
                className="whitespace-nowrap text-[13px] font-medium text-[#202124]"
              >
                Codex
              </motion.span>
            </div>

            <motion.div
              initial={false}
              animate={open ? visibleSidebarChrome : hiddenSidebarChrome}
              transition={{ duration: open ? 0.3 : 0.16, ease }}
              style={{ pointerEvents: open ? "auto" : "none" }}
              className="mt-6 space-y-1"
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
              <p className="px-2 text-[12px] text-[#8a8a8a]">Projects</p>
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
              <p className="px-2 text-[12px] text-[#8a8a8a]">Chats</p>
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
          className="relative flex h-full flex-col bg-[#fbfbfb]"
        >
          <div className="flex h-14 shrink-0 items-center border-b border-black/10 px-5">
            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0.72, x: open ? 0 : -6 }}
              transition={{ duration: 0.32, ease }}
              className="h-7 w-[min(260px,55%)] rounded-full bg-[#ededed]"
            />
            <div className="ml-auto flex gap-2">
              <span className="size-7 rounded-full bg-[#ededed]" />
              <span className="h-7 w-16 rounded-full bg-[#ededed]" />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between px-7 py-6">
            <div className="space-y-3">
              <motion.div
                initial={false}
                animate={{ width: open ? "52%" : "64%" }}
                transition={{ duration: 0.52, ease }}
                className="h-4 rounded-full bg-[#e9e9e9]"
              />
              <motion.div
                initial={false}
                animate={{ width: open ? "66%" : "78%" }}
                transition={{ duration: 0.52, ease }}
                className="h-4 rounded-full bg-[#eeeeee]"
              />
            </div>

            <motion.div
              initial={false}
              animate={{ width: open ? "72%" : "82%" }}
              transition={{ duration: 0.52, ease }}
              className="mx-auto h-14 rounded-2xl border border-black/8 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.06)]"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
