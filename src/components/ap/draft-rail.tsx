"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import { ArrowUpRight, ChevronRight, User } from "lucide-react";
import type { DraftFieldKey } from "@/lib/ap/types";
import { useTicker, type DraftLine, type RunState } from "@/lib/ap/use-run";

const EXPO = [0.16, 1, 0.3, 1] as const;
const FLOOR = 80;

const FIELDS: { key: DraftFieldKey; label: string }[] = [
  { key: "vendor", label: "Vendor" },
  { key: "invoiceNo", label: "Invoice #" },
  { key: "invoiceDate", label: "Invoice date" },
  { key: "due", label: "Due" },
  { key: "po", label: "PO" },
  { key: "branch", label: "Branch" },
];

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function DraftRail({
  state,
  onDecide,
}: {
  state: RunState;
  onDecide: (to: "released" | "approved" | "rejected" | "hold", text: string) => void;
}) {
  const [tab, setTab] = useState<"draft" | "activity">("draft");
  const drafting = state.phase === "running";

  return (
    <aside className="rail" aria-label="Draft bill">
      <header className="rail-head">
        <div className="rail-title">
          <span className="rail-dest" aria-hidden="true">
            Ac
          </span>
          <div>
            <div className="rail-title-main">Draft bill</div>
            <div className="rail-title-sub">Posts to Acumatica</div>
          </div>
        </div>
        <div className="seg seg-sm" role="tablist" aria-label="Rail view">
          {(["draft", "activity"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className="seg-item" onClick={() => setTab(t)}>
              {t === "draft" ? "Draft" : "Activity"}
              {t === "activity" && state.log.length ? <span className="seg-count">{state.log.length}</span> : null}
              {tab === t ? <motion.span layoutId="rail-tab" className="seg-pill" transition={{ duration: 0.35, ease: EXPO }} /> : null}
            </button>
          ))}
        </div>
      </header>

      <div className="rail-scroll">
        {tab === "draft" ? (
          <div className="rail-draft">
            <dl className="fields">
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label} value={state.fields[f.key]} pending={drafting} />
              ))}
            </dl>

            <section className="rail-section">
              <h3 className="eyebrow">Lines</h3>
              {state.lines.length === 0 ? (
                <p className="rail-empty">
                  {state.phase === "idle" ? "Lines appear as the model reads them." : <span className="shimmer">Waiting for lines…</span>}
                </p>
              ) : (
                <ul className="lines">
                  <AnimatePresence initial={false}>
                    {state.lines.map((line, i) => (
                      <Line key={i} line={line} />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            <section className="totals">
              <div>
                <span>Subtotal</span>
                <span>{state.totals ? <Money value={state.totals.subtotal} /> : "—"}</span>
              </div>
              <div>
                <span>Tax</span>
                <span>{state.totals ? (state.totals.tax == null ? "—" : <Money value={state.totals.tax} />) : "—"}</span>
              </div>
              <div className="totals-grand">
                <span>Total</span>
                <span>{state.totals ? <Money value={state.totals.total} /> : "—"}</span>
              </div>
            </section>
          </div>
        ) : (
          <Activity state={state} />
        )}
      </div>

      <footer className="rail-foot">
        <Approval state={state} onDecide={onDecide} />
        <Stats state={state} />
      </footer>
    </aside>
  );
}

function Field({ label, value, pending }: { label: string; value?: string; pending: boolean }) {
  return (
    <div className="field">
      <dt className="eyebrow">{label}</dt>
      <dd>
        <AnimatePresence mode="wait" initial={false}>
          {value ? (
            <motion.span
              key={value}
              className="field-value"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EXPO }}
            >
              <span className="field-flash" />
              {value}
            </motion.span>
          ) : pending ? (
            <motion.span key="pending" className="skeleton" exit={{ opacity: 0 }} />
          ) : (
            <motion.span key="empty" className="field-empty">
              —
            </motion.span>
          )}
        </AnimatePresence>
      </dd>
    </div>
  );
}

function Line({ line }: { line: DraftLine }) {
  const c = line.coding;
  const low = c ? c.confidence < FLOOR : false;
  return (
    <motion.li
      className="line"
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EXPO }}
    >
      <div className="line-top">
        <span className="line-desc">{line.description}</span>
        <span className="line-amt">
          <Money value={line.amount} />
        </span>
      </div>
      {line.detail ? <p className="line-detail">{line.detail}</p> : null}
      <AnimatePresence initial={false}>
        {c ? (
          <motion.div
            className="line-coding"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.45, ease: EXPO }}
          >
            <span className="chip chip-gl" title={`${c.gl} ${c.glName}`}>
              <b>{c.gl}</b>
              <span>{c.glName}</span>
            </span>
            <span className="chip">{c.dept}</span>
            <span className="conf" data-low={low ? "true" : undefined} title={`Confidence ${c.confidence}% (floor ${FLOOR}%)`}>
              <span className="conf-bar">
                <motion.span initial={{ width: 0 }} animate={{ width: `${c.confidence}%` }} transition={{ duration: 0.9, ease: EXPO }} />
                <i style={{ left: `${FLOOR}%` }} />
              </span>
              <span className="conf-num">{c.confidence}%</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function Money({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: EXPO,
      onUpdate: (v) => {
        el.textContent = usd(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span ref={ref} className="money" />;
}

function Approval({
  state,
  onDecide,
}: {
  state: RunState;
  onDecide: (to: "released" | "approved" | "rejected" | "hold", text: string) => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const reasons = state.scenario?.holdReasons ?? [];
  const d = state.draft;

  const body = (() => {
    switch (d) {
      case "empty":
        return {
          tone: "idle",
          title: "Nothing drafted yet",
          text: "The agent only ever creates drafts. A person approves inside Acumatica.",
        };
      case "drafting":
        return { tone: "live", title: "Drafting", text: "Fields and lines fill in as each step finishes." };
      case "hold":
        return { tone: "warn", title: `On hold · ${reasons.length} reason${reasons.length === 1 ? "" : "s"}`, text: "AP resolves the reasons, then it routes to a reviewer." };
      case "released":
        return { tone: "live", title: "Released · awaiting approval", text: "AP cleared the hold. Routed to the AP reviewer." };
      case "approved":
        return { tone: "ok", title: "Approved", text: `Payment scheduled for ${state.scenario?.paymentDate}.` };
      case "rejected":
        return { tone: "block", title: "Rejected", text: "Returned to AP. Nothing was posted." };
    }
  })();

  return (
    <motion.div className="approval" data-tone={body.tone} layout transition={{ duration: 0.4, ease: EXPO }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={d}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EXPO }}
        >
          <div className="approval-title">
            <span className="approval-dot" />
            {body.title}
          </div>
          <p className="approval-text">{body.text}</p>

          {d === "hold" ? (
            <>
              <button type="button" className="link-button approval-toggle" onClick={() => setShowReasons((v) => !v)} aria-expanded={showReasons}>
                <ChevronRight className="tl-chev" data-open={showReasons ? "true" : undefined} aria-hidden="true" />
                {showReasons ? "Hide reasons" : "Show reasons"}
              </button>
              <AnimatePresence initial={false}>
                {showReasons ? (
                  <motion.ol
                    className="approval-reasons"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: EXPO }}
                  >
                    {reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </motion.ol>
                ) : null}
              </AnimatePresence>
              <div className="approval-actions">
                <button type="button" className="btn btn-primary" onClick={() => onDecide("released", "AP resolved the hold and released the draft for approval.")}>
                  Resolve and release
                </button>
                <button type="button" className="btn" onClick={() => onDecide("rejected", "AP rejected the draft. Nothing was posted.")}>
                  Reject
                </button>
              </div>
            </>
          ) : null}

          {d === "released" ? (
            <div className="approval-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onDecide("approved", `Approved by AP reviewer. Payment scheduled for ${state.scenario?.paymentDate}.`)}
              >
                Approve
              </button>
              <button type="button" className="btn" onClick={() => onDecide("hold", "Sent back to AP.")}>
                Send back to AP
              </button>
            </div>
          ) : null}

          {d === "approved" ? (
            <div className="approval-actions">
              <button type="button" className="btn">
                Open in Acumatica <ArrowUpRight aria-hidden="true" size={14} />
              </button>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function Stats({ state }: { state: RunState }) {
  const now = useTicker(state.phase === "running", 100);
  const elapsed = state.startedAt ? Math.max(0, (state.endedAt ?? (state.phase === "running" ? now : state.startedAt)) - state.startedAt) / 1000 : 0;
  const items: [string, string][] = [
    ["Elapsed", `${elapsed.toFixed(1)}s`],
    ["Model calls", String(state.stats.modelCalls)],
    ["Tokens", state.stats.tokens.toLocaleString()],
    ["Spend", `$${state.stats.spend.toFixed(3)}`],
    ["Human", String(state.stats.humanTouches)],
  ];
  return (
    <dl className="stats">
      {items.map(([k, v]) => (
        <div key={k}>
          <dd>{v}</dd>
          <dt>{k}</dt>
        </div>
      ))}
    </dl>
  );
}

function Activity({ state }: { state: RunState }) {
  if (!state.log.length) return <p className="rail-empty">Run events show up here as they happen.</p>;
  const t0 = state.startedAt ?? 0;
  return (
    <ul className="feed">
      <AnimatePresence initial={false}>
        {state.log.map((e) => (
          <motion.li
            key={`${e.at}-${e.text}`}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EXPO }}
            data-human={e.human ? "true" : undefined}
          >
            <span className="feed-time">{((e.at - t0) / 1000).toFixed(1)}s</span>
            <span className="feed-text">
              {e.human ? <User aria-hidden="true" size={12} /> : null}
              {e.text}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
