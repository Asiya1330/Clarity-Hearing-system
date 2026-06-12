import type { ImpactOutputs } from "@/lib/calculators/impact";
import { Disclaimer } from "./disclaimer";

export function ResultsDashboard({ outputs }: { outputs: ImpactOutputs }) {
  const {
    brainBattery,
    wordUnderstanding,
    socialRadius,
    partnerImpact,
    listeningMap,
  } = outputs;

  return (
    <div className="flex flex-col gap-6">
      <Disclaimer />

      <Card
        title="Brain Battery"
        subtitle="How hard the brain is working to listen."
      >
        <BarRow label="Today" value={brainBattery.brainLoad} max={100} unit="%" />
        <BarRow
          label="5 years untreated"
          value={Math.min(
            brainBattery.brainLoad + brainBattery.untreatedDrain,
            100,
          )}
          max={100}
          unit="%"
        />
        <BarRow
          label="5 years with treatment"
          value={Math.min(
            brainBattery.brainLoad + brainBattery.treatedDrain,
            100,
          )}
          max={100}
          unit="%"
        />
      </Card>

      <Card
        title="Word Understanding Scenario"
        subtitle={`${wordUnderstanding.label}.`}
      >
        <BarRow label="Today" value={wordUnderstanding.current} max={100} unit="%" />
        <BarRow
          label="5 years untreated"
          value={wordUnderstanding.untreated5Year}
          max={100}
          unit="%"
        />
        <BarRow
          label="5 years with treatment"
          value={wordUnderstanding.treated5Year}
          max={100}
          unit="%"
        />
      </Card>

      <Card
        title="Social Radius"
        subtitle="How far hearing comfortably reaches in everyday situations."
      >
        <p className="text-base text-brand-muted">
          Social strain:{" "}
          <span className="font-semibold text-brand-navy">
            {Math.round(socialRadius.socialStrain)} / 100
          </span>
        </p>
        <BarRow
          label="Today"
          value={socialRadius.currentRadius}
          max={10}
          unit=" / 10"
        />
        <BarRow
          label="With treatment"
          value={socialRadius.treatedRadius}
          max={10}
          unit=" / 10"
        />
      </Card>

      <Card
        title="Partner Impact Mirror"
        subtitle="This hearing difficulty may be affecting both of you."
      >
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Repeats per day"
            value={Math.round(partnerImpact.repeatsPerDay).toString()}
            note={`${partnerImpact.secondsPerRepeat} seconds per repeat`}
          />
          <Stat
            label="Annual partner hours"
            value={partnerImpact.annualPartnerHours.toFixed(1)}
            note="Hours per year"
            testId="partner-annual-hours"
          />
        </div>
        <p className="text-base leading-relaxed text-brand-muted">
          {partnerImpact.partnerImpactSummary}
        </p>
      </Card>

      <Card
        title="Real-Life Listening Map"
        subtitle="Patient-reported listening priorities."
      >
        {listeningMap.topGoals.length === 0 ? (
          <p className="text-lg text-brand-muted">
            No listening goals were captured.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {listeningMap.topGoals.map((g, i) => (
              <li key={`${g.name ?? "goal"}-${i}`} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-brand-navy">
                    {i + 1}. {g.name ?? "Listening goal"}
                  </span>
                  <span className="text-base tabular-nums text-brand-muted">
                    priority {g.priorityScore.toFixed(1)} / 10
                  </span>
                </div>
                <Bar pct={g.priorityScore * 10} />
                <div className="flex gap-4 text-sm text-brand-muted">
                  <span>Difficulty: {g.difficulty} / 10</span>
                  <span>Importance: {g.importance} / 10</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
      <h3 className="font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h3>
      <p className="mb-5 mt-1 text-base text-brand-muted">{subtitle}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function BarRow({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
  const display = max === 10 ? value.toFixed(1) : Math.round(value).toString();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-base font-medium text-brand-navy">{label}</span>
        <span className="text-base tabular-nums text-brand-muted">
          {display}
          {unit}
        </span>
      </div>
      <Bar pct={(value / max) * 100} />
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const c = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="h-3.5 w-full overflow-hidden rounded-full bg-brand-line">
      <div
        className="h-full rounded-full bg-brand-teal"
        style={{ width: `${c}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  testId,
}: {
  label: string;
  value: string;
  note: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-xl border border-brand-line bg-brand-mist/50 p-4"
      data-testid={testId}
    >
      <p className="text-sm uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold text-brand-navy">
        {value}
      </p>
      <p className="mt-2 text-sm text-brand-muted">{note}</p>
    </div>
  );
}
