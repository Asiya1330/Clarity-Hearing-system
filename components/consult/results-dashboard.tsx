import {
  BrainBatteryViz,
  PartnerImpactViz,
  SocialRadiusViz,
  WordUnderstandingViz,
} from "@/components/report/impact-visuals";
import type { ImpactOutputs } from "@/lib/calculators/impact";
import { Disclaimer } from "./disclaimer";
import { ListeningLiftMap } from "./listening-lift-map";

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
        subtitle="How much energy is left for everything besides listening."
      >
        <BrainBatteryViz battery={brainBattery} />
      </Card>

      <Card
        title="Word Understanding Scenario"
        subtitle={`${wordUnderstanding.label}.`}
      >
        <WordUnderstandingViz wu={wordUnderstanding} />
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
        <SocialRadiusViz radius={socialRadius} />
      </Card>

      <Card
        title="Partner Impact Mirror"
        subtitle="This hearing difficulty may be affecting both of you."
      >
        <PartnerImpactViz impact={partnerImpact} />
      </Card>

      <Card
        title="Real-Life Listening Map"
        subtitle="What amplification could ease in the situations that matter most."
      >
        <ListeningLiftMap
          topGoals={listeningMap.topGoals}
          wrs={wordUnderstanding.current}
        />
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
