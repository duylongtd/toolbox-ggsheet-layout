"use client";

import { PhoneScreen } from "./PhoneScreen";
import { useInView } from "./Reveal";

/**
 * The product on a phone, turned in space.
 *
 * The device is tilted with a perspective transform rather than held, and the
 * tilt settles as the section is reached: it arrives turned further away and
 * rotates towards the reader. Everything inside is sized in em from the one
 * font size here, so the frame and its contents cannot drift apart.
 */
export function PhoneMock() {
  const { ref, inView } = useInView<HTMLDivElement>(0.18);

  return (
    <div
      ref={ref}
      aria-hidden
      data-reveal=""
      className="relative"
      style={{ fontSize: "min(12.5px, 3.4vw)", perspective: "1600px" }}
    >
      <div
        className="relative mx-auto h-[53em] w-[26em] rounded-[3.4em] bg-[#0d1512] p-[0.32em]"
        style={{
          transform: inView
            ? "rotateY(-17deg) rotateX(5deg) rotateZ(-1.5deg)"
            : "rotateY(-34deg) rotateX(9deg) rotateZ(-3deg) translateY(3em)",
          opacity: inView ? 1 : 0,
          transformStyle: "preserve-3d",
          boxShadow:
            "0 4em 7em -2.5em rgba(6, 22, 16, 0.75), 0 0 0 0.08em rgba(255,255,255,0.08)",
          transition:
            "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease-out",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[3.15em] bg-white">
          <PhoneScreen animate={inView} />

          <span className="absolute left-1/2 top-[0.7em] h-[1.45em] w-[5em] -translate-x-1/2 rounded-full bg-[#0d1512]" />
          {/* A light across the glass, faint enough to leave the screen legible */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(114deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 15%, rgba(255,255,255,0) 32%)",
            }}
          />
        </div>

        <span className="absolute -left-[0.15em] top-[9.5em] h-[2.4em] w-[0.15em] rounded-l-[0.1em] bg-[#37403c]" />
        <span className="absolute -left-[0.15em] top-[12.7em] h-[2.4em] w-[0.15em] rounded-l-[0.1em] bg-[#37403c]" />
        <span className="absolute -right-[0.15em] top-[11em] h-[4em] w-[0.15em] rounded-r-[0.1em] bg-[#37403c]" />
      </div>
    </div>
  );
}
