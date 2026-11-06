"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileText, RotateCcw, Upload } from "lucide-react";
import { LANGFUSE, NCTL } from "@/lib/ap/scenarios";
import type { DraftStatus, Scenario } from "@/lib/ap/types";
import { completedRun, fmtSize, useInvoiceRun, type RunFile, type RunState } from "@/lib/ap/use-run";
import { FileDropArt } from "./file-drop-art";
import { InvoiceThumb } from "./invoice-thumb";
import { StepTimeline } from "./step-timeline";
import { DraftRail } from "./draft-rail";
import { Topbar } from "@/components/shell/topbar";

const EXPO = [0.16, 1, 0.3, 1] as const;

async function sha256(file: File) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return LANGFUSE.file.sha;
  }
}

/** Until the agent is live, a dropped file plays the scenario it most resembles. */
function scenarioForFile(name: string): Scenario {
  return /nctl|118503|north.?coast|lab/i.test(name) ? NCTL : LANGFUSE;
}

/** Recently processed files. Opening one shows its finished run. */
type Recent = {
  scenario: Scenario;
  when: string;
  decisions: { to: DraftStatus; text: string; afterMs: number }[];
};

const RECENTS: Recent[] = [
  { scenario: LANGFUSE, when: "today, 1:12 PM", decisions: [] },
  {
    scenario: NCTL,
    when: "today, 11:48 AM",
    decisions: [
      { to: "released", text: "AP resolved the hold and released the draft for approval.", afterMs: 2_400_000 },
      { to: "approved", text: `Approved by AP reviewer. Payment scheduled for ${NCTL.paymentDate}.`, afterMs: 3_100_000 },
    ],
  },
];

const RECENT_STATUS: Partial<Record<DraftStatus, { label: (s: Scenario) => string; tone: string }>> = {
  hold: { label: (s) => `On hold · ${s.holdReasons.length}`, tone: "warn" },
  released: { label: () => "Awaiting approval", tone: "info" },
  approved: { label: () => "Approved", tone: "ok" },
  rejected: { label: () => "Rejected", tone: "muted" },
};

const WIDE = "(min-width: 1280px)";
function useRailWidth() {
  const wide = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  return wide ? 384 : 336;
}

export function InvoiceIntake() {
  const { state, run, open, reset, decide } = useInvoiceRun();
  const [armed, setArmed] = useState(false);
  const [thumbFrom, setThumbFrom] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const railW = useRailWidth();

  const startFile = useCallback(
    async (file: File) => {
      const s = scenarioForFile(file.name);
      setThumbFrom(null);
      const runFile: RunFile = { name: file.name, size: file.size, pages: s.file.pages, sha: await sha256(file), source: "upload" };
      scrollRef.current?.scrollTo({ top: 0 });
      run(s, runFile);
    },
    [run],
  );

  const openRecent = useCallback(
    (r: Recent) => {
      setThumbFrom(r.scenario.id);
      scrollRef.current?.scrollTo({ top: 0 });
      open(completedRun(r.scenario, { ...r.scenario.file, source: "recent", when: r.when }, r.decisions));
    },
    [open],
  );

  // The whole workspace is the drop target: dragging a file anywhere over the window arms it.
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    const enter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current++;
      setArmed(true);
    };
    const leave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setArmed(false);
    };
    const over = (e: DragEvent) => {
      if (isFileDrag(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      depth.current = 0;
      setArmed(false);
      if (!isFileDrag(e)) return;
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file) void startFile(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [startFile]);

  const idle = state.phase === "idle";

  return (
    <div className="intake" data-armed={armed ? "true" : undefined}>
      <Topbar
        crumbs={[
          { label: "Accounts Payable" },
          { label: "Intake", onClick: idle ? undefined : () => reset() },
          ...(state.file ? [{ label: state.file.name, mono: true }] : []),
        ]}
        actions={
          <AnimatePresence>
            {!idle ? (
              <motion.button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  reset();
                  setThumbFrom(null);
                }}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.35, ease: EXPO }}
              >
                <RotateCcw size={13} aria-hidden="true" />
                New run
              </motion.button>
            ) : null}
          </AnimatePresence>
        }
      />

      <div className="intake-body">
        <div className="intake-main" ref={scrollRef}>
          <AnimatePresence mode="wait">
            {idle ? (
              <motion.div
                key="idle"
                className="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EXPO }}
              >
                <div className="idle-center">
                  <FileDropArt armed={armed} />
                  <h1 className="idle-title">Drop an invoice file here</h1>
                  <p className="idle-sub">
                    or{" "}
                    <button type="button" className="link-button link-accent" onClick={() => input.current?.click()}>
                      browse your files
                    </button>
                  </p>
                  <p className="idle-body">
                    The agent reads the document, codes it against your chart of accounts, and drafts the bill. Nothing posts until a person approves it.
                  </p>
                </div>
                <Recents onOpen={openRecent} />
              </motion.div>
            ) : (
              <motion.div
                key="run"
                className="intake-inner"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EXPO }}
              >
                <FileChip state={state} thumbFrom={thumbFrom} />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EXPO, delay: 0.2 }}
                >
                  <StepTimeline key={state.file?.name} state={state} scrollRoot={scrollRef} follow={state.file?.source !== "recent"} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {!idle ? (
            <motion.div
              key="rail"
              className="rail-slot"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: railW, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: EXPO }}
            >
              <DraftRail state={state} onDecide={decide} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="drop-veil" aria-hidden="true" />
      </div>

      <input
        ref={input}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void startFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Recents({ onOpen }: { onOpen: (r: Recent) => void }) {
  return (
    <section className="recents" aria-labelledby="recents-title">
      <h2 id="recents-title" className="eyebrow">
        Recent
      </h2>
      <ul className="recent-list">
        {RECENTS.map((r) => {
          const s = r.scenario;
          const final = r.decisions.at(-1)?.to ?? "hold";
          const status = RECENT_STATUS[final]!;
          return (
            <li key={s.id}>
              <button type="button" className="recent" onClick={() => onOpen(r)}>
                <motion.span layoutId={`thumb-${s.id}`} className="recent-thumb" transition={{ duration: 0.7, ease: EXPO }}>
                  <InvoiceThumb doc={s.doc} width={34} />
                </motion.span>
                <span className="recent-text">
                  <span className="recent-vendor">{s.vendor}</span>
                  <span className="recent-file">{s.file.name}</span>
                </span>
                <span className="recent-amt">${s.amount.toFixed(2)}</span>
                <span className="recent-status" data-tone={status.tone}>
                  <span className="recent-dot" />
                  {status.label(s)}
                </span>
                <span className="recent-when">{r.when.replace("today, ", "")}</span>
                <ChevronRight className="recent-chev" size={15} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FileChip({ state, thumbFrom }: { state: RunState; thumbFrom: string | null }) {
  const s = state.scenario!;
  const f = state.file!;
  const steps = s.steps;
  const doneCount = steps.filter((d) => ["done", "flagged"].includes(state.steps[d.id]?.status)).length;
  const runningIndex = steps.findIndex((d) => state.steps[d.id]?.status === "running");
  const reading = ["classify", "extract"].includes(state.activeStep ?? "");
  const complete = state.phase === "complete";

  return (
    <motion.div layoutId="intake-card" className="chip-card" transition={{ duration: 0.7, ease: EXPO }} style={{ borderRadius: 12 }}>
      <motion.span
        layoutId={thumbFrom ? `thumb-${thumbFrom}` : undefined}
        className="chip-thumb"
        initial={thumbFrom ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EXPO }}
      >
        <InvoiceThumb doc={s.doc} width={48} reading={reading} />
      </motion.span>
      <motion.div
        className="chip-body"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EXPO, delay: 0.3 }}
      >
        <div className="chip-row">
          <span className="chip-name">
            <FileText size={14} aria-hidden="true" />
            {f.name}
          </span>
          <span className="chip-status" data-state={complete ? state.draft : "running"}>
            {complete ? (
              {
                hold: `Draft on hold · ${s.holdReasons.length} reasons`,
                released: "Released · awaiting approval",
                approved: `Approved · pays ${s.paymentDate}`,
                rejected: "Rejected",
                empty: "",
                drafting: "",
              }[state.draft]
            ) : (
              <>
                <span className="live-dot" />
                Step {Math.max(1, runningIndex + 1)} of {steps.length} · {steps[Math.max(0, runningIndex)].title}
              </>
            )}
          </span>
        </div>
        <div className="chip-meta">
          <span>
            {f.pages} page{f.pages === 1 ? "" : "s"}
          </span>
          <span>{fmtSize(f.size)}</span>
          <span>sha256 {f.sha.slice(0, 12)}…</span>
          <span>
            <Upload size={11} aria-hidden="true" /> {f.source === "upload" ? "Dropped by you" : `Received ${f.when}`} · {s.intake}
          </span>
        </div>
        <div className="segbar" aria-hidden="true">
          {steps.map((d, i) => {
            const st = state.steps[d.id]?.status;
            return <span key={d.id} data-status={st} style={{ ["--i" as string]: i }} />;
          })}
        </div>
        <span className="sr-only">
          {doneCount} of {steps.length} steps complete
        </span>
      </motion.div>
    </motion.div>
  );
}
