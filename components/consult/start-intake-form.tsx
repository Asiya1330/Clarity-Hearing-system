"use client";

import { Mail, TabletSmartphone, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "email" | "kiosk";

function localDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface CreatedIntake {
  consultId: string;
  url: string;
  emailSent: boolean;
  emailError: string | null;
}

export function StartIntakeForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [consultDate, setConsultDate] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedIntake | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setConsultDate(localDateString());
  }, []);

  const labels =
    mode === "email"
      ? {
          cta: "Set up email intake",
          submit: "Create and email link",
          submitting: "Sending…",
          testid: "mode-email",
        }
      : {
          cta: "Set up kiosk session",
          submit: "Start kiosk session",
          submitting: "Starting…",
          testid: "mode-kiosk",
        };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          patientName: patientName.trim() || undefined,
          consultDate,
          isFollowUp,
          ...(mode === "email" ? { patientEmail: patientEmail.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error ?? "We could not set up the intake. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      if (mode === "kiosk") {
        router.push(`/intake/${data.url.split("/intake/")[1]}`);
        return;
      }
      setCreated(data as CreatedIntake);
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link text and copy manually.");
    }
  };

  if (created) {
    return (
      <div
        className="flex flex-col gap-3 rounded-xl border border-brand-teal/40 bg-brand-tint p-4"
        data-testid="intake-created"
      >
        <p className="text-base font-semibold text-brand-teal-700">
          {created.emailSent
            ? "Link emailed to the patient."
            : "Intake link created."}
        </p>
        {!created.emailSent && created.emailError ? (
          <p className="text-sm leading-relaxed text-brand-muted">
            {created.emailError}
          </p>
        ) : null}
        <p className="break-all rounded-lg border border-brand-line bg-brand-white p-3 text-sm text-brand-muted">
          {created.url}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            className="h-11 border-brand-teal/40 px-4 text-sm font-medium text-brand-teal-700 hover:bg-brand-white"
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/consults/${created.consultId}`)}
            className="h-11 border-brand-line px-4 text-sm font-medium text-brand-navy hover:border-brand-teal hover:text-brand-teal-700"
          >
            View consult
          </Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={labels.testid}
        className="h-12 w-full bg-brand-teal px-6 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
      >
        {labels.cta}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${mode}-patient-name`}
          className="text-sm font-semibold text-brand-navy"
        >
          Patient name
        </label>
        <Input
          id={`${mode}-patient-name`}
          type="text"
          maxLength={120}
          placeholder="Optional"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>

      {mode === "email" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email-patient-email"
            className="text-sm font-semibold text-brand-navy"
          >
            Patient email <span className="text-destructive">*</span>
          </label>
          <Input
            id="email-patient-email"
            type="email"
            required
            placeholder="patient@example.com"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${mode}-consult-date`}
          className="text-sm font-semibold text-brand-navy"
        >
          Appointment date <span className="text-destructive">*</span>
        </label>
        <Input
          id={`${mode}-consult-date`}
          type="date"
          required
          value={consultDate}
          onChange={(e) => setConsultDate(e.target.value)}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-base text-brand-navy">
        <input
          type="checkbox"
          checked={isFollowUp}
          onChange={(e) => setIsFollowUp(e.target.checked)}
          className="h-5 w-5 rounded border-brand-line accent-[#008B8B]"
        />
        <span>I’m starting a follow-up consult</span>
      </label>

      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-base text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        data-testid={`${mode}-submit`}
        className="h-12 bg-brand-teal px-6 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
      >
        {submitting ? labels.submitting : labels.submit}
      </Button>
    </div>
  );
}
