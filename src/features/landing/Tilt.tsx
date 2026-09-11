"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Turns its child slightly towards the pointer, and back when it leaves.
 *
 * A few degrees is enough: the point is that the object answers the hand, not
 * that it spins. Touch devices never fire the move event, so they simply get
 * the resting pose, which is also what a reader who asked for less motion
 * gets, because the transition is disabled for them in the stylesheet.
 */
export function Tilt({
  children,
  className = "",
  max = 7,
  rest = "",
}: {
  children: ReactNode;
  className?: string;
  /** Degrees of rotation at the edge of the element. */
  max?: number;
  /** Transform applied when the pointer is elsewhere, such as a base tilt. */
  rest?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>(rest);
  const [lit, setLit] = useState(false);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element || event.pointerType === "touch") return;
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    setTransform(`perspective(1200px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`);
    setLit(true);
  }

  function leave() {
    setTransform(rest);
    setLit(false);
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={className}
      style={{
        transform,
        transition: lit
          ? "transform 0.12s ease-out"
          : "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
