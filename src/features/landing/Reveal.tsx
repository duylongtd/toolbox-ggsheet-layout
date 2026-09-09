"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reports the first time an element is scrolled into view.
 *
 * Measured on a timer against the window. See the note beside the poll for
 * why this does not use IntersectionObserver, animation frames or scroll
 * events on their own.
 *
 * Kept as a hook as well as a wrapper because the device mock ups need the
 * state itself: they settle a tilt and run their contents in sequence rather
 * than simply fading.
 */
export function useInView<T extends HTMLElement>(margin = 0.12) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // A reader who asked for less motion gets the finished state at once.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      const rect = element.getBoundingClientRect();
      // Reached once its top has crossed most of the way up the window.
      if (rect.top < window.innerHeight * (1 - margin) && rect.bottom > 0) {
        setInView(true);
        stop();
      }
    };

    // Polled rather than driven by an event. Scroll events, animation frames
    // and IntersectionObserver all stop arriving in contexts where the page is
    // not being painted, and any of them failing leaves this content at zero
    // opacity for good with no way for the page to notice. A position read
    // every sixth of a second costs nothing at this many elements, stops the
    // moment the element is revealed, and cannot be starved.
    const timer = window.setInterval(check, 160);
    // The scroll listener only makes the response immediate where it works.
    window.addEventListener("scroll", check, { passive: true });

    function stop() {
      window.clearInterval(timer);
      window.removeEventListener("scroll", check);
    }

    // Deferred one tick so the hidden state paints and the transition has
    // somewhere to start from.
    const first = window.setTimeout(check, 40);

    return () => {
      cancelled = true;
      window.clearTimeout(first);
      stop();
    };
  }, [margin]);

  return { ref, inView };
}

/** Fades and lifts its children into place when they are reached. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  distance = 26,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  distance?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.1);

  return (
    <div
      ref={ref}
      // Marked so the page can force everything visible where scripts do not
      // run at all. Content that only appears once JavaScript has said so must
      // have a way back.
      data-reveal=""
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : `translateY(${distance}px)`,
        transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
