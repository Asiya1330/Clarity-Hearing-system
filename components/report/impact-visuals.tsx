"use client";

import { User2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  BrainBattery,
  PartnerImpact,
  SocialRadius,
  WordUnderstanding,
} from "@/lib/calculators/impact";

/**
 * Premium-report impact visuals — patient-friendly visualisations driven by
 * calculator outputs. Each visual is built around a calm entrance and a
 * single, plain-language story:
 *
 *   Brain Battery → "this is the energy you have left to spend on the rest
 *                    of life"; tabs switch between today and the two
 *                    five-year scenarios.
 *   Word Understanding → "out of every 100 spoken words, how many do you
 *                         catch"; two divergent lines from today's point.
 *   Social Radius → "how far comfortable hearing reaches"; concentric zone
 *                    rings with a toggle to overlay the wider radius with
 *                    help.
 *   Partner Impact → "what your hearing costs your partner this year";
 *                    circular dial that counts up plus a staggered bubble row
 *                    standing in for a typical day of repeats.
 *
 * Entrance animation is gated by the parent <RevealOnScroll>; this file
 * doesn't read viewport state. Interactive scenario switches re-trigger the
 * inner transitions (fill width, count-up) but never the outer fade-in.
 *
 * Reduced-motion + print both render final state on first paint via the
 * global rules in app/globals.css.
 */

const VIZ = {
  navy: "#002147",
  navySoft: "#B8C6D6",
  teal: "#008B8B",
  tealInk: "#00696A",
  amber: "#B45309",
  tint: "#E6F0F0",
  line: "#E1E8EA",
  muted: "#44525E",
} as const;

const EFFORT_HATCH =
  "repeating-linear-gradient(45deg,#E7A89E 0,#E7A89E 7px,#F6D9D4 7px,#F6D9D4 14px)";

function clampPct(v: number): number {
  return Math.min(Math.max(v, 0), 100);
}

// --- Brain Battery ---------------------------------------------------------
// A single hero battery with three scenario tabs (today / 5y no help / 5y with
// help). Default is "today". On scenario change, the energy fill width
// transitions and the centre number counts toward the new value. On print,
// the active tab is captured as-is; users can print "with help" if they
// prefer that scenario.

type Scenario = "today" | "unaided" | "aided";

const SCENARIO_LABEL: Record<Scenario, string> = {
  today: "Today",
  unaided: "In 5 years, no help",
  aided: "In 5 years, with help",
};

const SCENARIO_BG: Record<Scenario, string> = {
  today: VIZ.navySoft,
  unaided: VIZ.amber,
  aided: VIZ.teal,
};

const SCENARIO_BORDER: Record<Scenario, string> = {
  today: VIZ.navy,
  unaided: VIZ.amber,
  aided: VIZ.teal,
};

export function BrainBatteryViz({ battery }: { battery: BrainBattery }) {
  const scenarios = useMemo(
    () => ({
      today: Math.round(100 - clampPct(battery.brainLoad)),
      unaided: Math.round(
        100 - clampPct(battery.brainLoad + battery.untreatedDrain),
      ),
      aided: Math.round(
        100 - clampPct(battery.brainLoad + battery.treatedDrain),
      ),
    }),
    [battery.brainLoad, battery.untreatedDrain, battery.treatedDrain],
  );

  const [scenario, setScenario] = useState<Scenario>("today");
  const energy = scenarios[scenario];
  const display = useCountUp(energy, 900);

  return (
    <div
      className="flex flex-col gap-6"
      role="group"
      aria-label={`Brain battery scenarios. Today ${scenarios.today} percent energy left, in five years without help ${scenarios.unaided}, with help ${scenarios.aided}.`}
    >
      <div className="flex flex-wrap items-center gap-7">
        <div className="flex shrink-0 items-center">
          <div
            className="oviz-print-color relative h-44 w-80 overflow-hidden rounded-3xl border-[7px] bg-brand-white"
            style={{ borderColor: SCENARIO_BORDER[scenario] }}
          >
            <div
              className="oviz-print-color absolute inset-0"
              style={{ backgroundImage: EFFORT_HATCH }}
              aria-hidden="true"
            />
            <div
              className="oviz-print-color absolute inset-y-0 left-0 transition-[width,background-color] duration-700 ease-out"
              style={{
                width: `${energy}%`,
                background: SCENARIO_BG[scenario],
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-heading text-5xl font-semibold leading-none text-brand-navy"
                data-testid="brain-battery-pct"
              >
                {display}%
              </span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
                energy left
              </span>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="oviz-print-color ml-1 h-16 w-3 rounded-r-md transition-colors duration-500"
            style={{ background: SCENARIO_BORDER[scenario] }}
          />
        </div>

        <ul className="flex flex-col gap-3 text-base text-brand-navy">
          <li className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="oviz-print-color mt-1 h-5 w-5 shrink-0 rounded-md"
              style={{
                background: `linear-gradient(90deg, ${VIZ.navy}, ${VIZ.teal})`,
              }}
            />
            <span>
              <span className="font-semibold">Energy left</span> for memory,
              focus and enjoyment — the bar&apos;s colour shows the scenario.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="oviz-print-color mt-1 h-5 w-5 shrink-0 rounded-md"
              style={{ backgroundImage: EFFORT_HATCH }}
            />
            <span>
              <span className="font-semibold">Effort spent</span> just to hear
              and understand.
            </span>
          </li>
        </ul>
      </div>

      <div
        className="flex flex-wrap gap-2 print:hidden"
        role="group"
        aria-label="Choose a scenario"
      >
        {(Object.keys(SCENARIO_LABEL) as Scenario[]).map((s) => (
          <ScenarioTab
            key={s}
            scenario={s}
            label={SCENARIO_LABEL[s]}
            active={scenario === s}
            onClick={() => setScenario(s)}
          />
        ))}
      </div>

      {/* Print-only: always show all three so the saved PDF has the full picture. */}
      <ul className="hidden gap-4 text-base text-brand-navy print:grid print:grid-cols-3">
        {(Object.keys(SCENARIO_LABEL) as Scenario[]).map((s) => (
          <li
            key={s}
            className="rounded-xl border p-3 print:break-inside-avoid"
            style={{ borderColor: SCENARIO_BORDER[s] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
              {SCENARIO_LABEL[s]}
            </p>
            <p
              className="font-heading text-2xl font-semibold"
              style={{ color: SCENARIO_BORDER[s] }}
            >
              {scenarios[s]}%
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScenarioTab({
  scenario,
  label,
  active,
  onClick,
}: {
  scenario: Scenario;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-semibold transition-colors",
        active
          ? "border-current"
          : "border-brand-line bg-brand-white text-brand-navy hover:border-brand-line-strong",
      ].join(" ")}
      style={
        active
          ? {
              borderColor: SCENARIO_BORDER[scenario],
              background:
                scenario === "today"
                  ? "#EAF0F5"
                  : scenario === "unaided"
                    ? "#FBF1E7"
                    : VIZ.tint,
              color: SCENARIO_BORDER[scenario],
            }
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: SCENARIO_BORDER[scenario] }}
      />
      {label}
    </button>
  );
}

// --- Word Understanding ----------------------------------------------------
// Two divergent paths from today's point. Y-axis is percent, gridlines at
// every quarter. The path draw uses the existing .oviz-anim-draw rule, so the
// reveal-on-scroll wrapper provides the timing.

export function WordUnderstandingViz({ wu }: { wu: WordUnderstanding }) {
  const y = (pct: number) => 290 - clampPct(pct) * 2.45;
  const cur = y(wu.current);
  const tre = y(wu.treated5Year);
  const unt = y(wu.untreated5Year);

  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox="0 0 660 340"
        role="img"
        aria-label={`Word understanding: ${Math.round(wu.current)} percent today; in five years, ${Math.round(wu.treated5Year)} percent with help and ${Math.round(wu.untreated5Year)} percent without help.`}
        className="w-full max-w-[660px]"
      >
        <title>Word understanding over five years</title>
        <desc>
          A line chart with two paths from today: the teal path stays higher
          with help, the amber path declines without help.
        </desc>

        {/* Gridlines at 25% / 50% / 75% / 100% */}
        <g stroke={VIZ.line} strokeWidth="1.5">
          <line x1="92" y1={y(100)} x2="610" y2={y(100)} />
          <line x1="92" y1={y(75)} x2="610" y2={y(75)} />
          <line x1="92" y1={y(50)} x2="610" y2={y(50)} />
          <line x1="92" y1={y(25)} x2="610" y2={y(25)} />
          <line x1="92" y1={y(0)} x2="610" y2={y(0)} />
        </g>

        {/* Y-axis tick labels (percent) */}
        <g
          fill={VIZ.muted}
          fontSize="15"
          fontFamily="Inter, sans-serif"
          textAnchor="end"
        >
          <text x="80" y={y(100) + 5}>
            100%
          </text>
          <text x="80" y={y(50) + 5}>
            50%
          </text>
          <text x="80" y={y(0) + 5}>
            0%
          </text>
        </g>

        <text
          x="32"
          y="165"
          fill={VIZ.muted}
          fontSize="14"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
          transform="rotate(-90 32 165)"
        >
          Words understood (%)
        </text>

        {/* X-axis labels */}
        <g
          fill={VIZ.navy}
          fontSize="16"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
        >
          <text x="92" y="320">
            Today
          </text>
          <text x="430" y="320">
            In 5 years
          </text>
        </g>

        {/* The two lines, drawn from Today outward. */}
        <polyline
          className="oviz-anim-draw oviz-print-color"
          points={`92,${cur} 430,${unt}`}
          fill="none"
          stroke={VIZ.amber}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <polyline
          className="oviz-anim-draw oviz-print-color"
          points={`92,${cur} 430,${tre}`}
          fill="none"
          stroke={VIZ.teal}
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Today and endpoint dots */}
        <circle cx="92" cy={cur} r="8" fill={VIZ.navy} />
        <circle cx="430" cy={tre} r="8" fill={VIZ.teal} />
        <circle cx="430" cy={unt} r="8" fill={VIZ.amber} />

        {/* Value labels */}
        <text
          x="92"
          y={cur - 14}
          fill={VIZ.navy}
          fontSize="16"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
        >
          {Math.round(wu.current)}% today
        </text>
        <text
          x="446"
          y={tre + 5}
          fill={VIZ.tealInk}
          fontSize="18"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {Math.round(wu.treated5Year)}% with help
        </text>
        <text
          x="446"
          y={unt + 24}
          fill={VIZ.amber}
          fontSize="18"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {Math.round(wu.untreated5Year)}% without help
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-brand-navy">
        <span className="inline-flex items-center gap-2">
          <span className="oviz-print-color h-1.5 w-6 rounded-full bg-brand-navy" />
          Today
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="oviz-print-color h-1.5 w-6 rounded-full bg-[#B45309]" />
          In 5 years, without help
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="oviz-print-color h-1.5 w-6 rounded-full bg-brand-teal" />
          In 5 years, with help
        </span>
      </div>
    </div>
  );
}

// --- Social Radius ---------------------------------------------------------
// Concentric zone rings with a person at the centre; the "today" radius fills
// first, an optional toggle overlays the wider "with help" radius. Print and
// reduced-motion always render both.

export function SocialRadiusViz({ radius }: { radius: SocialRadius }) {
  const [showAided, setShowAided] = useState(false);
  const maxPx = 280;
  const todayPx = (clampPct(radius.currentRadius * 10) / 100) * maxPx;
  const aidedPx = (clampPct(radius.treatedRadius * 10) / 100) * maxPx;

  return (
    <div className="flex flex-wrap items-center gap-8">
      <div
        className="relative h-[300px] w-[340px] shrink-0"
        role="img"
        aria-label={`Social radius: about ${radius.currentRadius.toFixed(1)} of 10 today, and about ${radius.treatedRadius.toFixed(1)} of 10 with help.`}
      >
        <ZoneRing diameter={300} label="Across the room" labelTop="6%" />
        <ZoneRing diameter={210} label="Family table" labelTop="24%" />
        <ZoneRing diameter={120} label="One-on-one" labelTop="40%" />

        {/* Aided overlay (rendered first so the today fill stays on top) */}
        <div
          aria-hidden="true"
          className="oviz-print-color absolute left-1/2 top-1/2 rounded-full border-4 border-dashed transition-transform duration-700 ease-out print:!scale-100"
          style={{
            width: aidedPx,
            height: aidedPx,
            borderColor: VIZ.tealInk,
            background: "rgba(0,139,139,0.16)",
            transform: `translate(-50%, -50%) scale(${showAided ? 1 : 0})`,
          }}
        />

        <div
          aria-hidden="true"
          className="oviz-anim-ring oviz-print-color absolute left-1/2 top-1/2 rounded-full border-[3.5px]"
          style={{
            width: todayPx,
            height: todayPx,
            transform: "translate(-50%, -50%)",
            transformOrigin: "center",
            borderColor: VIZ.navy,
            background: "rgba(0,33,71,0.18)",
          }}
        />

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-navy"
        >
          <User2 className="h-8 w-8" />
        </span>
      </div>

      <div className="flex max-w-md flex-col gap-3">
        <p className="flex items-center gap-3 text-lg">
          <span
            aria-hidden="true"
            className="oviz-print-color inline-block h-4 w-4 rounded-sm"
            style={{ background: VIZ.navy }}
          />
          <span>Today:</span>
          <span className="font-heading text-2xl font-semibold text-brand-navy">
            {radius.currentRadius.toFixed(1)}
          </span>
          <span className="text-base text-brand-muted">/ 10 reach</span>
        </p>
        <p className="flex items-center gap-3 text-lg">
          <span
            aria-hidden="true"
            className="oviz-print-color inline-block h-4 w-4 rounded-sm"
            style={{ background: VIZ.tealInk }}
          />
          <span>With help:</span>
          <span className="font-heading text-2xl font-semibold text-brand-teal-700">
            {radius.treatedRadius.toFixed(1)}
          </span>
          <span className="text-base text-brand-muted">/ 10 reach</span>
        </p>

        <button
          type="button"
          onClick={() => setShowAided((s) => !s)}
          aria-pressed={showAided}
          className="mt-1 inline-flex h-12 w-fit items-center justify-center rounded-xl border-2 border-brand-teal bg-brand-tint/40 px-4 text-base font-semibold text-brand-teal-700 transition-colors hover:bg-brand-tint print:hidden"
        >
          {showAided ? "Hide the circle with help" : "Show the circle with help"}
        </button>

        {/* Print fallback: caption rather than button. */}
        <p className="hidden text-base text-brand-muted print:block">
          Dashed teal circle: the wider reach modelled with help.
        </p>

        <p className="text-base text-brand-muted">
          Social strain today:{" "}
          <span className="font-semibold text-brand-navy">
            {Math.round(radius.socialStrain)} / 100
          </span>
        </p>
      </div>
    </div>
  );
}

function ZoneRing({
  diameter,
  label,
  labelTop,
}: {
  diameter: number;
  label: string;
  labelTop: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand-line"
        style={{ width: diameter, height: diameter }}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-white px-2 py-px text-xs text-brand-muted"
        style={{ top: labelTop }}
      >
        {label}
      </span>
    </>
  );
}

// --- Partner Impact --------------------------------------------------------
// Annual partner hours as a circular dial that counts up, plus a row of
// pop-in bubbles standing in for a typical day of repeats. The dial fills
// from 0 to min(hours, MAX_HOURS); above the max the ring is full and the
// label still reflects the exact value.

const MAX_HOURS_FOR_RING = 50;

export function PartnerImpactViz({ impact }: { impact: PartnerImpact }) {
  const repeats = Math.round(impact.repeatsPerDay);
  const pipCount = Math.min(repeats, 12);
  const ringFrac = Math.min(impact.annualPartnerHours / MAX_HOURS_FOR_RING, 1);
  const circumference = 2 * Math.PI * 85;
  const offset = circumference * (1 - ringFrac);
  const hoursDisplay = useCountUp(impact.annualPartnerHours, 1300, 1);

  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          aria-hidden="true"
          className="-rotate-90"
        >
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke={VIZ.line}
            strokeWidth="18"
          />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke={VIZ.teal}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition:
                "stroke-dashoffset 1.3s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="oviz-print-color"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-heading text-4xl font-semibold leading-none text-brand-navy"
            data-testid="partner-annual-hours"
          >
            {hoursDisplay}
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
            hours / year
          </span>
        </div>
      </div>

      <div className="flex max-w-md flex-col gap-3">
        <p className="text-lg leading-relaxed text-brand-navy">
          About <span className="font-semibold">{repeats} repeats</span> a day,
          at {impact.secondsPerRepeat} seconds each.
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          aria-hidden="true"
          data-testid="partner-bubbles"
        >
          {Array.from({ length: pipCount }).map((_, i) => (
            <span
              key={i}
              className="oviz-bubble oviz-print-color inline-block h-6 w-8 rounded-tl-md rounded-tr-md rounded-bl-sm rounded-br-md border border-brand-teal bg-brand-tint"
              style={{ transitionDelay: `${i * 60}ms` }}
            />
          ))}
          {repeats > pipCount ? (
            <span className="self-center text-sm font-semibold text-brand-teal-700">
              +{repeats - pipCount} more
            </span>
          ) : null}
        </div>
        <p className="rounded-lg bg-brand-mist px-3 py-2 text-base leading-relaxed text-brand-muted">
          {impact.partnerImpactSummary}
        </p>
      </div>
    </div>
  );
}

// --- shared count-up hook --------------------------------------------------
// Eased ease-out-cubic count-up to a target value. Reduced-motion + print
// short-circuit to the final value.

function useCountUp(target: number, durationMs = 1000, decimals = 0): string {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const fromRef = useRef(0);
  const targetRef = useRef(target);
  // Keep targetRef in sync; the running animation reads the latest target so
  // a mid-flight tab switch retargets without restarting from zero.
  targetRef.current = target;

  useEffect(() => {
    const motionReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (motionReduced) {
      setValue(target);
      return;
    }

    fromRef.current = value;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next =
        fromRef.current + (targetRef.current - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // value intentionally omitted: only target/duration changes restart the tween
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value.toFixed(decimals);
}
