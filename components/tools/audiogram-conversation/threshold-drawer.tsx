"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  FREQUENCIES,
  PRESET_LABELS,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  THRESHOLD_STEP,
  PresetKey,
  Thresholds,
} from "@/lib/calculators/audiogram-conversation";

const PRESET_ORDER: PresetKey[] = ["normal", "hf", "flat", "severe"];

interface ThresholdDrawerProps {
  open: boolean;
  onClose: () => void;
  thresholds: Thresholds;
  activePreset: PresetKey | null;
  onPreset: (key: PresetKey) => void;
  onStep: (frequency: number, direction: -1 | 1) => void;
  onReset: () => void;
}

export function ThresholdDrawer({
  open,
  onClose,
  thresholds,
  activePreset,
  onPreset,
  onStep,
  onReset,
}: ThresholdDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close controls"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 cursor-default transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "pointer-events-auto bg-brand-navy/5" : "opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Clinician controls — set hearing thresholds"
        className={`pointer-events-auto absolute right-0 top-0 flex h-full w-[min(92vw,360px)] flex-col border-l border-brand-line bg-brand-white shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-line px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal-700">
              Clinician controls
            </p>
            <h2 className="font-heading text-lg font-semibold text-brand-navy">
              Set hearing thresholds
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close controls"
          >
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-sm text-brand-navy/70">
            Quietest sound heard at each pitch (dB HL). Lower is better hearing.
            Each step is {THRESHOLD_STEP} dB.
          </p>

          <div
            role="group"
            aria-label="Example hearing profiles"
            className="mt-5 grid grid-cols-2 gap-2"
          >
            {PRESET_ORDER.map((key) => {
              const active = activePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPreset(key)}
                  className={`min-h-11 rounded-lg border-2 px-3 text-sm font-semibold transition-colors ${
                    active
                      ? "border-brand-teal bg-brand-teal text-brand-white"
                      : "border-brand-line-strong bg-brand-white text-brand-navy hover:border-brand-teal hover:bg-brand-mist"
                  }`}
                >
                  {PRESET_LABELS[key]}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {FREQUENCIES.map((f) => (
              <div key={f} className="flex items-center justify-between gap-3">
                <span className="w-20 text-sm font-semibold text-brand-navy">
                  {f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 border-2 disabled:opacity-40"
                    onClick={() => onStep(f, -1)}
                    disabled={thresholds[f] <= THRESHOLD_MIN}
                    aria-label={`Lower threshold at ${f} hertz`}
                  >
                    <Minus />
                  </Button>
                  <span className="flex w-16 flex-col items-center">
                    <span className="text-lg font-semibold tabular-nums text-brand-navy">
                      {thresholds[f]}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-brand-navy/50">
                      dB HL
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 border-2 disabled:opacity-40"
                    onClick={() => onStep(f, 1)}
                    disabled={thresholds[f] >= THRESHOLD_MAX}
                    aria-label={`Raise threshold at ${f} hertz`}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-brand-line px-5 py-4">
          <Button variant="outline" className="w-full" onClick={onReset}>
            <RotateCcw />
            Reset to high-frequency loss
          </Button>
        </div>
      </aside>
    </div>
  );
}
