"use client";

import { PdfScreen } from "./PdfScreen";
import { useInView } from "./Reveal";
import { Tilt } from "./Tilt";

/**
 * The same report on a computer, turned the other way.
 *
 * The two devices mirror each other so the pair reads as one set rather than as
 * the same picture twice.
 */
export function DesktopMock() {
  const { ref, inView } = useInView<HTMLDivElement>(0.18);

  return (
    <div
      ref={ref}
      aria-hidden
      data-reveal=""
      className="relative"
      style={{ fontSize: "min(15px, 2.5vw)", perspective: "1900px" }}
    >
      <div
        className="mx-auto w-full max-w-[44em]"
        style={{
          transform: inView
            ? "rotateY(15deg) rotateX(5deg) rotateZ(1deg)"
            : "rotateY(30deg) rotateX(9deg) rotateZ(2deg) translateY(2.5em)",
          opacity: inView ? 1 : 0,
          transformStyle: "preserve-3d",
          transition:
            "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease-out",
        }}
      >
        <Tilt max={5}>
          <div
            className="overflow-hidden rounded-[0.75em] bg-[#0d1512] p-[0.3em]"
            style={{
              boxShadow:
                "0 4em 7em -2.5em rgba(6, 22, 16, 0.75), 0 0 0 0.06em rgba(255,255,255,0.08)",
            }}
          >
            <div className="h-[28.5em] w-full overflow-hidden rounded-[0.5em] bg-white">
              <PdfScreen animate={inView} />
            </div>
          </div>
        </Tilt>
        {/* The stand, which is what makes it read as a screen and not a card */}
        <div className="mx-auto h-[0.9em] w-[7em] rounded-b-[0.35em] bg-[#0d1512] opacity-90" />
        <div className="mx-auto h-[0.35em] w-[12em] rounded-full bg-[#0d1512] opacity-70" />
      </div>
    </div>
  );
}
