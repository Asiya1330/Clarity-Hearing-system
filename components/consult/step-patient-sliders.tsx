"use client";

import { LabeledSlider } from "./labeled-slider";
import type { StepProps } from "./types";

export function StepPatientSliders({ state, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Patient sliders
        </h2>
        <p className="mt-1 text-brand-slate">
          Where does today land for you? Slide each one.
        </p>
      </header>

      <LabeledSlider
        id="fatigue"
        label="Listening fatigue"
        helper="How tiring is listening through the day?"
        value={state.fatigue}
        onChange={(v) => update("fatigue", v)}
        minLabel="Not tiring"
        maxLabel="Exhausting"
      />
      <LabeledSlider
        id="avoidNoise"
        label="Avoiding noisy places"
        helper="How often do you avoid noisy places because hearing is hard?"
        value={state.avoidNoise}
        onChange={(v) => update("avoidNoise", v)}
        minLabel="Never"
        maxLabel="Often"
      />
      <LabeledSlider
        id="repeats"
        label="Asking for repeats"
        helper="How often do you ask people to repeat themselves?"
        value={state.repeats}
        onChange={(v) => update("repeats", v)}
        minLabel="Rarely"
        maxLabel="Constantly"
      />
      <LabeledSlider
        id="tvVolume"
        label="TV volume"
        helper="How loud is the TV compared to others in the home?"
        value={state.tvVolume}
        onChange={(v) => update("tvVolume", v)}
        minLabel="Same as others"
        maxLabel="Much louder"
      />
      <LabeledSlider
        id="conversation"
        label="Following conversation"
        helper="How hard is it to follow a conversation in a normal room?"
        value={state.conversation}
        onChange={(v) => update("conversation", v)}
        minLabel="Easy"
        maxLabel="Very hard"
      />
    </div>
  );
}
