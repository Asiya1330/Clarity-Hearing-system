import {
  BatteryCharging,
  Clock,
  MapPinned,
  MessagesSquare,
  Users,
} from "lucide-react";

import { ListeningLiftMap } from "@/components/consult/listening-lift-map";
import { AtAGlance } from "@/components/report/at-a-glance";
import {
  BrainBatteryViz,
  PartnerImpactViz,
  SocialRadiusViz,
  WordUnderstandingViz,
} from "@/components/report/impact-visuals";
import { SectionCard } from "@/components/report/section-card";
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

  const effortPct = Math.round(brainBattery.brainLoad);
  const wrsPct = Math.round(wordUnderstanding.current);
  const wrsTreated = Math.round(wordUnderstanding.treated5Year);
  const wrsUntreated = Math.round(wordUnderstanding.untreated5Year);
  const repeats = Math.round(partnerImpact.repeatsPerDay);
  const bestGoal = listeningMap.topGoals[0]?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Disclaimer />

      <AtAGlance outputs={outputs} />

      <SectionCard
        icon={BatteryCharging}
        kicker="How hard your brain is working"
        title="Brain Battery"
        takeaway={
          <>
            Think of listening like a battery. Right now your brain spends
            about <b className="font-semibold">{effortPct}% of its energy</b>{" "}
            just to follow sound — leaving less for remembering, focusing and
            enjoying the moment.
          </>
        }
        whatWeCanDo="reducing listening effort is one of the clearest day-to-day benefits people notice with the right support."
      >
        <BrainBatteryViz battery={brainBattery} />
      </SectionCard>

      <SectionCard
        icon={MessagesSquare}
        kicker="How many words you catch"
        title="Word Understanding Scenario"
        takeaway={
          <>
            You catch about{" "}
            <b className="font-semibold">{wrsPct}% of clearly spoken words</b>{" "}
            today. {wordUnderstanding.label}; without support that tends to
            slip a little each year.
          </>
        }
        whatWeCanDo={`support won't turn back the clock, but it slows the slide — modelled at about ${wrsTreated}% with help versus ${wrsUntreated}% without, in five years.`}
      >
        <WordUnderstandingViz wu={wordUnderstanding} />
      </SectionCard>

      <SectionCard
        icon={Users}
        kicker="How far comfortable hearing reaches"
        title="Social Radius"
        takeaway={
          <>
            Comfortable conversation reaches about{" "}
            <b className="font-semibold">
              {socialRadius.currentRadius.toFixed(1)} of 10
            </b>{" "}
            today. With support, that circle can grow to take in more of the
            room.
          </>
        }
        whatWeCanDo="a wider comfortable radius means staying part of group conversations instead of stepping back from them."
      >
        <SocialRadiusViz radius={socialRadius} />
      </SectionCard>

      <SectionCard
        icon={Clock}
        kicker="This affects both of you"
        title="Partner Impact Mirror"
        takeaway={
          <>
            A partner repeats themselves about{" "}
            <b className="font-semibold">{repeats} times a day</b>. Over a
            year, that adds up to{" "}
            <b className="font-semibold">
              {partnerImpact.annualPartnerHours.toFixed(1)} hours
            </b>{" "}
            of shared time spent on what hearing made hard to catch.
          </>
        }
        whatWeCanDo="fewer repeats is one of the first changes partners notice — it gives that time back to both of you."
      >
        <PartnerImpactViz impact={partnerImpact} />
      </SectionCard>

      <SectionCard
        icon={MapPinned}
        kicker="What matters most to you"
        title="Real-Life Listening Map"
        takeaway={
          <>
            These are the moments{" "}
            <b className="font-semibold">you told us matter</b>.{" "}
            {bestGoal
              ? `Amplification eases the most difficulty in ${bestGoal}, less in noisier rooms.`
              : "Each track shows where amplification could help and what would still remain."}
          </>
        }
        whatWeCanDo="your goals lead the plan — progress is measured against the situations you chose, not a generic checklist."
      >
        <ListeningLiftMap
          topGoals={listeningMap.topGoals}
          wrs={wordUnderstanding.current}
        />
      </SectionCard>
    </div>
  );
}
