"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { RisingLine } from "@/components/app/rising-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tier = "starter" | "pro" | "enterprise";

const tiers: {
  id: Tier;
  label: string;
  description: string;
  features: string[];
}[] = [
  {
    id: "starter",
    label: "Starter",
    description: "Core consult and report features.",
    features: [
      "Consult wizard",
      "Brain Battery",
      "Word Understanding Scenario",
      "Social Radius",
      "Partner Impact Mirror",
      "Take-home report",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    description: "Everything in Starter plus premium ear fit photos.",
    features: [
      "All Starter features",
      "Premium Ear Fit Photos (up to 4 per consult)",
      "Photo consent workflow",
      "Photos in report",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Multi-location and advanced admin support.",
    features: [
      "All Pro features",
      "Multi-location management",
      "Advanced user roles",
      "Outcome tracking",
      "Priority support",
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [tier, setTier] = useState<Tier>("starter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicName, locationName, fullName, tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Setup failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(data.redirect ?? "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="oviz-surface min-h-screen bg-brand-mist/40 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <BackLink href="/" label="Home" />
        </div>
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="OViz by OtoVantage"
            width={954}
            height={340}
            priority
            className="h-14 w-auto"
          />
          <RisingLine className="h-4 w-40 opacity-70" />
        </div>

        <header className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-semibold text-brand-navy sm:text-4xl">
            Set up your clinic
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-brand-muted">
            This creates your clinic workspace. You can update these settings
            later in Admin.
          </p>
          <p className="mt-2 text-base text-brand-muted">
            Pilot setup — tier selection is for internal testing, not a payment
            checkout.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
            <h2 className="mb-5 font-heading text-xl font-semibold text-brand-navy">
              Clinic details
            </h2>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="clinic-name"
                  className="text-base text-brand-navy"
                >
                  Clinic name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clinic-name"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Acme Hearing Clinic"
                  className="h-14 text-lg"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="location-name"
                  className="text-base text-brand-navy"
                >
                  Main location name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location-name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Downtown Office"
                  className="h-14 text-lg"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="full-name" className="text-base text-brand-navy">
                  Your name
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={200}
                  placeholder="Dr. Jane Smith"
                  className="h-14 text-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 font-heading text-xl font-semibold text-brand-navy">
              Select a tier
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {tiers.map((t) => {
                const active = tier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    aria-pressed={active}
                    className={`rounded-2xl border-2 p-5 text-left transition-colors ${
                      active
                        ? "border-brand-teal bg-brand-tint shadow-sm"
                        : "border-brand-line bg-brand-white hover:border-brand-teal/50"
                    }`}
                  >
                    <p className="font-heading text-lg font-semibold text-brand-navy">
                      {t.label}
                    </p>
                    <p className="mt-1 text-sm text-brand-muted">
                      {t.description}
                    </p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {t.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-brand-navy"
                        >
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal-700"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-base text-destructive"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !clinicName.trim() || !locationName.trim()}
            className="h-14 bg-brand-teal text-lg font-semibold text-brand-white hover:bg-brand-teal-700"
          >
            {isSubmitting ? "Setting up…" : "Create clinic and continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
