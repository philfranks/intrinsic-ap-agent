"use client";

import { motion, useReducedMotion } from "motion/react";
import { MARK, markRank } from "@/lib/brand/mark";

/**
 * The Signal, alive. Idle: the strokes light in sequence from the outer points to the center,
 * small signals building into something strong. Armed (a file is over the drop zone): every
 * stroke lights orange at once and the mark lifts.
 */
export function SignalMark({ armed, size = 120 }: { armed: boolean; size?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.svg
      viewBox={`-6 -6 ${MARK.w + 12} ${MARK.h + 12}`}
      width={size}
      height={(size * (MARK.h + 12)) / (MARK.w + 12)}
      aria-hidden="true"
      animate={{ scale: armed ? 1.08 : 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: "visible" }}
    >
      {MARK.paths.map((d, i) => {
        const rank = markRank(i);
        const delay = rank * 0.16 + (i >= 6 ? 0.04 : 0);
        return (
          <motion.path
            key={i}
            d={d}
            initial={false}
            animate={
              armed
                ? { opacity: 1, fill: "var(--il-orange)" }
                : reduce
                  ? { opacity: 0.55, fill: "var(--ink)" }
                  : { opacity: [0.12, 0.12, 0.85, 0.85, 0.12], fill: "var(--ink)" }
            }
            transition={
              armed || reduce
                ? { duration: 0.35, delay: armed ? rank * 0.03 : 0, ease: [0.16, 1, 0.3, 1] }
                : {
                    opacity: {
                      duration: 3.6,
                      times: [0, 0.08 + rank * 0.05, 0.3 + rank * 0.05, 0.72, 1],
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: delay * 0.25,
                    },
                    fill: { duration: 0.35 },
                  }
            }
          />
        );
      })}
    </motion.svg>
  );
}
