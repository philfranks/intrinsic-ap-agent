"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRight,
  ChevronsUpDown,
  Home,
  Inbox,
  Layers,
  LogOut,
  Moon,
  PanelLeft,
  Receipt,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { MARK } from "@/lib/brand/mark";
import { LOGOTYPE_H, SECONDARY_GAP } from "@/lib/brand/logotype";
import { useTheme } from "@/lib/use-theme";
import { InvoiceIntake } from "@/components/ap/invoice-intake";
import { Topbar } from "./topbar";

const EXPO = [0.16, 1, 0.3, 1] as const;

type Icon = React.ComponentType<{ className?: string; size?: number }>;

type Agent = { id: string; label: string; icon: Icon; items: { id: string; label: string }[] };

/** Agents in the rail. Each one is a top-level item with an icon; its pages are text-only sub items. */
const AGENTS: Agent[] = [
  {
    id: "foundation",
    label: "Foundation",
    icon: Layers,
    items: [
      { id: "business-map", label: "Business map" },
      { id: "connections", label: "Connections" },
      { id: "opportunities", label: "Opportunities" },
      { id: "evaluations", label: "Evaluations" },
      { id: "packages", label: "Packages" },
    ],
  },
  {
    id: "ap",
    label: "Accounts Payable",
    icon: Receipt,
    items: [
      { id: "intake", label: "Intake" },
      { id: "invoices", label: "Invoices" },
      { id: "settings", label: "Settings" },
    ],
  },
];

/** Pages outside the agents: id → [group, title]. */
const PAGES: Record<string, [string, string]> = {
  home: ["Workspace", "Home"],
  inbox: ["Workspace", "Inbox"],
  "control-panel": ["Workspace", "Control Panel"],
};

function titleFor(page: string): [string, string] {
  if (PAGES[page]) return PAGES[page];
  const [agentId, itemId] = page.split("/");
  const agent = AGENTS.find((a) => a.id === agentId);
  const item = agent?.items.find((i) => i.id === itemId);
  return [agent?.label ?? "", item?.label ?? ""];
}

/* ───────── Brand ───────── */

function SignalMark({ height }: { height: number }) {
  return (
    <svg viewBox={`0 0 ${MARK.w} ${MARK.h}`} height={height} width={(height * MARK.w) / MARK.h} aria-hidden="true">
      {MARK.paths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Secondary lockup: the Signal with the horizontal logotype, built to the brand repo's geometry. */
function Lockup({ height }: { height: number }) {
  const h = LOGOTYPE_H.h;
  const s = h / MARK.h;
  const mw = MARK.w * s;
  const gap = h * SECONDARY_GAP;
  const w = mw + gap + LOGOTYPE_H.w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} height={height} width={(height * w) / h} role="img" aria-label="Intrinsic Labs">
      <g fill="currentColor">
        <g transform={`scale(${s})`}>
          {MARK.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g transform={`translate(${mw + gap} 0)`}>
          {LOGOTYPE_H.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/* ───────── Responsive ───────── */

const NARROW = "(max-width: 1023px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(NARROW);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

/* ───────── Shell ───────── */

type Flyout = { key: string; top: number; agent?: Agent; label?: string };

export function AppShell() {
  const [page, setPage] = useState("ap/intake");
  const [userCollapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ foundation: true, ap: true });
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrow = useNarrow();
  const collapsed = narrow || userCollapsed;
  const currentAgent = page.includes("/") ? page.split("/")[0] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
      if (e.key === "Escape") setFlyout(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Flyouts only exist while the rail is collapsed.
  const showFlyout = useCallback(
    (key: string, el: HTMLElement, content: { agent?: Agent; label?: string }) => {
      if (!collapsed) return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      const r = el.getBoundingClientRect();
      setFlyout({ key, top: r.top, ...content });
    },
    [collapsed],
  );
  const hideFlyout = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setFlyout(null), 140);
  }, []);
  const keepFlyout = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const go = (id: string) => {
    setPage(id);
    setFlyout(null);
  };

  const hoverProps = (key: string, label: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showFlyout(key, e.currentTarget, { label }),
    onMouseLeave: hideFlyout,
    onFocus: (e: React.FocusEvent<HTMLElement>) => showFlyout(key, e.currentTarget, { label }),
    onBlur: hideFlyout,
  });

  const item = (id: string, label: string, Icon: Icon, extra?: React.ReactNode) => (
    <button type="button" className="nav-item" aria-current={page === id ? "page" : undefined} onClick={() => go(id)} {...hoverProps(id, label)}>
      <Icon className="nav-icon" />
      <span className="nav-label">{label}</span>
      {extra}
    </button>
  );

  return (
    <div className="app" data-rail={collapsed ? "collapsed" : undefined}>
      <nav className="nav" aria-label="Primary">
        <div className="nav-top">
          <a className="brand" href="#" aria-label="Intrinsic Labs" onClick={(e) => e.preventDefault()}>
            {collapsed ? <SignalMark height={18} /> : <Lockup height={15} />}
          </a>
          <button
            type="button"
            className="icon-btn"
            hidden={narrow}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title="Toggle sidebar (⌘\)"
            onClick={() => {
              setCollapsed((c) => !c);
              setFlyout(null);
            }}
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <div className="nav-scroll" onScroll={() => setFlyout(null)}>
          <button type="button" className="workspace" aria-label="Switch workspace" {...hoverProps("ws", "Certified Cultivators")}>
            <span className="ws-mark">CC</span>
            <span className="ws-name">Certified Cultivators</span>
            <ChevronsUpDown size={14} className="ws-chev" />
          </button>

          <button type="button" className="nav-item" {...hoverProps("search", "Search  ⌘K")}>
            <Search className="nav-icon" />
            <span className="nav-label">Search</span>
            <span className="kbd">⌘K</span>
          </button>
          {item("home", "Home", Home)}
          {item("inbox", "Inbox", Inbox, <span className="nav-badge">3</span>)}

          <div className="nav-group">
            <div className="nav-group-label">Agents</div>
            {AGENTS.map((agent) => {
              const isOpen = !!open[agent.id];
              const active = currentAgent === agent.id;
              const Icon = agent.icon;
              return (
                <div key={agent.id} className="nav-agent">
                  <button
                    type="button"
                    className="nav-item nav-parent"
                    data-active={active ? "true" : undefined}
                    aria-expanded={collapsed ? undefined : isOpen}
                    onClick={() => (collapsed ? go(`${agent.id}/${agent.items[0].id}`) : setOpen((o) => ({ ...o, [agent.id]: !isOpen })))}
                    onMouseEnter={(e) => showFlyout(agent.id, e.currentTarget, { agent })}
                    onMouseLeave={hideFlyout}
                    onFocus={(e) => showFlyout(agent.id, e.currentTarget, { agent })}
                    onBlur={hideFlyout}
                  >
                    <Icon className="nav-icon" />
                    <span className="nav-label">{agent.label}</span>
                    <ChevronRight className="nav-chev" data-open={isOpen ? "true" : undefined} size={14} aria-hidden="true" />
                  </button>
                  <div className="nav-sub-wrap" data-open={isOpen && !collapsed ? "true" : undefined}>
                    <div className="nav-sub" inert={!isOpen || collapsed ? true : undefined}>
                      {agent.items.map((sub) => {
                        const id = `${agent.id}/${sub.id}`;
                        return (
                          <button key={id} type="button" className="nav-item nav-subitem" aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
                            <span className="nav-label">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="nav-group">
            <div className="nav-group-label">Workspace</div>
            {item("control-panel", "Control Panel", SlidersHorizontal)}
          </div>
        </div>

        <AccountFooter />
      </nav>

      <AnimatePresence>
        {flyout && collapsed ? (
          <motion.div
            key={flyout.key}
            className="flyout"
            data-kind={flyout.agent ? "menu" : "tip"}
            style={{ top: flyout.top }}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EXPO }}
            onMouseEnter={keepFlyout}
            onMouseLeave={hideFlyout}
          >
            {flyout.agent ? (
              <>
                <div className="flyout-title">{flyout.agent.label}</div>
                {flyout.agent.items.map((sub) => {
                  const id = `${flyout.agent!.id}/${sub.id}`;
                  return (
                    <button key={id} type="button" className="flyout-item" aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
                      {sub.label}
                    </button>
                  );
                })}
              </>
            ) : (
              flyout.label
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="workspace-main">{page === "ap/intake" ? <InvoiceIntake /> : <Placeholder page={page} />}</div>
    </div>
  );
}

function Placeholder({ page }: { page: string }) {
  const [group, title] = titleFor(page);
  return (
    <div className="page">
      <Topbar crumbs={[{ label: group }, { label: title }]} />
      <main className="placeholder">
        <div className="placeholder-inner">
          <h1>{title}</h1>
          <p>This surface isn&apos;t designed yet. Intake is the first one built.</p>
        </div>
      </main>
    </div>
  );
}

function AccountFooter() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="nav-foot">
      <button
        type="button"
        className="me"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="avatar">P</span>
        <span className="me-text">
          <span className="me-name">Phil</span>
          <span className="me-org">Intrinsic Labs · Admin</span>
        </span>
      </button>
      {open ? (
        <div className="menu" role="menu" onClick={(e) => e.stopPropagation()}>
          <div className="menu-row">
            <span>Theme</span>
            <div className="seg seg-sm" role="radiogroup" aria-label="Theme">
              {(
                [
                  ["light", "Light", Sun],
                  ["dark", "Dark", Moon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={theme === value} className="seg-item" onClick={() => setTheme(value)}>
                  <Icon size={13} aria-hidden="true" />
                  {label}
                  {theme === value ? <span className="seg-pill" /> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="menu-sep" />
          <button type="button" className="menu-item" role="menuitem">
            <Settings size={14} aria-hidden="true" /> Account settings
          </button>
          <button type="button" className="menu-item" role="menuitem">
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
