"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-triggered reveal wrapper for the premium-report impact visuals.
 *
 * WHY this exists:
 * The impact visuals are server-rendered, and the previous entrance animations
 * were autoplaying CSS @keyframes (`.oviz-anim-*`) that started on first paint.
 * On a long report page that meant a visual finished animating while it was
 * still below the fold, so by the time the reader scrolled to it the motion was
 * over and the chart looked static. This component instead holds each visual in
 * its pre-reveal state and only plays the entrance once the element actually
 * scrolls into the viewport (one-shot via IntersectionObserver).
 *
 * The final ("in-view") state is also the default state in CSS, so print,
 * reduced-motion, and no-JS environments all render the finished visual
 * immediately — the animation is purely additive for capable, motion-OK screens.
 */
export function Reveal({
  children,
  className,
  threshold = 0.25,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // No-JS never reaches here; reduced-motion and environments without an
    // IntersectionObserver skip straight to the final state.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn("oviz-reveal-scope", revealed && "in-view", className)}
      style={
        delayMs
          ? ({ "--oviz-reveal-delay": `${delayMs}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
