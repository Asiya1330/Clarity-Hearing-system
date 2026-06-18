import { ListeningLiftTracks } from "@/components/consult/listening-lift-tracks";
import type { TopGoal } from "@/lib/calculators/impact";
import { calculateListeningLift } from "@/lib/calculators/listening-lift";

/**
 * Real-Life Listening Map — premium amplification-impact track.
 *
 * This stays a SERVER component: it runs calculateListeningLift(topGoals, wrs)
 * exactly as before and hands the already-computed, serializable result to the
 * client <ListeningLiftTracks>, which holds the "No hearing aids" / "Hearing
 * aids" toggle. The calculator never moves to the client.
 *
 * Public props are unchanged ({ topGoals, wrs }); the view defaults to the aided
 * projection, so SSR / no-JS / reduced-motion / print render today's aided map.
 */
export function ListeningLiftMap({
  topGoals,
  wrs,
}: {
  topGoals: TopGoal[];
  wrs: number;
}) {
  if (topGoals.length === 0) {
    return (
      <p className="text-lg text-brand-muted">
        No listening goals were captured.
      </p>
    );
  }

  const lift = calculateListeningLift(topGoals, wrs);

  return (
    <ListeningLiftTracks
      goals={lift.goals}
      bestResponder={lift.bestResponder}
      wrs={wrs}
    />
  );
}
