"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/BackLink";
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
    <div className="min-h-screen bg-brand-white px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <BackLink href="/" label="Home" />
        </div>
        <div className="mb-10 flex justify-center">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="OViz by OtoVantage"
            width={954}
            height={340}
            priority
            className="h-14 w-auto"
          />
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-navy">
            Set up your clinic
          </h1>
          <p className="mt-2 text-brand-slate">
            This creates your clinic workspace. You can update these settings
            later in Admin.
          </p>
          <p className="mt-1 text-xs text-brand-slate/70">
            Pilot setup — tier selection is for internal testing, not a payment
            checkout.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="rounded-lg border border-brand-slate/20 bg-brand-white p-6">
            <h2 className="mb-4 text-base font-semibold text-brand-navy">
              Clinic details
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clinic-name" className="text-brand-navy">
                  Clinic name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clinic-name"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Acme Hearing Clinic"
                  className="border-brand-slate/30 focus:border-brand-teal focus:ring-brand-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location-name" className="text-brand-navy">
                  Main location name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location-name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Downtown Office"
                  className="border-brand-slate/30 focus:border-brand-teal focus:ring-brand-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full-name" className="text-brand-navy">
                  Your name
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={200}
                  placeholder="Dr. Jane Smith"
                  className="border-brand-slate/30 focus:border-brand-teal focus:ring-brand-teal"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-brand-navy">
              Select a tier
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    tier === t.id
                      ? "border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal"
                      : "border-brand-slate/20 bg-brand-white hover:border-brand-teal/40"
                  }`}
                >
                  <p className="font-semibold text-brand-navy">{t.label}</p>
                  <p className="mt-1 text-xs text-brand-slate">{t.description}</p>
                  <ul className="mt-3 flex flex-col gap-1">
                    {t.features.map((f) => (
                      <li key={f} className="text-xs text-brand-slate">
                        · {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !clinicName.trim() || !locationName.trim()}
            className="h-12 bg-brand-teal text-brand-white hover:bg-brand-teal/90"
          >
            {isSubmitting ? "Setting up…" : "Create clinic and continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
