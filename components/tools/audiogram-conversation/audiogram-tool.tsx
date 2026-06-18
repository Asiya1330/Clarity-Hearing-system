"use client";

import {
  Headphones,
  SlidersHorizontal,
  Sparkles,
  Users,
  VolumeX,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  clampThreshold,
  computeAudiogram,
  DEFAULT_PRESET,
  degreeLabel,
  severityKey,
  THRESHOLD_PRESETS,
  THRESHOLD_STEP,
  ChipId,
  ChipIntent,
  PresetKey,
  Thresholds,
} from "@/lib/calculators/audiogram-conversation";

import { AudiogramChart } from "./audiogram-chart";
import { ThresholdDrawer } from "./threshold-drawer";

const CHIP_STYLE: Record<
  ChipIntent,
  { bar: string; iconBg: string; iconFg: string; tagBg: string; tagFg: string }
> = {
  alert: {
    bar: "#C62828",
    iconBg: "#FBE6E6",
    iconFg: "#C62828",
    tagBg: "#FBE6E6",
    tagFg: "#C62828",
  },
  warn: {
    bar: "#9A4B00",
    iconBg: "#FBEDD8",
    iconFg: "#9A4B00",
    tagBg: "#FBEDD8",
    tagFg: "#9A4B00",
  },
  good: {
    bar: "#00696A",
    iconBg: "#E6F0F0",
    iconFg: "#00696A",
    tagBg: "#E6F0F0",
    tagFg: "#00696A",
  },
  muted: {
    bar: "#C4D0D4",
    iconBg: "#F1F5F6",
    iconFg: "#44525E",
    tagBg: "#F1F5F6",
    tagFg: "#44525E",
  },
};

const CHIP_ICON: Record<ChipId, typeof VolumeX> = {
  consonants: VolumeX,
  effort: Users,
  treatment: Sparkles,
};

const DEGREE_BADGE: Record<string, string> = {
  normal: "#1B7A3D",
  mild: "#876400",
  moderate: "#9A4B00",
  modSevere: "#9A3412",
  severe: "#B42318",
  profound: "#8A1530",
};

const clonePreset = (key: PresetKey): Thresholds => ({
  ...THRESHOLD_PRESETS[key],
});

function Readout({ cap, children }: { cap: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-mist/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
        {cap}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function AudiogramTool() {
  const [thresholds, setThresholds] = useState<Thresholds>(
    clonePreset(DEFAULT_PRESET),
  );
  const [activePreset, setActivePreset] = useState<PresetKey | null>(
    DEFAULT_PRESET,
  );
  const [aided, setAided] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const model = useMemo(
    () => computeAudiogram(thresholds, aided),
    [thresholds, aided],
  );

  const ariaLabel = useMemo(() => {
    const highAvg =
      (thresholds[2000] + thresholds[4000] + thresholds[8000]) / 3;
    return `Audiogram. Speech-frequency average ${model.readout.pta} decibels, ${model.readout.degree} degree. High pitches in the ${degreeLabel(
      highAvg,
    )} range. ${model.caption}`;
  }, [thresholds, model]);

  const applyPreset = (key: PresetKey) => {
    setThresholds(clonePreset(key));
    setActivePreset(key);
  };

  const step = (frequency: number, direction: -1 | 1) => {
    setThresholds((prev) => ({
      ...prev,
      [frequency]: clampThreshold(prev[frequency] + direction * THRESHOLD_STEP),
    }));
    setActivePreset(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* CONTROL BAR */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal />
          Adjust hearing levels
        </Button>
      </div>

      {/* CLIENT-FACING SECTION (maximized) */}
      <section className="overflow-hidden rounded-2xl border border-brand-line bg-brand-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            This patient&apos;s hearing
          </p>
          <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-teal-700">
            …to this conversation
          </span>
        </div>

        <div className="p-5 sm:p-7">
          {/* a. Chart box */}
          <div className="rounded-2xl border border-brand-line bg-[#FBFDFD] p-3 sm:p-4">
            <AudiogramChart
              thresholds={thresholds}
              aided={aided}
              ariaLabel={ariaLabel}
            />
          </div>

          {/* b. Caption */}
          <p
            className="mt-5 flex items-start gap-3 text-xl font-semibold leading-snug text-brand-navy"
            aria-live="polite"
          >
            <Headphones className="mt-1 h-6 w-6 shrink-0 text-brand-teal-700" />
            <span>{model.caption}</span>
          </p>

          {/* c. Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-brand-muted">
            <span className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-brand-navy" />
              This ear
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0 w-6 border-t-2 border-dashed border-brand-teal" />
              With hearing aids
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-teal/40" />
              Speech sounds zone
            </span>
            <span className="flex items-center gap-2">
              Normal
              <span className="flex">
                <span
                  className="h-4 w-4"
                  style={{ backgroundColor: "#DFF3E3" }}
                />
                <span
                  className="h-4 w-4"
                  style={{ backgroundColor: "#FBF1CE" }}
                />
                <span
                  className="h-4 w-4"
                  style={{ backgroundColor: "#FBE3C6" }}
                />
                <span
                  className="h-4 w-4"
                  style={{ backgroundColor: "#F8C7C7" }}
                />
                <span
                  className="h-4 w-4"
                  style={{ backgroundColor: "#F0B5BF" }}
                />
              </span>
              Profound
            </span>
          </div>

          {/* d. Readouts */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Readout cap="Speech-frequency average">
              <p className="text-3xl font-bold tabular-nums text-brand-navy">
                {model.readout.pta}
                <span className="text-base font-semibold text-brand-muted">
                  {" "}
                  dB HL
                </span>
              </p>
            </Readout>
            <Readout cap="Degree of hearing loss">
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-bold text-white"
                style={{
                  backgroundColor:
                    DEGREE_BADGE[severityKey(model.readout.pta)] ?? "#44525E",
                }}
              >
                {model.readout.degree}
              </span>
            </Readout>
            <Readout cap="Clarity gap · high − low pitch">
              <p
                className="text-3xl font-bold tabular-nums"
                style={{
                  color:
                    model.readout.clarityGap >= 18 ? "#9A4B00" : "#002147",
                }}
              >
                {model.readout.clarityGap >= 0 ? "+" : ""}
                {model.readout.clarityGap}
                <span className="text-base font-semibold text-brand-muted">
                  {" "}
                  dB
                </span>
              </p>
            </Readout>
          </div>

          {/* e. Chips */}
          <div
            className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"
            aria-live="polite"
          >
            {model.chips.map((chip) => {
              const style = CHIP_STYLE[chip.intent];
              const Icon = CHIP_ICON[chip.id];
              return (
                <div
                  key={chip.id}
                  className={`rounded-2xl border border-brand-line bg-brand-white p-5 ${
                    chip.active ? "" : "opacity-50"
                  }`}
                  style={{
                    borderLeftColor: style.bar,
                    borderLeftWidth: 6,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: style.iconBg,
                        color: style.iconFg,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: style.tagBg,
                        color: style.tagFg,
                      }}
                    >
                      {chip.tag}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-lg font-semibold text-brand-navy">
                    {chip.title}
                  </h3>
                  <p className="mt-1 text-brand-muted">{chip.detail}</p>
                </div>
              );
            })}
          </div>

          {/* f. Aided toggle */}
          <button
            type="button"
            aria-pressed={aided}
            onClick={() => setAided((prev) => !prev)}
            className={`mt-6 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl border-2 text-lg font-bold transition-colors motion-reduce:transition-none ${
              aided
                ? "border-brand-teal bg-brand-teal text-brand-white"
                : "border-brand-teal bg-brand-white text-brand-teal-700 hover:bg-brand-mist"
            }`}
          >
            <Sparkles className="h-6 w-6" />
            {aided ? "Hide hearing aids" : "Show what hearing aids give back"}
          </button>
        </div>
      </section>

      {/* CLINICIAN-FACING SECTION (minimized) */}
      <ThresholdDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        thresholds={thresholds}
        activePreset={activePreset}
        onPreset={applyPreset}
        onStep={step}
        onReset={() => applyPreset(DEFAULT_PRESET)}
      />
    </div>
  );
}
