"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChevronsUpDown,
  FileInput,
  History,
  Home,
  Inbox,
  LogOut,
  Moon,
  PanelLeft,
  Plug,
  Receipt,
  Scale,
  Search,
  Settings,
  Sun,
  Truck,
  Users,
} from "lucide-react";
import { MARK } from "@/lib/brand/mark";
import { useTheme } from "@/lib/use-theme";
import { InvoiceIntake } from "@/components/ap/invoice-intake";

type Page = "home" | "inbox" | "intake" | "runs" | "vendors" | "rules" | "connections" | "knowledge" | "settings";

const PAGE_TITLES: Record<Page, [string, string]> = {
  home: ["Workspace", "Home"],
  inbox: ["Workspace", "Inbox"],
  intake: ["Accounts Payable", "Invoice Intake"],
  runs: ["Accounts Payable", "Runs"],
  vendors: ["Accounts Payable", "Vendors"],
  rules: ["Accounts Payable", "Rules & policy"],
  connections: ["Workspace", "Connections"],
  knowledge: ["Workspace", "Knowledge"],
  settings: ["Workspace", "Settings"],
};

function SignalLogo({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox={`0 0 ${MARK.w} ${MARK.h}`} width={size} height={(size * MARK.h) / MARK.w} aria-hidden="true">
      {MARK.paths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

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

export function AppShell() {
  const [page, setPage] = useState<Page>("intake");
  const [userCollapsed, setCollapsed] = useState(false);
  const narrow = useNarrow();
  const collapsed = narrow || userCollapsed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const item = (id: Page, label: string, Icon: React.ComponentType<{ className?: string }>, extra?: React.ReactNode) => (
    <button
      type="button"
      className="nav-item"
      aria-current={page === id ? "page" : undefined}
      data-tip={label}
      onClick={() => setPage(id)}
    >
      <Icon className="nav-icon" />
      <span className="nav-label">{label}</span>
      {extra}
    </button>
  );

  const soon = (label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <span className="nav-item" data-soon="true" data-tip={`${label} · soon`} aria-disabled="true">
      <Icon className="nav-icon" />
      <span className="nav-label">{label}</span>
      <span className="nav-soon">Soon</span>
    </span>
  );

  return (
    <div className="app" data-rail={collapsed ? "collapsed" : undefined}>
      <nav className="nav" aria-label="Primary">
        <div className="nav-top">
          <a className="brand" href="#" aria-label="Intrinsic Labs" onClick={(e) => e.preventDefault()}>
            <SignalLogo />
            <span className="brand-word">Intrinsic</span>
          </a>
          <button
            type="button"
            className="icon-btn"
            hidden={narrow}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title="Toggle sidebar (⌘\)"
            onClick={() => setCollapsed((c) => !c)}
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <div className="nav-scroll">
          <button type="button" className="workspace" aria-label="Switch workspace">
            <span className="ws-mark">CC</span>
            <span className="ws-name">Certified Cultivators</span>
            <ChevronsUpDown size={14} className="ws-chev" />
          </button>

          <button type="button" className="nav-item" data-tip="Search">
            <Search className="nav-icon" />
            <span className="nav-label">Search</span>
            <span className="kbd">⌘K</span>
          </button>
          {item("home", "Home", Home)}
          {item("inbox", "Inbox", Inbox, <span className="nav-badge">3</span>)}

          <div className="nav-group">
            <div className="nav-group-label">Agents</div>
            <button type="button" className="nav-item nav-parent" data-tip="Accounts Payable" onClick={() => setPage("intake")}>
              <Receipt className="nav-icon" />
              <span className="nav-label">Accounts Payable</span>
            </button>
            <div className="nav-sub">
              {item("intake", "Invoice Intake", FileInput)}
              {item("runs", "Runs", History)}
              {item("vendors", "Vendors", Users)}
              {item("rules", "Rules & policy", Scale)}
            </div>
            {soon("Receiving", Truck)}
          </div>

          <div className="nav-group">
            <div className="nav-group-label">Workspace</div>
            {item("connections", "Connections", Plug)}
            {item("knowledge", "Knowledge", BookOpen)}
            {item("settings", "Settings", Settings)}
          </div>
        </div>

        <AccountFooter />
      </nav>

      <div className="workspace-main">
        {page === "intake" ? <InvoiceIntake /> : <Placeholder page={page} />}
      </div>
    </div>
  );
}

function Placeholder({ page }: { page: Page }) {
  const [group, title] = PAGE_TITLES[page];
  return (
    <main className="placeholder">
      <div className="placeholder-inner">
        <p className="crumb">{group}</p>
        <h1>{title}</h1>
        <p>This surface isn&apos;t designed yet. Invoice Intake is the first one built.</p>
      </div>
    </main>
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
