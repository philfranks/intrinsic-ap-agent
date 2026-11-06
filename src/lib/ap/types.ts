export type Tone = "ok" | "info" | "warn" | "block";

export type StepItem = { tone: Tone; text: string; meta?: string };

export type DraftFieldKey = "vendor" | "invoiceNo" | "invoiceDate" | "due" | "po" | "branch";

export type LineDef = {
  description: string;
  detail?: string;
  amount: number;
};

export type LineCoding = { gl: string; glName: string; dept: string; confidence: number };

/** A change to the draft bill, applied when the step's stream passes `when` (or at step end). */
export type Effect =
  | { when?: string; field: DraftFieldKey; value: string }
  | { when?: string; line: number; def: LineDef }
  | { when?: string; code: number; coding: LineCoding }
  | { when?: string; totals: { subtotal: number; tax: number | null; total: number } };

export type StepDef = {
  id: string;
  title: string;
  kind: "rules" | "model";
  /** Small mono tag under the title, e.g. "agent · rules" or "Claude · reads the PDF". */
  tag: string;
  /** One-line summary shown once the step is done and collapsed. */
  summary: string;
  /** Raw model output, streamed into a console block. */
  stream?: string;
  streamMs?: number;
  /** Plain-language read of the model output, shown after the stream. */
  prose?: string;
  table?: { caption: string; rows: string[][] };
  candidates?: { name: string; meta: string; score: number; matched?: boolean }[];
  items?: StepItem[];
  draftCard?: { title: string; lead: string; reasons: string[]; note: string };
  payload?: string;
  effects?: Effect[];
  /** Pacing for rules steps (ms of work before items start). */
  workMs?: number;
  tokens?: number;
  spend?: number;
  log: string;
};

export type Scenario = {
  id: string;
  vendor: string;
  vendorShort: string;
  amount: number;
  file: { name: string; pages: number; size: number; sha: string };
  intake: string;
  /** Mini invoice used for the document thumbnail. */
  doc: {
    title: string;
    number: string;
    issued: string;
    due: string;
    from: string[];
    billTo: string[];
    lines: { d: string; q: string; a: string }[];
    total: string;
    brand: string;
  };
  steps: StepDef[];
  holdReasons: string[];
  paymentDate: string;
};

export type DraftStatus = "empty" | "drafting" | "hold" | "released" | "approved" | "rejected";
