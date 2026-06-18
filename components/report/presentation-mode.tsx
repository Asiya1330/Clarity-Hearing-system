"use client";

import {
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPinned,
  Maximize2,
  MessagesSquare,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ListeningLiftMap } from "@/components/consult/listening-lift-map";
import { AtAGlance } from "@/components/report/at-a-glance";
import {
  BrainBatteryViz,
  PartnerImpactViz,
  SocialRadiusViz,
  WordUnderstandingViz,
} from "@/components/report/impact-visuals";
import type { ImpactOutputs } from "@/lib/calculators/impact";
import { calculateListeningLift } from "@/lib/calculators/listening-lift";

/**
 * Presentation Mode — a full-screen, one-visual-per-slide overlay for the
 * clinician to walk a patient through their results on a tablet, free of nav,
 * sidebar and card chrome.
 *
 * It REUSES the exact report visuals (BrainBatteryViz, WordUnderstandingViz,
 * SocialRadiusViz, PartnerImpactViz, ListeningLiftMap, AtAGlance) with the same
 * props the report passes — no duplicated calculator math, no forked rendering.
 * calculateListeningLift is called exactly as the report page calls it, so the
 * Listening Map takeaway's best situation / relief match the card.
 *
 * TODAY-FIRST: visuals are rendered WITHOUT a <Reveal> wrapper, so they paint
 * their final today-state immediately (per app/globals.css, the hidden start
 * states only apply inside .oviz-reveal-scope). Brain Battery and Word
 * Understanding already default to today; Social Radius and the Listening Map
 * are opened today-first via their new initialAided={false} prop. No scenario
 * is auto-pressed — the clinician reveals "with hearing aids" live using each
 * visual's own (screen-only) controls.
 *
 * A presentation-only FitToBox wrapper scales each visual up to fill the slide
 * region (preserving aspect ratio, letterboxing where it differs) WITHOUT
 * editing the components' internal sizing. The educational disclaimer renders
 * on every slide and is never dismissible.
 */

// Layout canvas the visuals lay out against before FitToBox scales them. Sized
// wide so the SVG charts/fans dominate: the visuals' fixed-height controls then
// occupy a smaller share of the natural height, letting the graphic claim more
// of the height budget when FitToBox fits to the slide. SVG is vector so it
// stays crisp at any scale.
const BASE_W = 900;
// Generous cap so visuals scale UP to fill a tablet/desktop display for impact
// (everything here is vector / CSS, so large scales stay sharp). FitToBox still
// only ever scales to fit, so this cap rarely binds on landscape screens.
const MAX_SCALE = 3;

// Best-effort native fullscreen so the overlay fills the whole tablet display.
// Must be called inside the user gesture (the launch click). Never throws.
function requestAppFullscreen() {
  if (typeof document === "undefined") return;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (typeof req === "function") {
      const result = req.call(el);
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(() => {});
      }
    }
  } catch {
    /* fullscreen is optional — ignore */
  }
}

function exitAppFullscreen() {
  if (typeof document === "undefined") return;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      if (typeof exit === "function") {
        const result = exit.call(doc);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => {});
        }
      }
    }
  } catch {
    /* exit is optional — ignore */
  }
}

/**
 * Scales its child to fill the available area, preserving aspect ratio.
 * Measures the child's untransformed layout size (offsetWidth/Height are
 * unaffected by CSS transforms, so there's no measure/scale feedback loop) and
 * applies transform: scale(). Releases the reused SVGs' max-width cap so the
 * responsive charts grow to the canvas width — without editing them.
 */
function FitToBox({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const nw = content.offsetWidth;
      const nh = content.offsetHeight;
      if (!cw || !ch || !nw || !nh) return;
      const fit = Math.min(cw / nw, ch / nh) * 0.98; // small safety margin
      setScale(Math.max(0.2, Math.min(fit, MAX_SCALE)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
    >
      <div
        ref={contentRef}
        className="[&_svg]:max-w-none"
        style={{
          width: BASE_W,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface Slide {
  icon: LucideIcon;
  kicker: string;
  title: string;
  takeaway?: React.ReactNode;
  visual: React.ReactNode;
}

export function PresentationMode({
  outputs,
  clinicName,
}: {
  outputs: ImpactOutputs;
  clinicName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const launchRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Display values — identical reads/rounding to the report page. No new math
  // and no new claims; calculateListeningLift is the same function the map uses.
  const effortPct = Math.round(outputs.brainBattery.brainLoad);
  const wrsPct = Math.round(outputs.wordUnderstanding.current);
  const repeats = Math.round(outputs.partnerImpact.repeatsPerDay);
  const lift = calculateListeningLift(
    outputs.listeningMap.topGoals,
    outputs.wordUnderstanding.current,
  );
  const bestResponder = lift.bestResponder;
  const bestRelief = lift.goals.find((g) => g.name === bestResponder)?.relief;

  const slides: Slide[] = [
    {
      icon: Sparkles,
      kicker: "Summary",
      title: "At a glance",
      visual: <AtAGlance outputs={outputs} />,
    },
    {
      icon: BatteryCharging,
      kicker: "How hard your brain is working",
      title: "Brain Battery",
      takeaway: (
        <>
          Think of listening like a battery. Right now the brain spends about{" "}
          <b className="font-semibold">{effortPct}% of its energy</b> just to
          follow sound — leaving less for remembering, focusing and enjoying the
          moment.
        </>
      ),
      visual: <BrainBatteryViz battery={outputs.brainBattery} />,
    },
    {
      icon: MessagesSquare,
      kicker: "How many words you catch",
      title: "Word Understanding Scenario",
      takeaway: (
        <>
          You catch about{" "}
          <b className="font-semibold">{wrsPct}% of clearly spoken words</b>{" "}
          today. {outputs.wordUnderstanding.label}; without support that tends
          to slip a little each year.
        </>
      ),
      visual: <WordUnderstandingViz wu={outputs.wordUnderstanding} />,
    },
    {
      icon: Users,
      kicker: "How far comfortable hearing reaches",
      title: "Social Radius",
      takeaway: (
        <>
          Comfortable conversation reaches about{" "}
          <b className="font-semibold">
            {outputs.socialRadius.currentRadius.toFixed(1)} of 10
          </b>{" "}
          today. With support, that circle can grow to take in more of the
          room.
        </>
      ),
      // Opened today-first; clinician reveals "with hearing aids" via the toggle.
      visual: (
        <SocialRadiusViz radius={outputs.socialRadius} initialAided={false} />
      ),
    },
    {
      icon: Clock,
      kicker: "This affects both of you",
      title: "Partner Impact Mirror",
      takeaway: (
        <>
          A partner repeats themselves about{" "}
          <b className="font-semibold">{repeats} times a day</b>. Over a year,
          that adds up to{" "}
          <b className="font-semibold">
            {outputs.partnerImpact.annualPartnerHours.toFixed(1)} hours
          </b>{" "}
          of shared time spent on what hearing made hard to catch.
        </>
      ),
      visual: <PartnerImpactViz impact={outputs.partnerImpact} />,
    },
    {
      icon: MapPinned,
      kicker: "What matters most to you",
      title: "Real-Life Listening Map",
      takeaway: (
        <>
          These are the moments{" "}
          <b className="font-semibold">you told us matter</b>.{" "}
          {bestResponder && bestRelief !== undefined
            ? `Amplification is modeled to ease the most difficulty in ${bestResponder} — up to ${bestRelief.toFixed(1)} points — though some difficulty remains in every situation.`
            : "Each track shows where amplification could help and what would still remain."}
        </>
      ),
      // Opened today-first ("No hearing aids"); clinician reveals aids live.
      visual: (
        <ListeningLiftMap
          topGoals={outputs.listeningMap.topGoals}
          wrs={outputs.wordUnderstanding.current}
          initialAided={false}
        />
      ),
    },
  ];

  const total = slides.length;
  const isLast = index === total - 1;
  const active = slides[index];
  const ActiveIcon = active.icon;

  const goTo = (i: number) => setIndex(Math.min(Math.max(i, 0), total - 1));
  const launch = () => {
    setIndex(0);
    setOpen(true);
    requestAppFullscreen(); // inside the click gesture
  };
  const close = () => {
    setOpen(false);
    exitAppFullscreen();
  };
  const handleNext = () => (isLast ? close() : goTo(index + 1));

  // Lock body scroll + move focus into the dialog. Cleanup restores both.
  // launchRef points at a persistently-mounted button, so capturing it here is
  // stable and lets the cleanup restore focus without a stale-ref warning.
  useEffect(() => {
    if (!open) return;
    const launchButton = launchRef.current;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      body.style.overflow = prevOverflow;
      launchButton?.focus();
    };
  }, [open]);

  // Lightweight focus trap so Tab cycles within the modal.
  const handleTab = (e: React.KeyboardEvent) => {
    const root = dialogRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
    if (focusables.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || activeEl === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
        e.preventDefault();
        goTo(index + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        goTo(index - 1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(total - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        handleTab(e);
        break;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 48) return; // ~48px swipe threshold
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <>
      <button
        ref={launchRef}
        type="button"
        onClick={launch}
        data-testid="presentation-mode-launch"
        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-brand-teal bg-brand-tint/40 px-4 text-base font-semibold text-brand-teal-700 transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 print:hidden"
      >
        <Maximize2 className="h-5 w-5" aria-hidden="true" />
        Presentation mode
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Presentation mode${clinicName ? ` — ${clinicName}` : ""}`}
              tabIndex={-1}
              data-testid="presentation-mode-overlay"
              onKeyDown={onKeyDown}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="fixed inset-0 z-[100] flex flex-col bg-brand-white text-brand-navy outline-none"
            >
              {/* Top bar: clinic · step counter · exit */}
              <div className="flex items-center justify-between gap-4 border-b border-brand-line px-6 py-2 sm:px-8">
                <span className="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.14em] text-brand-teal-700">
                  {clinicName ?? "OViz by OtoVantage"}
                </span>
                <p
                  data-testid="presentation-step-counter"
                  aria-live="polite"
                  className="shrink-0 text-base font-semibold text-brand-navy"
                >
                  Step {index + 1} of {total}
                </p>
                <button
                  type="button"
                  onClick={close}
                  data-testid="presentation-mode-exit"
                  className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl border-2 border-brand-line px-4 text-base font-semibold text-brand-navy transition-colors hover:border-brand-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                  Exit
                </button>
              </div>

              {/* Slide body — every slide is a split layout: a polished caption
                  sidebar in the left ~15% column, and the information graphic
                  maximized in the remaining ~85%. */}
              <div
                key={index}
                className="flex min-h-0 w-full flex-1 flex-row items-stretch gap-6 px-3 pb-2 pt-2 motion-safe:animate-fade-in"
              >
                <div className="flex w-[15%] min-w-[160px] shrink-0 flex-col justify-center gap-3 rounded-2xl bg-brand-mist/60 p-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-teal-700"
                  >
                    <ActiveIcon className="h-6 w-6" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal-700">
                    {active.kicker}
                  </p>
                  <h2 className="font-heading text-2xl font-bold leading-tight text-brand-navy">
                    {active.title}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-12 rounded-full bg-brand-teal"
                  />
                  {active.takeaway ? (
                    <p className="text-sm leading-relaxed text-brand-muted">
                      {active.takeaway}
                    </p>
                  ) : null}
                </div>

                <FitToBox>{active.visual}</FitToBox>
              </div>

              {/* Footer: always-on disclaimer + large nav */}
              <div className="border-t border-brand-line px-6 py-2 sm:px-8">
                <p
                  data-testid="presentation-disclaimer"
                  className="mx-auto mb-2 max-w-[80ch] text-center text-sm leading-relaxed text-brand-muted"
                >
                  Educational projection based on published evidence and
                  today&apos;s hearing results — not a diagnosis, guarantee, or
                  substitute for clinician judgment.
                </p>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                    data-testid="presentation-prev"
                    className="inline-flex min-h-[56px] items-center gap-2 rounded-xl border-2 border-brand-navy px-5 text-lg font-semibold text-brand-navy transition-colors hover:bg-brand-mist disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    Back
                  </button>

                  <div
                    className="flex items-center justify-center gap-1"
                    role="group"
                    aria-label="Go to slide"
                  >
                    {slides.map((s, i) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Go to step ${i + 1}: ${s.title}`}
                        aria-current={i === index ? "step" : undefined}
                        className="group flex h-11 w-7 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "block rounded-full transition-all",
                            i === index
                              ? "h-2.5 w-6 bg-brand-teal-700"
                              : "h-2.5 w-2.5 bg-brand-line-strong group-hover:bg-brand-teal-700",
                          ].join(" ")}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    data-testid="presentation-next"
                    className="inline-flex min-h-[56px] items-center gap-2 rounded-xl border-2 border-brand-teal-700 bg-brand-teal-700 px-6 text-lg font-semibold text-brand-white transition-colors hover:border-brand-navy hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                  >
                    {isLast ? "Done" : "Next"}
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
