import type { ImpactOutputs } from "@/lib/calculators/impact";

/**
 * "At a glance" hero — a single plain-language sentence the patient sees
 * before any chart. Composed entirely from calculator outputs, so it stays
 * truthful as inputs change and never overpromises (we never say "fix",
 * "cure", or restoration words).
 */
export function AtAGlance({ outputs }: { outputs: ImpactOutputs }) {
  const summary = buildSummary(outputs);
  return (
    <section className="rounded-2xl border border-brand-line bg-brand-mist/60 px-7 py-6 print:break-inside-avoid">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal-700">
        The one thing to know
      </p>
      <p className="mt-2 max-w-[62ch] text-xl leading-relaxed text-brand-navy">
        {summary}
      </p>
    </section>
  );
}

function buildSummary(outputs: ImpactOutputs): React.ReactNode {
  const effortHigh = outputs.brainBattery.brainLoad >= 45;
  const wrsLow = outputs.wordUnderstanding.current < 80;
  const goalNames = outputs.listeningMap.topGoals
    .map((g) => g.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0)
    .slice(0, 2);

  const effortClause = effortHigh
    ? "Hearing is taking real effort today"
    : "Hearing takes some effort today";

  const wrsClause = wrsLow
    ? ", and a meaningful share of words are slipping past"
    : "";

  const goalsClause =
    goalNames.length === 0
      ? ""
      : `, and it touches the moments that matter most — ${joinHumanly(goalNames)}`;

  return (
    <>
      <b className="font-semibold text-brand-navy">
        {effortClause}
        {wrsClause}
        {goalsClause}.
      </b>{" "}
      The good news:{" "}
      <span className="font-semibold text-brand-teal-700">
        help can move every one of these in the right direction.
      </span>
    </>
  );
}

function joinHumanly(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
