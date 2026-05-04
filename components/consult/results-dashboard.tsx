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

      <Card title="Brain Battery" subtitle="How hard the brain is working to listen.">
        <BarRow
          label="Today"
          value={brainBattery.brainLoad}
          max={100}
          unit="%"
        />
        <BarRow
          label="5 years untreated"
          value={Math.min(brainBattery.brainLoad + brainBattery.untreatedDrain, 100)}
          max={100}
          unit="%"
        />
        <BarRow
          label="5 years with treatment"
          value={Math.min(brainBattery.brainLoad + brainBattery.treatedDrain, 100)}
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
        <p className="text-sm text-brand-slate">
          Social strain:{" "}
          <span className="text-brand-navy">
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
        <p className="text-sm leading-relaxed text-brand-slate">
          {partnerImpact.partnerImpactSummary}
        </p>
      </Card>

      <Card
        title="Real-Life Listening Map"
        subtitle="Patient-reported listening priorities."
      >
        {listeningMap.topGoals.length === 0 ? (
          <p className="text-brand-slate">
            No listening goals were captured.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {listeningMap.topGoals.map((g, i) => (
              <li
                key={`${g.name ?? "goal"}-${i}`}
                className="flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-brand-navy">
                    {i + 1}. {g.name ?? "Listening goal"}
                  </span>
                  <span className="text-sm text-brand-slate tabular-nums">
                    priority {g.priorityScore.toFixed(1)} / 10
                  </span>
                </div>
                <Bar pct={g.priorityScore * 10} />
                <div className="flex gap-4 text-xs text-brand-slate">
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
    <section className="rounded-lg border border-brand-slate/20 bg-brand-white p-6">
      <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mb-4 mt-1 text-sm text-brand-slate">{subtitle}</p>
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
        <span className="text-sm font-medium text-brand-navy">{label}</span>
        <span className="text-sm text-brand-slate tabular-nums">
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
    <div className="h-3 w-full overflow-hidden rounded-full bg-brand-slate/15">
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
    <div className="rounded-md border border-brand-slate/30 bg-brand-white p-4" data-testid={testId}>
      <p className="text-xs uppercase tracking-wide text-brand-slate">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-brand-navy">{value}</p>
      <p className="mt-2 text-xs text-brand-slate">{note}</p>
    </div>
  );
}
