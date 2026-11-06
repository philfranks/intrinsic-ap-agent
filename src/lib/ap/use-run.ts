"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { DraftFieldKey, DraftStatus, Effect, LineCoding, LineDef, Scenario, StepDef, StepItem } from "./types";

/* ───────────────────────── State ───────────────────────── */

export type StepStatus = "pending" | "running" | "done" | "flagged";

export type StepState = {
  status: StepStatus;
  startedAt?: number;
  ms?: number;
  stream: string;
  streamDone: boolean;
  revealed: number; // rows/candidates revealed
  items: StepItem[];
  showProse: boolean;
  showCard: boolean;
};

export type DraftLine = LineDef & { coding?: LineCoding };

export type RunFile = { name: string; pages: number; size: number; sha: string; source: "sample" | "upload" };

export type LogEntry = { at: number; text: string; human?: boolean };

export type RunState = {
  phase: "idle" | "running" | "complete";
  scenario: Scenario | null;
  file: RunFile | null;
  startedAt: number | null;
  endedAt: number | null;
  activeStep: string | null;
  steps: Record<string, StepState>;
  fields: Partial<Record<DraftFieldKey, string>>;
  lines: DraftLine[];
  totals: { subtotal: number; tax: number | null; total: number } | null;
  draft: DraftStatus;
  stats: { modelCalls: number; tokens: number; spend: number; humanTouches: number };
  log: LogEntry[];
};

const initial: RunState = {
  phase: "idle",
  scenario: null,
  file: null,
  startedAt: null,
  endedAt: null,
  activeStep: null,
  steps: {},
  fields: {},
  lines: [],
  totals: null,
  draft: "empty",
  stats: { modelCalls: 0, tokens: 0, spend: 0, humanTouches: 0 },
  log: [],
};

type Action =
  | { type: "start"; scenario: Scenario; file: RunFile; at: number }
  | { type: "stepStart"; id: string; at: number }
  | { type: "stream"; id: string; text: string }
  | { type: "streamDone"; id: string }
  | { type: "prose"; id: string }
  | { type: "reveal"; id: string }
  | { type: "item"; id: string; item: StepItem }
  | { type: "card"; id: string }
  | { type: "effect"; effect: Effect }
  | { type: "stepDone"; id: string; at: number; model?: { tokens: number; spend: number } }
  | { type: "log"; text: string; at: number; human?: boolean }
  | { type: "complete"; at: number }
  | { type: "decide"; to: DraftStatus; text: string; at: number }
  | { type: "reset" };

function patchStep(state: RunState, id: string, patch: Partial<StepState>): RunState {
  return { ...state, steps: { ...state.steps, [id]: { ...state.steps[id], ...patch } } };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start": {
      const steps: Record<string, StepState> = {};
      for (const s of action.scenario.steps) {
        steps[s.id] = {
          status: "pending",
          stream: "",
          streamDone: false,
          revealed: 0,
          items: [],
          showProse: false,
          showCard: false,
        };
      }
      return {
        ...initial,
        phase: "running",
        scenario: action.scenario,
        file: action.file,
        startedAt: action.at,
        steps,
        draft: "drafting",
      };
    }
    case "stepStart":
      return { ...patchStep(state, action.id, { status: "running", startedAt: action.at }), activeStep: action.id };
    case "stream":
      return patchStep(state, action.id, { stream: state.steps[action.id].stream + action.text });
    case "streamDone":
      return patchStep(state, action.id, { streamDone: true });
    case "prose":
      return patchStep(state, action.id, { showProse: true });
    case "reveal":
      return patchStep(state, action.id, { revealed: state.steps[action.id].revealed + 1 });
    case "item":
      return patchStep(state, action.id, { items: [...state.steps[action.id].items, action.item] });
    case "card":
      return patchStep(state, action.id, { showCard: true });
    case "effect": {
      const e = action.effect;
      if ("field" in e) return { ...state, fields: { ...state.fields, [e.field]: e.value } };
      if ("line" in e) {
        const lines = [...state.lines];
        lines[e.line] = { ...e.def, coding: lines[e.line]?.coding };
        return { ...state, lines };
      }
      if ("code" in e) {
        const lines = [...state.lines];
        if (lines[e.code]) lines[e.code] = { ...lines[e.code], coding: e.coding };
        return { ...state, lines };
      }
      return { ...state, totals: e.totals };
    }
    case "stepDone": {
      const s = state.steps[action.id];
      const flagged = s.items.some((i) => i.tone === "warn" || i.tone === "block");
      const next = patchStep(state, action.id, {
        status: flagged ? "flagged" : "done",
        ms: action.at - (s.startedAt ?? action.at),
      });
      if (!action.model) return next;
      return {
        ...next,
        stats: {
          ...next.stats,
          modelCalls: next.stats.modelCalls + 1,
          tokens: next.stats.tokens + action.model.tokens,
          spend: next.stats.spend + action.model.spend,
        },
      };
    }
    case "log":
      return { ...state, log: [{ at: action.at, text: action.text, human: action.human }, ...state.log] };
    case "complete":
      return { ...state, phase: "complete", endedAt: action.at, activeStep: null, draft: "hold" };
    case "decide":
      return {
        ...state,
        draft: action.to,
        stats: { ...state.stats, humanTouches: state.stats.humanTouches + 1 },
        log: [{ at: action.at, text: action.text, human: true }, ...state.log],
      };
    case "reset":
      return initial;
  }
}

/* ───────────────────────── Runner ───────────────────────── */

export const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function fillTemplate(text: string, file: RunFile) {
  return text
    .replace("{pages}", String(file.pages))
    .replace("{plural}", file.pages === 1 ? "" : "s")
    .replace("{size}", fmtSize(file.size))
    .replace("{shaShort}", `${file.sha.slice(0, 12)}…`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useInvoiceRun() {
  const [state, dispatch] = useReducer(reducer, initial);
  const token = useRef(0);

  const run = useCallback(async (scenario: Scenario, file: RunFile) => {
    const my = ++token.current;
    const alive = () => token.current === my;
    const now = () => performance.now();
    const wait = async (ms: number) => {
      await sleep(ms);
      return alive();
    };

    dispatch({ type: "start", scenario, file, at: now() });
    dispatch({ type: "log", text: scenario.steps[0].log, at: now() });
    if (!(await wait(700))) return;

    for (const step of scenario.steps) {
      if (!(await playStep(step))) return;
      if (!(await wait(260))) return;
    }
    dispatch({ type: "complete", at: now() });

    async function playStep(step: StepDef) {
      dispatch({ type: "stepStart", id: step.id, at: now() });
      const pending = [...(step.effects ?? [])];

      if (step.stream) {
        const total = step.stream.length;
        const ticks = Math.max(1, Math.round((step.streamMs ?? 3000) / 45));
        const per = Math.ceil(total / ticks);
        // A short "thinking" beat before tokens arrive
        if (!(await wait(420))) return false;
        let sent = 0;
        while (sent < total) {
          const jitter = Math.max(1, Math.round(per * (0.6 + Math.random() * 0.8)));
          const chunk = step.stream.slice(sent, sent + jitter);
          sent += chunk.length;
          dispatch({ type: "stream", id: step.id, text: chunk });
          const seen = step.stream.slice(0, sent);
          for (let i = pending.length - 1; i >= 0; i--) {
            const e = pending[i];
            if (e.when && seen.includes(e.when)) {
              dispatch({ type: "effect", effect: e });
              pending.splice(i, 1);
            }
          }
          if (!(await wait(45))) return false;
        }
        dispatch({ type: "streamDone", id: step.id });
        if (step.prose) {
          if (!(await wait(250))) return false;
          dispatch({ type: "prose", id: step.id });
        }
      } else if (!(await wait(step.workMs ?? 300))) return false;

      const rows = step.table?.rows.length ?? step.candidates?.length ?? 0;
      for (let i = 0; i < rows; i++) {
        dispatch({ type: "reveal", id: step.id });
        if (!(await wait(110))) return false;
      }

      for (const item of step.items ?? []) {
        if (!(await wait(item.tone === "ok" ? 150 : 320))) return false;
        dispatch({ type: "item", id: step.id, item: { ...item, text: fillTemplate(item.text, file) } });
      }

      for (const e of pending) dispatch({ type: "effect", effect: e });

      if (step.draftCard) {
        if (!(await wait(250))) return false;
        dispatch({ type: "card", id: step.id });
        if (!(await wait(600))) return false;
      }

      if (!(await wait(240))) return false;
      dispatch({
        type: "stepDone",
        id: step.id,
        at: now(),
        model: step.kind === "model" ? { tokens: step.tokens ?? 0, spend: step.spend ?? 0 } : undefined,
      });
      if (step.id !== scenario.steps[0].id) dispatch({ type: "log", text: step.log, at: now() });
      return true;
    }
  }, []);

  const reset = useCallback(() => {
    token.current++;
    dispatch({ type: "reset" });
  }, []);

  const decide = useCallback((to: DraftStatus, text: string) => {
    dispatch({ type: "decide", to, text, at: performance.now() });
  }, []);

  useEffect(() => () => void token.current++, []);

  return { state, run, reset, decide };
}

/** The current time (performance.now), refreshed on an interval while `active`, for live timers. */
export function useTicker(active: boolean, ms = 60) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(performance.now());
    const id = setInterval(tick, ms);
    const first = requestAnimationFrame(tick);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(first);
    };
  }, [active, ms]);
  return now;
}
