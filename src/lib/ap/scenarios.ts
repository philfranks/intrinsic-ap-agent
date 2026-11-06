import type { Scenario, StepDef } from "./types";

/*
 * Rehearsal scenarios. Each mirrors a real run of the AP agent for Certified Cultivators
 * (Acumatica). Steps play back with realistic pacing; model steps stream their raw output.
 */

const RECEIVE = (log: string): StepDef => ({
  id: "receive",
  title: "Receive",
  kind: "rules",
  tag: "agent · rules",
  summary: "Attachment checked, fingerprinted, sender approved",
  workMs: 350,
  items: [
    { tone: "ok", text: "PDF attachment, {pages} page{plural}, {size}" },
    { tone: "ok", text: "Fingerprinted: sha256 {shaShort}" },
    { tone: "info", text: "Sender is on the approved intake list for Certified Cultivators" },
  ],
  log,
});

/* ───────────────────────── Langfuse: the messy one ───────────────────────── */

const langfuseClassify = `{"doc_type":"invoice","vendor_on_page":"Langfuse GmbH","is_legible":true,"language":"English","summary":"Langfuse GmbH invoice 8CB34A33-75441 (issued and due November 4, 2026) bills $136.93 USD for Langfuse usage of 1,513,295 units from Oct 4 to Nov 4, 2026 ($107.93) plus a Langfuse Core subscription for Nov 4 to Dec 4, 2026 ($29.00). Note that it is addressed to Intrinsic Labs Holdings, Inc (Columbus, Ohio), not Certified Cultivators, so the recipient should be verified before processing."}`;

const langfuseExtract = `{"vendor_name":"Langfuse GmbH","invoice_number":"8CB34A33-75441","invoice_date":"2026-11-04","due_date":"2026-11-04","payment_terms":null,"po_number":null,"bill_to":"Intrinsic Labs Holdings, Inc, 243 N 5th St, Suite 340, Columbus, Ohio 43215, United States","service_location":null,"currency":"USD","line_items":[{"description":"Langfuse Usage (per units) Oct 4–Nov 4, 2026","quantity":1513295,"amount":107.93},{"description":"Langfuse Core Nov 4–Dec 4, 2026","quantity":1,"unit_price":29.00,"amount":29.00}],"subtotal":136.93,"tax":null,"total":136.93}`;

const langfuseCode = `{"lines":[{"line":1,"gl":"6410","gl_name":"Software & subscriptions","branch":"ADM","confidence":0.35,"reason":"Metered usage for Langfuse, a SaaS LLM-observability platform. Tiers recompute correctly to $107.93. Fits 6410; ADM is a placeholder because the invoice names no user."},{"line":2,"gl":"6410","gl_name":"Software & subscriptions","branch":"ADM","confidence":0.35,"reason":"Langfuse Core is a $29.00 monthly SaaS plan billed in advance; same branch question as the usage line."}],"approver_note":"Keep the bill on hold. Before anyone releases it, the AP lead or controller must resolve the bill-to mismatch: the invoice is addressed to Intrinsic Labs Holdings, Inc (Columbus), not Certified Cultivators. If confirmed as ours, the requesting department head approves the spend and assigns the branch."}`;

const langfusePayload = `{
  "entity": "Bill",
  "Vendor": { "value": "NEW-VENDOR" },
  "VendorRef": { "value": "8CB34A33-75441" },
  "Date": { "value": "2026-11-04" },
  "DueDate": { "value": "2026-11-04" },
  "Hold": { "value": true },
  "Description": { "value": "Langfuse GmbH · on hold, 8 reasons" },
  "Details": [
    {
      "Account": { "value": "6410" },
      "Branch": { "value": "ADM" },
      "ExtendedCost": { "value": 107.93 },
      "TranDesc": { "value": "Langfuse Usage (per units) Oct 4–Nov 4, 2026" }
    },
    {
      "Account": { "value": "6410" },
      "Branch": { "value": "ADM" },
      "ExtendedCost": { "value": 29 },
      "TranDesc": { "value": "Langfuse Core Nov 4–Dec 4, 2026" }
    }
  ]
}`;

const LANGFUSE_REASONS = [
  "Vendor is not in the vendor master.",
  "Line 1 coded at 35%: metered usage for a SaaS LLM-observability platform. Fits 6410, but the invoice names no user, so the branch is a placeholder.",
  "Line 2 coded at 35%: $29.00 monthly SaaS plan billed in advance. Same owner question as line 1.",
  "Wrong bill-to entity: addressed to Intrinsic Labs Holdings, Inc (Columbus, OH), not Certified Cultivators.",
  "New vendor: Langfuse GmbH, Berlin, VAT ID DE358330767. Needs a W-8BEN-E and verified remittance details.",
  "No PO referenced. The only open PO, CC-PO-2210 (Hydrofarm), is unrelated.",
  "Branch unknown: none of the Dayton branches appears on the invoice.",
  "Due on receipt: likely a card or auto-charge plan. Check it hasn't already been paid.",
];

export const LANGFUSE: Scenario = {
  id: "langfuse",
  vendor: "Langfuse GmbH",
  vendorShort: "Langfuse",
  amount: 136.93,
  file: {
    name: "Invoice-8CB34A33-75441.pdf",
    pages: 1,
    size: 90_624,
    sha: "527540deffaacb0e91d2c7f05ab4e7c1a3d9f6620b84e1c5d7a0f3b29c6e4d18",
  },
  intake: "ap@certifiedcultivators.com",
  doc: {
    title: "Invoice",
    number: "8CB34A33-75441",
    issued: "November 4, 2026",
    due: "November 4, 2026",
    from: ["Langfuse GmbH", "Oranienburger Straße 91", "10178 Berlin, Germany"],
    billTo: ["Intrinsic Labs Holdings, Inc", "243 N 5th St, Suite 340", "Columbus, OH 43215"],
    lines: [
      { d: "Langfuse Usage (per units)", q: "1,513,295", a: "$107.93" },
      { d: "Langfuse Core", q: "1", a: "$29.00" },
    ],
    total: "$136.93",
    brand: "langfuse",
  },
  holdReasons: LANGFUSE_REASONS,
  paymentDate: "Nov 10, 2026",
  steps: [
    RECEIVE("Invoice-8CB34A33-75441.pdf received at intake (dropped by you)."),
    {
      id: "classify",
      title: "Classify",
      kind: "model",
      tag: "Claude · reads the PDF",
      summary: "Invoice from Langfuse GmbH · legible · bill-to looks wrong",
      stream: langfuseClassify,
      streamMs: 3200,
      prose:
        "Langfuse GmbH invoice 8CB34A33-75441 bills $136.93 for usage ($107.93) plus a Core subscription ($29.00). It's addressed to Intrinsic Labs Holdings in Columbus, not Certified Cultivators, so the recipient needs verifying.",
      items: [
        { tone: "ok", text: "Document type: invoice" },
        { tone: "info", text: "Vendor on the page: Langfuse GmbH" },
        { tone: "ok", text: "Legible, no OCR fallback needed" },
      ],
      tokens: 3_412,
      spend: 0.024,
      log: "It is an invoice from Langfuse GmbH.",
    },
    {
      id: "extract",
      title: "Extract",
      kind: "model",
      tag: "Claude · structured output",
      summary: "2 lines · $136.93 · header fields drafted",
      stream: langfuseExtract,
      streamMs: 4200,
      prose: "Header fields fill the draft on the right as they stream.",
      items: [{ tone: "ok", text: "2 lines, total $136.93" }],
      effects: [
        { when: `"Langfuse GmbH"`, field: "vendor", value: "Langfuse GmbH" },
        { when: `"8CB34A33-75441"`, field: "invoiceNo", value: "8CB34A33-75441" },
        { when: `"invoice_date":"2026-11-04"`, field: "invoiceDate", value: "2026-11-04" },
        { when: `"due_date":"2026-11-04"`, field: "due", value: "2026-11-04" },
        { when: `"po_number":null`, field: "po", value: "none" },
        {
          when: `"amount":107.93}`,
          line: 0,
          def: {
            description: "Langfuse Usage (per units) Oct 4–Nov 4, 2026",
            detail: "1,513,295 units · first 100k free, then tiered",
            amount: 107.93,
          },
        },
        {
          when: `"amount":29.00}`,
          line: 1,
          def: { description: "Langfuse Core Nov 4–Dec 4, 2026", detail: "Monthly plan, billed in advance", amount: 29 },
        },
        { when: `"total":136.93}`, totals: { subtotal: 136.93, tax: null, total: 136.93 } },
      ],
      tokens: 4_018,
      spend: 0.029,
      log: "Read 2 lines totaling $136.93 from Langfuse GmbH.",
    },
    {
      id: "validate",
      title: "Validate",
      kind: "rules",
      tag: "agent · rules",
      summary: "Math and required fields check out · no PO",
      workMs: 250,
      items: [
        { tone: "ok", text: "Required fields present" },
        { tone: "ok", text: "Lines add up to the subtotal", meta: "$136.93" },
        { tone: "ok", text: "Subtotal plus tax equals the total", meta: "$136.93" },
        { tone: "ok", text: "Invoice date is recent", meta: "2026-11-04" },
        { tone: "ok", text: "Due date is on or after the invoice date", meta: "2026-11-04" },
        { tone: "ok", text: "Total is positive" },
        { tone: "info", text: "No PO on the invoice" },
      ],
      log: "Arithmetic and required fields check out.",
    },
    {
      id: "duplicate",
      title: "Duplicate check",
      kind: "rules",
      tag: "agent · history",
      summary: "No match across 9 recent invoices",
      workMs: 400,
      table: {
        caption: "Compared against 9 invoices: file fingerprint, vendor + number, vendor + amount within 30 days.",
        rows: [
          ["2026-10-20", "771-2026-10", "$18,740.12", "AES Ohio (Dayton Power & Light)"],
          ["2026-10-31", "MV-2026-1031", "$6,400.00", "Miami Valley Security Services"],
          ["2026-10-08", "KC-902211", "$3,875.00", "KushCo Holdings"],
          ["2026-10-17", "UL-1182930", "$462.90", "Uline"],
        ],
      },
      items: [{ tone: "ok", text: "No match on fingerprint, number, or amount" }],
      log: "No duplicate in the ledger.",
    },
    {
      id: "vendor",
      title: "Match vendor",
      kind: "rules",
      tag: "agent · vendor master",
      summary: "No match above 60% · treated as a new vendor",
      workMs: 450,
      candidates: [
        { name: "Hydrofarm Distribution", meta: "HYDROFARM · default 5110 · Net 30", score: 18 },
        { name: "GrowGeneration Corp", meta: "GROWGEN · default 5110 · Net 30", score: 12 },
        { name: "North Coast Testing Laboratories", meta: "NCTL · default 5130 · Net 15", score: 7 },
      ],
      items: [
        {
          tone: "warn",
          text: "No vendor in the master scores above 60%. Treated as a new vendor; AP must set it up before payment.",
        },
      ],
      log: "New vendor. AP will need to set it up.",
    },
    {
      id: "code",
      title: "Code lines",
      kind: "model",
      tag: "Claude · chart of accounts, vendor history, policy",
      summary: "2 lines coded to 6410 at 35% · 6 flags",
      stream: langfuseCode,
      streamMs: 5200,
      effects: [
        {
          when: `"confidence":0.35,"reason":"Metered`,
          code: 0,
          coding: { gl: "6410", glName: "Software & subscriptions", dept: "Administration", confidence: 35 },
        },
        { when: `"branch":"ADM"`, field: "branch", value: "Administration" },
        {
          when: `"confidence":0.35,"reason":"Langfuse Core`,
          code: 1,
          coding: { gl: "6410", glName: "Software & subscriptions", dept: "Administration", confidence: 35 },
        },
      ],
      items: [
        { tone: "warn", text: "2 lines below the 80% confidence floor" },
        {
          tone: "block",
          text: "Wrong bill-to entity: addressed to Intrinsic Labs Holdings, Inc, 243 N 5th St, Suite 340, Columbus, OH 43215, not Certified Cultivators in Dayton. Don't release until someone confirms this is a Certified Cultivators obligation.",
        },
        {
          tone: "block",
          text: "New vendor not in the vendor master: Langfuse GmbH, Berlin. Setup and verification, including a W-8BEN-E, are needed before payment. Don't rely on the “Pay online” link or emailed bank details.",
        },
        {
          tone: "warn",
          text: "No PO referenced. The only open PO, CC-PO-2210 (Hydrofarm Distribution, $1,850.00), is unrelated and must not be matched.",
        },
        {
          tone: "warn",
          text: "Branch unknown: no Dayton branch is identified on the invoice. ADM is a placeholder; confirm the business owner and user team.",
        },
        {
          tone: "warn",
          text: "Due date equals the issue date (Nov 4), so it's due on receipt. Likely a card or auto-charge plan; check whether it's already been paid.",
        },
        {
          tone: "info",
          text: "No prior invoices from this vendor and no same-vendor amounts within 30 days. Tiers recompute: $0.00 + $72.00 + $35.93 = $107.93, plus $29.00.",
        },
      ],
      tokens: 3_952,
      spend: 0.03,
      log: "Coded with 6 open questions.",
    },
    {
      id: "route",
      title: "Route and draft",
      kind: "rules",
      tag: "agent · policy",
      summary: "Draft on hold in Acumatica · 8 reasons for AP",
      workMs: 500,
      draftCard: {
        title: "Draft on hold in Acumatica",
        lead: "Created on hold with the reasons below. AP resolves them, then it routes to an AP reviewer.",
        reasons: LANGFUSE_REASONS,
        note: "Keep the bill on hold. Before release, the AP lead or controller resolves the bill-to mismatch. If it's ours, the requesting department head approves the spend and assigns the branch. Vendor setup with a W-8BEN-E goes through vendor master maintenance first.",
      },
      payload: langfusePayload,
      log: "Draft on hold in Acumatica with 8 reasons for AP.",
    },
  ],
};

/* ──────────────────── North Coast Testing: the near-clean one ──────────────────── */

const nctlClassify = `{"doc_type":"invoice","vendor_on_page":"North Coast Testing Laboratories, LLC","is_legible":true,"language":"English","summary":"North Coast Testing Laboratories invoice 118503 (issued Nov 3, due Nov 18, 2026) bills $153.00 for three I-5 microbial contamination tests at $51.00 each, billed to Certified Cultivators, Dayton, under METRC manifest #1558502."}`;

const nctlExtract = `{"vendor_name":"North Coast Testing Laboratories, LLC","invoice_number":"118503","invoice_date":"2026-11-03","due_date":"2026-11-18","payment_terms":"Net 15","po_number":null,"bill_to":"Certified Cultivators, 4400 Gateway Blvd, Dayton, OH 45424","remit_to":"2194 E Enterprise Pkwy, Twinsburg, OH 44087","currency":"USD","line_items":[{"description":"I-5 (Microbial Contamination)","quantity":3,"unit_price":51.00,"amount":153.00,"reference":"Manifest #1558502"}],"subtotal":153.00,"tax":null,"total":153.00}`;

const nctlCode = `{"lines":[{"line":1,"gl":"5130","gl_name":"Lab testing — third party","branch":"LAB","confidence":0.9,"reason":"Compliance testing from NCTL; both prior NCTL invoices coded to 5130 / Lab & Compliance. Policy requires a batch key on 5130 lines, and the invoice shows only the manifest."}],"approver_note":"Create the bill on hold. The Lab & Compliance manager should approve, since they can confirm the batch IDs tied to manifest #1558502 and that the testing was ordered. An AP reviewer releases the bill after the batch key is added."}`;

const nctlPayload = `{
  "entity": "Bill",
  "Vendor": { "value": "NCTL" },
  "VendorRef": { "value": "118503" },
  "Date": { "value": "2026-11-03" },
  "DueDate": { "value": "2026-11-18" },
  "Terms": { "value": "NET15" },
  "Hold": { "value": true },
  "Details": [
    {
      "Account": { "value": "5130" },
      "Branch": { "value": "LAB" },
      "Qty": { "value": 3 },
      "UnitCost": { "value": 51 },
      "TranDesc": { "value": "I-5 (Microbial Contamination)" }
    }
  ]
}`;

const NCTL_REASONS = [
  "Remit-to address differs from the vendor master.",
  "Batch key missing: policy requires 5130 testing to be keyed by batch, but the invoice shows only Manifest #1558502. Lab & Compliance should supply batch IDs for the 3 samples.",
];

export const NCTL: Scenario = {
  id: "nctl",
  vendor: "North Coast Testing Laboratories",
  vendorShort: "North Coast Testing",
  amount: 153,
  file: {
    name: "NCTL-118503.pdf",
    pages: 1,
    size: 224_870,
    sha: "a94b28945a56b8c17f0d3e2b9c4a6e8d1f7b3c5a2e9d0f4b6c8a1e3d5f7b9c20",
  },
  intake: "ap@certifiedcultivators.com",
  doc: {
    title: "Invoice",
    number: "118503",
    issued: "November 3, 2026",
    due: "November 18, 2026",
    from: ["North Coast Testing Labs", "2194 E Enterprise Pkwy", "Twinsburg, OH 44087"],
    billTo: ["Certified Cultivators", "4400 Gateway Blvd", "Dayton, OH 45424"],
    lines: [{ d: "I-5 (Microbial Contamination)", q: "3", a: "$153.00" }],
    total: "$153.00",
    brand: "NCTL",
  },
  holdReasons: NCTL_REASONS,
  paymentDate: "Nov 18, 2026",
  steps: [
    RECEIVE("NCTL-118503.pdf received at intake (dropped by you)."),
    {
      id: "classify",
      title: "Classify",
      kind: "model",
      tag: "Claude · reads the PDF",
      summary: "Invoice from North Coast Testing Labs · legible",
      stream: nctlClassify,
      streamMs: 2600,
      prose:
        "North Coast Testing Laboratories invoice 118503 bills $153.00 for three I-5 microbial contamination tests, billed to Certified Cultivators in Dayton under manifest #1558502.",
      items: [
        { tone: "ok", text: "Document type: invoice" },
        { tone: "info", text: "Vendor on the page: North Coast Testing Laboratories, LLC" },
        { tone: "ok", text: "Legible, no OCR fallback needed" },
      ],
      tokens: 2_980,
      spend: 0.02,
      log: "It is an invoice from North Coast Testing Laboratories.",
    },
    {
      id: "extract",
      title: "Extract",
      kind: "model",
      tag: "Claude · structured output",
      summary: "1 line · $153.00 · header fields drafted",
      stream: nctlExtract,
      streamMs: 3600,
      prose: "Header fields fill the draft on the right as they stream.",
      items: [{ tone: "ok", text: "1 line, total $153.00" }],
      effects: [
        { when: `"North Coast Testing Laboratories, LLC"`, field: "vendor", value: "North Coast Testing Laboratories, LLC" },
        { when: `"118503"`, field: "invoiceNo", value: "118503" },
        { when: `"invoice_date":"2026-11-03"`, field: "invoiceDate", value: "2026-11-03" },
        { when: `"due_date":"2026-11-18"`, field: "due", value: "2026-11-18" },
        { when: `"po_number":null`, field: "po", value: "none" },
        {
          when: `"Manifest #1558502"}`,
          line: 0,
          def: { description: "I-5 (Microbial Contamination)", detail: "3 × $51.00 · Manifest #1558502", amount: 153 },
        },
        { when: `"total":153.00}`, totals: { subtotal: 153, tax: null, total: 153 } },
      ],
      tokens: 3_301,
      spend: 0.022,
      log: "Read 1 line totaling $153.00 from North Coast Testing.",
    },
    {
      id: "validate",
      title: "Validate",
      kind: "rules",
      tag: "agent · rules",
      summary: "Math and required fields check out · no PO",
      workMs: 250,
      items: [
        { tone: "ok", text: "Required fields present" },
        { tone: "ok", text: "Lines add up to the subtotal", meta: "$153.00" },
        { tone: "ok", text: "Subtotal plus tax equals the total", meta: "$153.00" },
        { tone: "ok", text: "Invoice date is recent", meta: "2026-11-03" },
        { tone: "ok", text: "Due date is after the invoice date", meta: "2026-11-18" },
        { tone: "ok", text: "Total is positive" },
        { tone: "info", text: "No PO on the invoice" },
      ],
      log: "Arithmetic and required fields check out.",
    },
    {
      id: "duplicate",
      title: "Duplicate check",
      kind: "rules",
      tag: "agent · history",
      summary: "No match · numbering differs from prior NCTL bills",
      workMs: 400,
      table: {
        caption: "Compared against 9 invoices: file fingerprint, vendor + number, vendor + amount within 30 days.",
        rows: [
          ["2026-10-14", "NCT-8641", "$1,480.00", "North Coast Testing Laboratories"],
          ["2026-09-30", "NCT-8702", "$820.00", "North Coast Testing Laboratories"],
          ["2026-10-20", "771-2026-10", "$18,740.12", "AES Ohio (Dayton Power & Light)"],
          ["2026-10-17", "UL-1182930", "$462.90", "Uline"],
        ],
      },
      items: [
        { tone: "ok", text: "No match on fingerprint, number, or amount" },
        {
          tone: "info",
          text: "Invoice #118503 uses a different number format from prior NCT-#### bills. Entered as-is; not a reissue under a new number.",
        },
      ],
      log: "No duplicate in the ledger.",
    },
    {
      id: "vendor",
      title: "Match vendor",
      kind: "rules",
      tag: "agent · vendor master",
      summary: "Matched NCTL · remit-to differs",
      workMs: 450,
      candidates: [
        { name: "North Coast Testing Laboratories", meta: "NCTL · default 5130 · Net 15", score: 94, matched: true },
        { name: "Hydrofarm Distribution", meta: "HYDROFARM · default 5110 · Net 30", score: 9 },
        { name: "GrowGeneration Corp", meta: "GROWGEN · default 5110 · Net 30", score: 6 },
      ],
      items: [
        { tone: "ok", text: "Matched to North Coast Testing Laboratories (NCTL)" },
        { tone: "warn", text: "Remit-to on the invoice differs from the vendor master. Flagged for AP." },
        { tone: "info", text: "Pulled 2 prior coded invoices for context: NCT-8641, NCT-8702" },
      ],
      log: "Vendor matched: North Coast Testing Laboratories.",
    },
    {
      id: "code",
      title: "Code lines",
      kind: "model",
      tag: "Claude · chart of accounts, vendor history, policy",
      summary: "1 line coded to 5130 at 90% · batch key missing",
      stream: nctlCode,
      streamMs: 4200,
      effects: [
        {
          when: `"confidence":0.9`,
          code: 0,
          coding: { gl: "5130", glName: "Lab testing — third party", dept: "Lab & Compliance", confidence: 90 },
        },
        { when: `"branch":"LAB"`, field: "branch", value: "Lab & Compliance" },
      ],
      items: [
        { tone: "ok", text: "All lines at or above the 80% confidence floor" },
        {
          tone: "warn",
          text: "Batch key missing: policy requires 5130 testing to be keyed by batch, but the invoice shows only Manifest #1558502 and no batch IDs. Lab & Compliance should supply them from the METRC manifest.",
        },
        {
          tone: "info",
          text: "Terms Net 15 match the vendor master; due 11/18/2026. Math checks out: 3 × $51.00 = $153.00, no tax.",
        },
      ],
      tokens: 3_433,
      spend: 0.024,
      log: "Every line coded with confidence.",
    },
    {
      id: "route",
      title: "Route and draft",
      kind: "rules",
      tag: "agent · policy",
      summary: "Draft on hold in Acumatica · 2 reasons for AP",
      workMs: 500,
      draftCard: {
        title: "Draft on hold in Acumatica",
        lead: "Created on hold with the reasons below. AP resolves them, then it routes to an AP reviewer.",
        reasons: NCTL_REASONS,
        note: "The Lab & Compliance manager should approve, since they can confirm the batch IDs tied to manifest #1558502 and that the testing was ordered. An AP reviewer releases the bill after the batch key is added.",
      },
      payload: nctlPayload,
      log: "Draft on hold in Acumatica with 2 reasons for AP.",
    },
  ],
};

export const SCENARIOS = [LANGFUSE, NCTL];
