# Intrinsic AP Agent

The product surface for Intrinsic Labs' accounts payable agent. Drop an invoice and watch the agent receive, classify, extract, validate, de-duplicate, match the vendor, code the lines, and draft the bill, with the draft building live in the right rail until a person approves it.

## Run it

```bash
npm install
npm run dev   # http://localhost:4400
```

## What's here

- `src/components/shell/` — app shell: tonal left rail (collapsible with ⌘\), workspace switcher, account menu with the light/dark theme switch
- `src/components/ap/` — Invoice Intake: Signal drop zone, file chip, 8-step timeline, draft-bill rail with approval
- `src/lib/ap/` — run engine (`use-run.ts`), scenario data (`scenarios.ts`), types
- `src/app/globals.css` — brand tokens (light default, dark under `[data-theme="dark"]`) and shell styles
- `src/app/ap.css` — Invoice Intake styles

## Rehearsal mode

Runs replay scripted scenarios with realistic pacing (Langfuse: messy, 8 hold reasons; North Coast Testing: near-clean, 2). A dropped file keeps its real name, size and SHA-256, then plays the closest scenario. Live mode (real model calls) is not wired yet.

## Brand

Colors and motion curves come from the Intrinsic Labs brand tokens. Product UI type is Inter; labels, data and timings are Azeret Mono. The logomark is the Signal.
