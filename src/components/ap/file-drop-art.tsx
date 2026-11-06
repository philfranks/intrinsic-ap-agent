"use client";

import { motion, useReducedMotion } from "motion/react";

/*
 * File-drop illustration. A document with a downward arrow fades in from above, settles,
 * then drops into the orange tray and slips out of sight; the next one loads in. Loops.
 * When a file is dragged over the window ("armed"), the document hovers over the tray
 * and the tray lights up, waiting for the real file.
 *
 * Geometry (viewBox 240 × 200): document 70 × 80 centered at x 120; tray 100 × 30 below it.
 */

const LOOP = 3.4; // seconds
const T = [0, 0.16, 0.5, 0.7, 1]; // fade in · settle · hold · drop · rest
const EASE = [0.16, 1, 0.3, 1] as const;

function Doc() {
  return (
    <>
      {/* Page with the folded corner */}
      <path
        d="M97 33 H143 L167 57 V109 a12 12 0 0 1 -12 12 H97 a12 12 0 0 1 -12 -12 V45 a12 12 0 0 1 12 -12 Z"
        fill="var(--drop-paper)"
        stroke="var(--drop-ink)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M143 33 V49 a8 8 0 0 0 8 8 H167 Z" fill="var(--drop-fold)" stroke="var(--drop-ink)" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Arrow pointing down, into the tray */}
      <path d="M126 64 V100 M112.5 86.5 L126 100 L139.5 86.5" fill="none" stroke="var(--drop-ink)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

export function FileDropArt({ armed, size = 264 }: { armed: boolean; size?: number }) {
  const reduce = useReducedMotion();
  const still = reduce && !armed;

  return (
    <svg
      className="drop-art"
      data-armed={armed ? "true" : undefined}
      viewBox="0 0 252 170"
      width={size}
      height={(size * 170) / 252}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="drop-tray-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--drop-tray-top)" />
          <stop offset="1" stopColor="var(--drop-tray-bottom)" />
        </linearGradient>
        {/* The document disappears as it passes the tray floor */}
        <clipPath id="drop-doc-clip">
          <rect x="0" y="-80" width="252" height="226" />
        </clipPath>
      </defs>

      {/* Tray body, behind the document */}
      <motion.rect
        x="66"
        y="110"
        width="120"
        height="44"
        rx="16"
        fill="url(#drop-tray-fill)"
        style={{ transformOrigin: "126px 154px" }}
        animate={
          armed
            ? { scaleY: 1.06, scaleX: 1.02 }
            : still
              ? { scaleY: 1, scaleX: 1 }
              : { scaleY: [1, 1, 1, 0.94, 1.02, 1], scaleX: [1, 1, 1, 1.02, 0.995, 1] }
        }
        transition={
          armed || still
            ? { duration: 0.5, ease: EASE }
            : { duration: LOOP, times: [0, 0.5, 0.66, 0.72, 0.8, 0.9], repeat: Infinity, ease: "easeOut" }
        }
      />

      {/* The document */}
      <g clipPath="url(#drop-doc-clip)">
        <motion.g
          animate={
            armed
              ? { y: [-6, 2, -6], opacity: 1 }
              : still
                ? { y: 0, opacity: 1 }
                : { y: [-40, 0, 0, 116, 116], opacity: [0, 1, 1, 1, 0] }
          }
          transition={
            armed
              ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
              : still
                ? { duration: 0 }
                : {
                    duration: LOOP,
                    times: T,
                    repeat: Infinity,
                    ease: ["easeOut", "linear", "easeIn", "linear"],
                  }
          }
        >
          <Doc />
        </motion.g>
      </g>

      {/* Tray outline: open at the top, with the two lips hooking over the rim */}
      <motion.path
        d="M78 110 Q66 110 66 126 V138 Q66 154 82 154 H170 Q186 154 186 138 V126 Q186 110 174 110"
        fill="none"
        stroke="var(--drop-tray-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        style={{ transformOrigin: "126px 154px" }}
        animate={
          armed
            ? { scaleY: 1.06, scaleX: 1.02 }
            : still
              ? { scaleY: 1, scaleX: 1 }
              : { scaleY: [1, 1, 1, 0.94, 1.02, 1], scaleX: [1, 1, 1, 1.02, 0.995, 1] }
        }
        transition={
          armed || still
            ? { duration: 0.5, ease: EASE }
            : { duration: LOOP, times: [0, 0.5, 0.66, 0.72, 0.8, 0.9], repeat: Infinity, ease: "easeOut" }
        }
      />
    </svg>
  );
}
