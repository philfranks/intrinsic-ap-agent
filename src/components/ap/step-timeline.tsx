"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type { StepDef, StepItem, Tone } from "@/lib/ap/types";
import { useTicker, type RunState, type StepState } from "@/lib/ap/use-run";

const EXPO = [0.16, 1, 0.3, 1] as const;

const fmtMs = (ms: number) => `${Math.round(ms).toLocaleString()} ms`;

export function StepTimeline({
  state,
  scrollRoot,
  follow = true,
}: {
  state: RunState;
  scrollRoot: React.RefObject<HTMLElement | null>;
  follow?: boolean;
}) {
  const scenario = state.scenario!;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const active = state.activeStep;

  // Follow the running step: keep its bottom edge in view as it grows (streams, items, cards).
  useEffect(() => {
    const root = scrollRoot.current;
    if (!follow) return;
    const id = active ?? (state.phase === "complete" ? scenario.steps[scenario.steps.length - 1].id : null);
    const el = id ? refs.current[id] : null;
    if (!root || !el) return;
    let frame = 0;
    const stick = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        const overflow = r.bottom + 40 - rr.bottom;
        // Never scroll the step's top out of view
        const room = r.top - rr.top - 24;
        const by = Math.min(overflow, room);
        if (by > 2) root.scrollBy({ top: by, behavior: "smooth" });
      });
    };
    stick();
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    const stop = state.phase === "complete" ? setTimeout(() => ro.disconnect(), 1500) : undefined;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(stop);
    };
  }, [active, state.phase, scenario, scrollRoot, follow]);

  return (
    <ol className="tl">
      {scenario.steps.map((def, index) => {
        const s = state.steps[def.id];
        const isLast = index === scenario.steps.length - 1;
        const settled = s.status === "done" || s.status === "flagged";
        const expanded =
          s.status === "running" || open[def.id] === true || (state.phase === "complete" && isLast && open[def.id] !== false);
        return (
          <li
            key={def.id}
            ref={(el) => {
              refs.current[def.id] = el;
            }}
            className="tl-step"
            data-status={s.status}
            data-last={isLast ? "true" : undefined}
          >
            <div className="tl-rail" aria-hidden="true">
              <StepNode status={s.status} index={index} />
              {!isLast ? (
                <span className="tl-line">
                  <motion.span
                    className="tl-line-fill"
                    initial={false}
                    animate={{ scaleY: settled ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: EXPO }}
                  />
                </span>
              ) : null}
            </div>
            <div className="tl-body">
              <button
                type="button"
                className="tl-head"
                disabled={!settled}
                aria-expanded={expanded}
                onClick={() => setOpen((o) => ({ ...o, [def.id]: !expanded }))}
              >
                <span className="tl-title">{def.title}</span>
                <span className="tl-tag" data-kind={def.kind}>
                  <span className="tl-tag-dot" />
                  {def.tag}
                </span>
                <span className="tl-time">
                  <StepTime s={s} />
                </span>
                {settled ? <ChevronRight className="tl-chev" data-open={expanded ? "true" : undefined} aria-hidden="true" /> : null}
              </button>

              <AnimatePresence initial={false}>
                {settled && !expanded ? (
                  <motion.p
                    key="summary"
                    className="tl-summary"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EXPO }}
                  >
                    {def.summary}
                  </motion.p>
                ) : null}
                {expanded ? (
                  <motion.div
                    key="detail"
                    className="tl-detail-wrap"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: EXPO }}
                  >
                    <StepDetail def={def} s={s} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepTime({ s }: { s: StepState }) {
  const now = useTicker(s.status === "running", 47);
  if (s.status === "running" && s.startedAt) return <span className="tl-time-live">{fmtMs(Math.max(0, now - s.startedAt))}</span>;
  if (s.ms != null) return <span>{fmtMs(s.ms)}</span>;
  return null;
}

function StepNode({ status, index }: { status: StepState["status"]; index: number }) {
  return (
    <span className="tl-node" data-status={status}>
      <AnimatePresence mode="popLayout" initial={false}>
        {status === "done" ? (
          <motion.svg
            key="done"
            viewBox="0 0 16 16"
            className="tl-node-icon"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: EXPO }}
          >
            <motion.path
              d="M4.2 8.3 6.9 11 11.8 5.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            />
          </motion.svg>
        ) : status === "flagged" ? (
          <motion.span
            key="flag"
            className="tl-node-glyph"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: EXPO }}
          >
            !
          </motion.span>
        ) : (
          <motion.span key="num" className="tl-node-num" exit={{ opacity: 0, scale: 0.5 }}>
            {index + 1}
          </motion.span>
        )}
      </AnimatePresence>
      {status === "running" ? (
        <>
          <span className="tl-node-halo" />
          <svg className="tl-node-spin" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="20 60" strokeLinecap="round" />
          </svg>
        </>
      ) : null}
    </span>
  );
}

function StepDetail({ def, s }: { def: StepDef; s: StepState }) {
  const [showPayload, setShowPayload] = useState(false);
  const thinking = def.stream && s.stream.length === 0 && s.status === "running";

  return (
    <div className="tl-detail">
      {def.stream ? (
        <div className="tl-console" data-done={s.streamDone ? "true" : undefined}>
          <div className="tl-console-head">
            <span>{thinking ? <span className="shimmer">Reading the document…</span> : "Model output"}</span>
            {s.stream.length ? <span>{s.stream.length.toLocaleString()} chars</span> : null}
          </div>
          <ConsoleText text={s.stream} done={s.streamDone} />
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {def.prose && s.showProse ? (
          <motion.p
            className="tl-prose"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EXPO }}
          >
            {def.prose}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {def.table && (s.revealed > 0 || s.status !== "running") ? (
        <div className="tl-table">
          <p className="tl-caption">{def.table.caption}</p>
          {def.table.rows.slice(0, s.status === "running" ? s.revealed : undefined).map((row) => (
            <motion.div
              key={row[1]}
              className="tl-table-row"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EXPO }}
            >
              {row.map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </motion.div>
          ))}
        </div>
      ) : null}

      {def.candidates ? (
        <div className="tl-cands">
          {def.candidates.slice(0, s.status === "running" ? s.revealed : undefined).map((c) => (
            <motion.div
              key={c.name}
              className="tl-cand"
              data-matched={c.matched ? "true" : undefined}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EXPO }}
            >
              <div className="tl-cand-text">
                <span className="tl-cand-name">{c.name}</span>
                <span className="tl-cand-meta">{c.meta}</span>
              </div>
              <div className="tl-score">
                <span className="tl-score-bar">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ duration: 0.8, ease: EXPO, delay: 0.1 }}
                  />
                </span>
                <span className="tl-score-num">{c.score}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      {s.items.length ? (
        <ul className="tl-items">
          {s.items.map((item, i) => (
            <ItemRow key={i} item={item} />
          ))}
        </ul>
      ) : null}

      <AnimatePresence initial={false}>
        {def.draftCard && s.showCard ? (
          <motion.div
            className="tl-card"
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EXPO }}
          >
            <div className="tl-card-title">
              <span className="dot dot-warn" />
              {def.draftCard.title}
            </div>
            <p className="tl-card-lead">{def.draftCard.lead}</p>
            <ol className="tl-card-reasons">
              {def.draftCard.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <p className="tl-card-note">
              <span className="eyebrow">Model note</span>
              {def.draftCard.note}
            </p>
            {def.payload ? (
              <div className="tl-payload">
                <button type="button" className="link-button" onClick={() => setShowPayload((v) => !v)} aria-expanded={showPayload}>
                  <ChevronRight className="tl-chev" data-open={showPayload ? "true" : undefined} aria-hidden="true" />
                  Acumatica payload
                </button>
                <AnimatePresence initial={false}>
                  {showPayload ? (
                    <motion.pre
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: EXPO }}
                    >
                      {def.payload}
                    </motion.pre>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ConsoleText({ text, done }: { text: string; done: boolean }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);
  return (
    <pre ref={ref} className="tl-console-text">
      {text}
      {!done ? <span className="caret" /> : null}
    </pre>
  );
}

const ICONS: Record<Tone, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  ok: CircleCheck,
  info: Info,
  warn: TriangleAlert,
  block: OctagonAlert,
};

const TONE_LABEL: Record<Tone, string> = { ok: "Passed", info: "Note", warn: "Needs review", block: "Blocking" };

function ItemRow({ item }: { item: StepItem }) {
  const Icon = ICONS[item.tone];
  return (
    <motion.li
      className="tl-item"
      data-tone={item.tone}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EXPO }}
    >
      <Icon className="tl-item-icon" aria-hidden />
      <span className="sr-only">{TONE_LABEL[item.tone]}: </span>
      <span className="tl-item-text">{item.text}</span>
      {item.meta ? <span className="tl-item-meta">{item.meta}</span> : null}
    </motion.li>
  );
}

