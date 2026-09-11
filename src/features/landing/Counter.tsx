"use client";

import { useEffect, useState } from "react";
import { useInView } from "./Reveal";

/**
 * A number that counts up to its value the first time it is seen.
 *
 * The count runs on a timer rather than an animation frame so it finishes
 * everywhere the page is painted at all, and it always lands exactly on the
 * value: the last step is written explicitly, not left to accumulate.
 */
export function Counter({
  value,
  duration = 1400,
  format = (n: number) => n.toLocaleString("vi-VN"),
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.05);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / duration);
      // Fast at first, settling at the end, so the final digits are readable.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t >= 1) {
        setShown(value);
        window.clearInterval(timer);
      }
    }, 30);
    return () => window.clearInterval(timer);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(shown)}
    </span>
  );
}
