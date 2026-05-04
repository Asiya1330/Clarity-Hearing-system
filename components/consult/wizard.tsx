"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildPayload } from "./payload";
import {
  StepClinicianInputs,
  isClinicianStepValid,
} from "./step-clinician-inputs";
import { StepListeningMap } from "./step-listening-map";
import {
  StepPartnerImpact,
  isPartnerStepValid,
} from "./step-partner-impact";
import { StepPatient, isPatientStepValid } from "./step-patient";
import { StepPatientSliders } from "./step-patient-sliders";
import { StepReview } from "./step-review";
import { StepProgress } from "./step-progress";
import {
  STEPS,
  type StepId,
  type WizardState,
  getDefaultWizardState,
  localDateString,
} from "./types";

export function ConsultWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("patient");
  const [state, setState] = useState<WizardState>(getDefaultWizardState);

  useEffect(() => {
    setState((s) => ({ ...s, consultDate: s.consultDate || localDateString() }));
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const update = <K extends keyof WizardState>(
    key: K,
    value: WizardState[K],
  ) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const canContinue = (() => {
    switch (step) {
      case "patient":
        return isPatientStepValid(state);
      case "clinician":
        return isClinicianStepValid(state);
      case "partner":
        return isPartnerStepValid(state);
      default:
        return true;
    }
  })();

  const goNext = () => {
    if (!canContinue) return;
    setStep(STEPS[stepIndex + 1].id);
  };
  const goBack = () => {
    setStep(STEPS[stepIndex - 1].id);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        ...buildPayload(state),
        patientName: state.patientName.trim() || undefined,
        consultDate: state.consultDate,
        isFollowUp: state.isFollowUp,
      };
      const res = await fetch("/api/consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data?.error ?? "We could not save the consult. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }
      router.push(`/consults/${data.consultId}`);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <StepProgress current={step} />

      <div>
        {step === "patient" ? (
          <StepPatient state={state} update={update} />
        ) : null}
        {step === "clinician" ? (
          <StepClinicianInputs state={state} update={update} />
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
        {step === "review" ? (
          <StepReview state={state} errorMessage={errorMessage} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-slate/20 pt-6">
        <Button
          variant="outline"
          size="lg"
          className="h-12 px-6"
          onClick={goBack}
          disabled={isFirstStep || isSubmitting}
          data-testid="wizard-back"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {isLastStep ? (
          <Button
            size="lg"
            className="h-12 bg-brand-teal px-8 text-brand-white hover:bg-brand-teal/90"
            onClick={handleSave}
            disabled={!isClinicianStepValid(state) || isSubmitting}
            data-testid="wizard-save"
          >
            {isSubmitting ? "Saving…" : "Save consult"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-12 bg-brand-teal px-8 text-brand-white hover:bg-brand-teal/90"
            onClick={goNext}
            disabled={!canContinue}
            data-testid="wizard-continue"
          >
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
