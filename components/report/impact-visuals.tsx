import { Clock } from "lucide-react";
import type {
  BrainBattery,
  PartnerImpact,
  SocialRadius,
  TopGoal,
  WordUnderstanding,
} from "@/lib/calculators/impact";

/**
 * Report impact visuals — shared by the on-screen results dashboard and the
 * printable report. Each visual is a plain (server-safe) presentational
 * component driven directly by calculator output. Entrance animation is
 * screen-only and opt-out (see .oviz-anim-* in globals.css, gated behind
 * `@media screen and (prefers-reduced-motion: no-preference)`); the static
 * state IS the final state, so print and reduced-motion render correctly.
 *
 * Palette is brand-derived and semantic, consistent across every visual:
 *   navy  = today / now              teal  = the path "with help"
 *   amber = without help (5-year decline)  — always paired with text/position.
 */
const VIZ = {
  navy: "#002147",
  teal: "#008B8B",
  tealInk: "#00696A",
  amber: "#B45309",
  steel: "#B8C6D6", // light "today" battery fill so the navy % stays legible
  track: "#E1E8EA",
  muted: "#44525E",
} as const;

const EFFORT_HATCH =
  "repeating-linear-gradient(45deg,#F0C8C2 0,#F0C8C2 7px,#F8DED9 7px,#F8DED9 14px)";

function clampPct(v: number): number {
  return Math.min(Math.max(v, 0), 100);
}

// --- Brain Battery ---------------------------------------------------------
// Reframed as "energy left" (100 − listening effort). A large horizontal
// battery for today plus the two five-year scenarios. Real battery shape: a
// body that clips the fill, with the terminal cap rendered OUTSIDE the body.
export function BrainBatteryViz({ battery }: { battery: BrainBattery }) {
  const energyToday = Math.round(100 - clampPct(battery.brainLoad));
  const energyUnt = Math.round(
    100 - clampPct(battery.brainLoad + battery.untreatedDrain),
  );
  const energyTre = Math.round(
    100 - clampPct(battery.brainLoad + battery.treatedDrain),
  );

  return (
    <div
      className="oviz-print-color flex flex-col gap-5"
      role="img"
      aria-label={`Energy left for everything besides listening: about ${energyToday} percent today, ${energyUnt} percent in five years without help, and ${energyTre} percent with help.`}
    >
      {/* Hero: today */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-base font-semibold text-brand-navy">Today</span>
          <span className="text-sm text-brand-muted">
            energy left for memory, focus &amp; enjoyment
          </span>
        </div>
        <div className="flex items-center">
          <div
            className="oviz-print-color relative h-20 flex-1 overflow-hidden rounded-2xl border-[5px] bg-white"
            style={{ borderColor: VIZ.navy }}
          >
            <div
              className="oviz-print-color absolute inset-0"
              style={{ backgroundImage: EFFORT_HATCH }}
              aria-hidden="true"
            />
            <div
              className="oviz-anim-grow-w oviz-print-color absolute inset-y-0 left-0"
              style={{ width: `${energyToday}%`, background: VIZ.steel }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-heading text-3xl font-semibold"
                style={{ color: VIZ.navy }}
              >
                {energyToday}%
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                energy left
              </span>
            </div>
          </div>
          {/* external terminal cap */}
          <span
            className="oviz-print-color ml-1 h-9 w-2.5 rounded-r-md"
            style={{ background: VIZ.navy }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Five-year scenarios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "In 5 years, without help", pct: energyUnt, color: VIZ.amber },
          { label: "In 5 years, with help", pct: energyTre, color: VIZ.teal },
        ].map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-brand-navy">
                {s.label}
              </span>
              <span
                className="font-heading text-lg font-semibold"
                style={{ color: s.color }}
              >
                {s.pct}%
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="oviz-print-color relative h-9 flex-1 overflow-hidden rounded-lg border-[3px] bg-white"
                style={{ borderColor: s.color }}
              >
                <div
                  className="oviz-print-color absolute inset-0"
                  style={{ backgroundImage: EFFORT_HATCH }}
                  aria-hidden="true"
                />
                <div
                  className="oviz-anim-grow-w oviz-print-color absolute inset-y-0 left-0"
                  style={{ width: `${s.pct}%`, background: s.color }}
                  aria-hidden="true"
                />
              </div>
              <span
                className="oviz-print-color ml-1 h-4 w-1.5 rounded-r"
                style={{ background: s.color }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-brand-muted">
        The solid bar is energy left for the rest of life; the striped part is
        the effort spent just to hear.
      </p>
    </div>
  );
}

// --- Word Understanding ----------------------------------------------------
// Single "today" point with two five-year paths: with help (teal) stays
// higher, without help (amber) declines.
export function WordUnderstandingViz({ wu }: { wu: WordUnderstanding }) {
  const y = (v: number) => 28 + (100 - clampPct(v)) * 1.62;
  const cur = y(wu.current);
  const tre = y(wu.treated5Year);
  const unt = y(wu.untreated5Year);
  return (
    <svg
      width="100%"
      viewBox="0 0 600 240"
      role="img"
      aria-label={`Word understanding: ${Math.round(wu.current)} percent today, ${Math.round(wu.treated5Year)} percent with help and ${Math.round(wu.untreated5Year)} percent without help in five years.`}
    >
      <title>Word understanding over five years</title>
      <desc>
        Two paths from today: with help stays higher, without help declines.
      </desc>
      <line x1="64" y1="20" x2="64" y2="194" stroke={VIZ.track} strokeWidth="1" />
      <line x1="64" y1="194" x2="582" y2="194" stroke={VIZ.track} strokeWidth="1" />
      <text x="56" y={y(100) + 4} textAnchor="end" fontSize="12" fill={VIZ.muted}>100%</text>
      <text x="56" y={y(60) + 4} textAnchor="end" fontSize="12" fill={VIZ.muted}>60%</text>
      <text x="64" y="214" textAnchor="middle" fontSize="13" fill={VIZ.muted}>Today</text>
      <text x="560" y="214" textAnchor="end" fontSize="13" fill={VIZ.muted}>In 5 years</text>
      <polyline
        className="oviz-anim-draw oviz-print-color"
        points={`64,${cur} 560,${tre}`}
        fill="none"
        stroke={VIZ.teal}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <polyline
        className="oviz-anim-draw oviz-print-color"
        points={`64,${cur} 560,${unt}`}
        fill="none"
        stroke={VIZ.amber}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="64" cy={cur} r="6" fill={VIZ.navy} className="oviz-print-color" />
      <circle cx="560" cy={tre} r="6" fill={VIZ.teal} className="oviz-print-color" />
      <circle cx="560" cy={unt} r="6" fill={VIZ.amber} className="oviz-print-color" />
      <text x="64" y={cur - 12} textAnchor="middle" fontSize="16" fontWeight="600" fill={VIZ.navy}>
        {Math.round(wu.current)}%
      </text>
      <text x="556" y={tre - 10} textAnchor="end" fontSize="15" fontWeight="600" fill={VIZ.tealInk}>
        {Math.round(wu.treated5Year)}% with help
      </text>
      <text x="556" y={unt + 22} textAnchor="end" fontSize="15" fontWeight="600" fill={VIZ.amber}>
        {Math.round(wu.untreated5Year)}% without help
      </text>
    </svg>
  );
}

// --- Social Radius ---------------------------------------------------------
// Today's reach (navy, solid) nested in the wider reach with help (teal,
// dashed), with a colour key.
export function SocialRadiusViz({ radius }: { radius: SocialRadius }) {
  const cx = 150;
  const cy = 140;
  const r = (v: number) => 16 + Math.min(Math.max(v, 0), 10) * 11;
  const curR = r(radius.currentRadius);
  const treR = r(radius.treatedRadius);
  return (
    <svg
      width="100%"
      viewBox="0 0 600 280"
      role="img"
      aria-label={`Social radius: comfortable hearing reaches about ${radius.currentRadius.toFixed(1)} of 10 today, and about ${radius.treatedRadius.toFixed(1)} of 10 with help.`}
    >
      <title>Social radius</title>
      <desc>Two circles: today&apos;s reach and the wider reach with help.</desc>
      <g>
        <circle
          className="oviz-anim-ring oviz-print-color"
          cx={cx}
          cy={cy}
          r={treR}
          fill={VIZ.teal}
          fillOpacity="0.12"
          stroke={VIZ.teal}
          strokeWidth="2.5"
          strokeDasharray="6 6"
          style={{ animationDelay: "0.45s", transformOrigin: `${cx}px ${cy}px` }}
        />
        <circle
          className="oviz-anim-ring oviz-print-color"
          cx={cx}
          cy={cy}
          r={curR}
          fill={VIZ.navy}
          fillOpacity="0.16"
          stroke={VIZ.navy}
          strokeWidth="3"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        <circle cx={cx} cy={cy} r="9" fill={VIZ.navy} className="oviz-print-color" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill="#ffffff" aria-hidden="true">you</text>
      </g>
      <g fontSize="15">
        <rect className="oviz-print-color" x="330" y="92" width="16" height="16" rx="3" fill={VIZ.navy} fillOpacity="0.16" stroke={VIZ.navy} strokeWidth="2" />
        <text x="356" y="105" fill={VIZ.navy} fontWeight="600">Today</text>
        <text x="356" y="125" fill={VIZ.muted} fontSize="14">reaches {radius.currentRadius.toFixed(1)} of 10</text>
        <rect className="oviz-print-color" x="330" y="150" width="16" height="16" rx="3" fill={VIZ.teal} fillOpacity="0.18" stroke={VIZ.teal} strokeWidth="2" strokeDasharray="4 3" />
        <text x="356" y="163" fill={VIZ.tealInk} fontWeight="600">With help</text>
        <text x="356" y="183" fill={VIZ.muted} fontSize="14">could reach {radius.treatedRadius.toFixed(1)} of 10</text>
      </g>
    </svg>
  );
}

// --- Partner Impact --------------------------------------------------------
export function PartnerImpactViz({ impact }: { impact: PartnerImpact }) {
  const repeats = Math.round(impact.repeatsPerDay);
  const pipCount = Math.min(repeats, 30);
  const pips = Array.from({ length: pipCount });
  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[150px_1fr]">
      <div
        className="oviz-print-color mx-auto flex h-[130px] w-[130px] flex-col items-center justify-center rounded-full border-4 text-center"
        style={{ borderColor: VIZ.navy }}
      >
        <Clock className="h-6 w-6" style={{ color: VIZ.navy }} aria-hidden="true" />
        <span
          className="mt-1 font-heading text-3xl font-semibold"
          style={{ color: VIZ.navy }}
          data-testid="partner-annual-hours"
        >
          {impact.annualPartnerHours.toFixed(1)}
        </span>
        <span className="text-sm text-brand-muted">hours / year</span>
      </div>
      <div>
        <p className="mb-1.5 text-sm text-brand-muted">A typical day</p>
        <div className="oviz-anim-fade flex flex-wrap gap-1.5" aria-hidden="true">
          {pips.map((_, i) => (
            <span
              key={i}
              className="oviz-print-color inline-block h-3 w-3 rounded-full"
              style={{ background: VIZ.navy }}
            />
          ))}
          {repeats > 30 ? (
            <span className="text-sm font-medium" style={{ color: VIZ.navy }}>
              +{repeats - 30}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-base text-brand-navy">
          <span className="font-semibold">~{repeats} repeats</span>
          <span className="text-brand-muted">
            {" "}
            a day, at {impact.secondsPerRepeat} seconds each
          </span>
        </p>
        <p className="mt-3 rounded-lg bg-brand-mist px-3 py-2 text-base leading-relaxed text-brand-muted">
          {impact.partnerImpactSummary}
        </p>
      </div>
    </div>
  );
}

// --- Real-Life Listening Map ----------------------------------------------
export function ListeningMapViz({ goals }: { goals: TopGoal[] }) {
  if (goals.length === 0) {
    return (
      <p className="text-lg text-brand-muted">
        No listening goals were captured for this consult.
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {goals.map((g, i) => {
        const pct = Math.min(Math.max(g.priorityScore * 10, 0), 100);
        const top = i === 0;
        return (
          <li
            key={`${g.name ?? "goal"}-${i}`}
            className="flex items-center gap-4 border-t border-brand-line py-3.5 first:border-t-0"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-lg font-semibold"
              style={{
                background: top ? VIZ.teal : VIZ.track,
                color: top ? "#ffffff" : VIZ.muted,
              }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 truncate text-base font-medium text-brand-navy">
                {g.name ?? "Listening goal"}
              </p>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-brand-line">
                <div
                  className="oviz-anim-grow-w oviz-print-color h-full rounded-full"
                  style={{ width: `${pct}%`, background: VIZ.teal }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right" style={{ minWidth: 76 }}>
              <span
                className="font-heading text-xl font-semibold"
                style={{ color: VIZ.tealInk }}
              >
                {g.priorityScore.toFixed(1)}
              </span>
              <span className="block text-xs text-brand-muted">priority</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
