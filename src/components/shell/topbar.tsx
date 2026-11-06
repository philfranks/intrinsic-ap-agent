"use client";

import { Fragment } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";

const EXPO = [0.16, 1, 0.3, 1] as const;

export type Crumb = { label: string; onClick?: () => void; mono?: boolean };

/**
 * Workspace top bar. Same height as the rail's logo row and runs the full width of the
 * workspace (center + right rail), like a desktop app title bar. Breadcrumb left, page actions right.
 */
export function Topbar({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  const last = crumbs.length - 1;
  return (
    <header className="topbar">
      <nav className="topbar-crumbs" aria-label="Breadcrumb">
        <ol>
          <AnimatePresence initial={false}>
            {crumbs.map((c, i) => (
              <Fragment key={c.label}>
                {i > 0 ? (
                  <motion.li
                    key={`sep-${c.label}`}
                    className="crumb-sep"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <ChevronRight size={14} />
                  </motion.li>
                ) : null}
                <motion.li
                  key={c.label}
                  className="crumb-item"
                  data-current={i === last ? "true" : undefined}
                  data-mono={c.mono ? "true" : undefined}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.35, ease: EXPO }}
                >
                  {c.onClick && i !== last ? (
                    <button type="button" onClick={c.onClick}>
                      {c.label}
                    </button>
                  ) : (
                    <span aria-current={i === last ? "page" : undefined}>{c.label}</span>
                  )}
                </motion.li>
              </Fragment>
            ))}
          </AnimatePresence>
        </ol>
      </nav>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </header>
  );
}
