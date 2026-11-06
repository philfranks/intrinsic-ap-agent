"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { FileText, RotateCcw, Upload } from "lucide-react";
import { LANGFUSE, NCTL, SCENARIOS } from "@/lib/ap/scenarios";
import type { Scenario } from "@/lib/ap/types";
import { fmtSize, useInvoiceRun, type RunFile, type RunState } from "@/lib/ap/use-run";
import { SignalMark } from "./signal-mark";
import { InvoiceThumb } from "./invoice-thumb";
import { StepTimeline } from "./step-timeline";
import { DraftRail } from "./draft-rail";

const EXPO = [0.16, 1, 0.3, 1] as const;
const SAMPLE_MIME = "application/x-intrinsic-sample";

async function sha256(file: File) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return LANGFUSE.file.sha;
  }
}

/** Rehearsal mode: a dropped file plays the scenario it most resembles. */
function scenarioForFile(name: string): Scenario {
  return /nctl|118503|north.?coast|lab/i.test(name) ? NCTL : LANGFUSE;
}

export function InvoiceIntake() {
  const { state, run, reset, decide } = useInvoiceRun();
  const [armed, setArmed] = useState(false);
  const [thumbFrom, setThumbFrom] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const depth = useRef(0);

  const startSample = useCallback(
    (s: Scenario) => {
      setThumbFrom(s.id);
      scrollRef.current?.scrollTo({ top: 0 });
      run(s, { ...s.file, source: "sample" });
    },
    [run],
  );

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

  // Light the drop zone whenever a file is dragged anywhere over the window.
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === "Files" || t === SAMPLE_MIME);
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
      const sample = e.dataTransfer?.getData(SAMPLE_MIME);
      if (sample) {
        const s = SCENARIOS.find((x) => x.id === sample);
        if (s) startSample(s);
        return;
      }
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
  }, [startFile, startSample]);

  const idle = state.phase === "idle";

  return (
    <div className="intake" data-armed={armed ? "true" : undefined}>
      <div className="intake-main" ref={scrollRef}>
        <div className="intake-inner">
          <header className="intake-head">
            <div>
              <p className="crumb">Accounts Payable</p>
              <h1 className="intake-title">Invoice Intake</h1>
            </div>
            <div className="intake-controls">
              <div className="seg" role="radiogroup" aria-label="Run mode">
                <button type="button" role="radio" aria-checked="true" className="seg-item">
                  Rehearsal
                  <span className="seg-pill" />
                </button>
                <button type="button" role="radio" aria-checked="false" className="seg-item" disabled title="Connect a model key in Settings to run live">
                  Live
                </button>
              </div>
              <AnimatePresence>
                {!idle ? (
                  <motion.button
                    type="button"
                    className="btn"
                    onClick={() => {
                      reset();
                      setThumbFrom(null);
                    }}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.35, ease: EXPO }}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    New run
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </header>

          <LayoutGroup>
            <AnimatePresence mode="popLayout" initial={false}>
              {idle ? (
                <motion.div
                  key="hero"
                  className="hero"
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
                >
                  <p className="eyebrow">AP agent · Certified Cultivators → Acumatica</p>
                  <h2 className="hero-title">
                    <WordReveal text="Drop an invoice. Watch it get coded, checked, and drafted." />
                  </h2>
                  <p className="hero-sub">
                    The agent reads the document, codes it against your chart of accounts, and drafts the bill. Nothing posts until a person approves it.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {idle ? (
              <DropZone armed={armed} onFile={startFile} />
            ) : (
              <FileChip state={state} thumbFrom={thumbFrom} />
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {idle ? (
                <motion.div key="below" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                  <Samples onPick={startSample} />
                  <StepsPreview />
                </motion.div>
              ) : (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EXPO, delay: 0.25 }}
                >
                  <StepTimeline state={state} scrollRoot={scrollRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>

      <DraftRail state={state} onDecide={decide} />
    </div>
  );
}

function WordReveal({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          className="word"
          initial={{ opacity: 0, y: "0.35em", filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: EXPO, delay: 0.05 + i * 0.045 }}
        >
          {w}{" "}
        </motion.span>
      ))}
    </>
  );
}

function DropZone({ armed, onFile }: { armed: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <motion.div
      layoutId="intake-card"
      className="dropzone"
      data-armed={armed ? "true" : undefined}
      transition={{ duration: 0.7, ease: EXPO }}
      style={{ borderRadius: 16 }}
    >
      <span className="dz-grid" aria-hidden="true" />
      <span className="dz-corner dz-tl" aria-hidden="true" />
      <span className="dz-corner dz-tr" aria-hidden="true" />
      <span className="dz-corner dz-bl" aria-hidden="true" />
      <span className="dz-corner dz-br" aria-hidden="true" />
      <motion.div className="dz-inner" exit={{ opacity: 0 }}>
        <SignalMark armed={armed} size={124} />
        <div className="dz-copy">
          <p className="dz-title">{armed ? "Release to start the run" : "Drop a PDF invoice here"}</p>
          <p className="dz-sub">
            or{" "}
            <button type="button" className="link-button link-accent" onClick={() => input.current?.click()}>
              browse your files
            </button>
          </p>
        </div>
        <p className="dz-meta">PDF, PNG or JPG · read in your browser · sent only to the model</p>
      </motion.div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </motion.div>
  );
}

function Samples({ onPick }: { onPick: (s: Scenario) => void }) {
  return (
    <section className="samples">
      <p className="eyebrow">Or try a sample · drag it in, or click</p>
      <div className="sample-grid">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="sample"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(SAMPLE_MIME, s.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onPick(s)}
          >
            <motion.span layoutId={`thumb-${s.id}`} className="sample-thumb" transition={{ duration: 0.7, ease: EXPO }}>
              <InvoiceThumb doc={s.doc} width={64} />
            </motion.span>
            <span className="sample-text">
              <span className="sample-vendor">{s.vendor}</span>
              <span className="sample-meta">
                {s.file.name} · {fmtSize(s.file.size)}
              </span>
              <span className="sample-tags">
                <span className="chip chip-mono">${s.amount.toFixed(2)}</span>
                <span className="chip" data-tone={s.holdReasons.length > 3 ? "block" : "warn"}>
                  {s.holdReasons.length > 3 ? "Messy: new vendor, wrong bill-to" : "Known vendor, one policy gap"}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StepsPreview() {
  return (
    <section className="preview">
      <p className="eyebrow">What the agent does · 8 steps</p>
      <ol className="preview-grid">
        {LANGFUSE.steps.map((s, i) => (
          <li key={s.id}>
            <span className="preview-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="preview-title">{s.title}</span>
            <span className="tl-tag" data-kind={s.kind}>
              <span className="tl-tag-dot" />
              {s.kind === "model" ? "Claude" : "rules"}
            </span>
          </li>
        ))}
      </ol>
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
            <Upload size={11} aria-hidden="true" /> {f.source === "upload" ? "Dropped by you" : "Sample"} · {s.intake}
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
