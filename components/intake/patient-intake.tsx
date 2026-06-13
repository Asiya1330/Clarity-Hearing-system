"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StepListeningMap } from "@/components/consult/step-listening-map";
import { StepPartnerImpact } from "@/components/consult/step-partner-impact";
import { StepPatientSliders } from "@/components/consult/step-patient-sliders";
import {
  type WizardState,
  getDefaultWizardState,
} from "@/components/consult/types";

type Mode = "kiosk" | "email";

const PATIENT_STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "sliders", label: "Everyday listening" },
  { id: "partner", label: "Partner impact" },
  { id: "listening", label: "Situations that matter" },
] as const;
type PatientStepId = (typeof PATIENT_STEPS)[number]["id"];

export function PatientIntake({
  token,
  mode,
  patientName,
  clinicName,
}: {
  token: string;
  mode: Mode;
  patientName: string | null;
  clinicName: string;
}) {
  const [step, setStep] = useState<PatientStepId>("welcome");
  const [state, setState] = useState<WizardState>(getDefaultWizardState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = <K extends keyof WizardState>(
    key: K,
    value: WizardState[K],
  ) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const idx = PATIENT_STEPS.findIndex((s) => s.id === step);
  const isLast = idx === PATIENT_STEPS.length - 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fatigue: state.fatigue,
          avoidNoise: state.avoidNoise,
          repeats: state.repeats,
          tvVolume: state.tvVolume,
          conversation: state.conversation,
          ...(state.partnerRepeatsPerDay !== null
            ? { partnerRepeatsPerDay: state.partnerRepeatsPerDay }
            : {}),
          ...(state.partnerParticipated
            ? {
                partnerFrustration: state.partnerFrustration,
                partnerAvoidance: state.partnerAvoidance,
                partnerSocialImpact: state.partnerSocialImpact,
              }
            : {}),
          listeningSituations: state.listeningSituations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error ?? "We could not save your answers. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-2xl border border-brand-line bg-brand-white p-10 text-center shadow-sm"
        data-testid="intake-done"
      >
        <h1 className="font-heading text-3xl font-semibold text-brand-navy">
          Thank you — all done!
        </h1>
        <p className="mx-auto mt-4 max-w-prose text-xl leading-relaxed text-brand-muted">
          {mode === "kiosk"
            ? "Your answers have been saved. Please hand the tablet back to the front desk."
            : `Your answers have been sent to ${clinicName}. There's nothing else to do — see you at your appointment.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2" role="list" aria-label="Progress">
        {PATIENT_STEPS.map((s, i) => (
          <div
            key={s.id}
            role="listitem"
            aria-current={i === idx ? "step" : undefined}
            className={`h-2.5 flex-1 rounded-full transition-colors ${
              i < idx
                ? "bg-brand-navy"
                : i === idx
                ? "bg-brand-teal"
                : "bg-brand-line"
            }`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-brand-line bg-brand-white p-6 shadow-sm sm:p-8">
        {step === "welcome" ? (
          <div className="flex flex-col gap-5">
            <h1 className="font-heading text-3xl font-semibold text-brand-navy">
              {patientName ? `Welcome, ${patientName}` : "Welcome"}
            </h1>
            <p className="max-w-prose text-xl leading-relaxed text-brand-muted">
              Before your hearing appointment, {clinicName} would like to learn
              how listening feels in your everyday life. It takes about 5
              minutes.
            </p>
            <p className="max-w-prose text-xl leading-relaxed text-brand-muted">
              There are no right or wrong answers — just tell us how things
              feel day to day. Your answers go directly to your hearing care
              team.
            </p>
          </div>
        ) : null}
        {step === "sliders" ? (
          <StepPatientSliders state={state} update={update} />
        ) : null}
        {step === "partner" ? (
          <StepPartnerImpact state={state} update={update} />
        ) : null}
        {step === "listening" ? (
          <StepListeningMap state={state} update={update} />
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-base text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-brand-line pt-6">
          <Button
            variant="outline"
            size="lg"
            className="h-14 border-brand-line px-7 text-lg font-medium text-brand-navy hover:border-brand-teal hover:text-brand-teal-700"
            onClick={() => setStep(PATIENT_STEPS[idx - 1].id)}
            disabled={idx === 0 || submitting}
            data-testid="intake-back"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back
          </Button>
          {isLast ? (
            <Button
              size="lg"
              className="h-14 bg-brand-teal px-9 text-lg font-semibold text-brand-white hover:bg-brand-teal-700"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="intake-submit"
            >
              {submitting ? "Saving…" : "Finish and send answers"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-14 bg-brand-teal px-9 text-lg font-semibold text-brand-white hover:bg-brand-teal-700"
              onClick={() => setStep(PATIENT_STEPS[idx + 1].id)}
              data-testid="intake-continue"
            >
              {step === "welcome" ? "Start" : "Continue"}
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-base text-brand-muted">
        Powered by OViz by OtoVantage · Your answers are stored privately for
        your clinic.
      </p>
    </div>
  );
}
