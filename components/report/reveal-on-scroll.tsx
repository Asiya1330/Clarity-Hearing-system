"use client";

import { useEffect, useRef } from "react";

/**
 * Reveal-on-scroll wrapper for premium-report visuals.
 *
 * - Default state hides the contents (CSS handles the from-state via
 *   .oviz-reveal-on-scroll:not(.in) inside a motion-safe media query, so
 *   reduced-motion and print render the final state on first paint).
 * - When the element scrolls within `threshold` of the viewport, an
 *   IntersectionObserver flips the `.in` class on and CSS transitions kick in.
 * - Print uses the @media print fallback in globals.css, but we also force the
 *   final state on a `beforeprint` event so JS-driven UIs (count-ups,
 *   interactive widgets) snap to their finished value before the snapshot.
 *
 * This is the only client boundary needed by the redesign — every visual stays
 * server-rendered inside, including the ones with interactive widgets (those
 * components are their own client components anyway).
 */
export function RevealOnScroll({
  children,
  threshold = 0.2,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  threshold?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const motionReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (motionReduced) {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold },
    );
    io.observe(el);

    const onBeforePrint = () => {
      el.classList.add("in");
    };
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, [threshold]);

  const Element = Tag as React.ElementType;
  return (
    <Element
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`oviz-reveal-on-scroll ${className}`.trim()}
    >
      {children}
    </Element>
  );
}
