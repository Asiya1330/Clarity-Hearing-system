import Image from "next/image";
import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatientIntake } from "@/components/intake/patient-intake";
import { RisingLine } from "@/components/app/rising-line";

interface PageProps {
  params: Promise<{ token: string }>;
}

type LinkRow = {
  consult_id: string;
  clinic_id: string;
  mode: "kiosk" | "email";
  expires_at: string;
  used_at: string | null;
};

export default function IntakePage({ params }: PageProps) {
  return (
    <div className="oviz-surface min-h-screen bg-brand-mist/40">
      <header className="border-b border-brand-line bg-brand-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-5">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="OViz by OtoVantage"
            width={954}
            height={340}
            priority
            className="h-12 w-auto"
          />
          <p className="text-base font-medium text-brand-muted">Your clinic</p>
        </div>
        <RisingLine className="h-[3px] w-full opacity-50" />
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Suspense fallback={<IntakeLoading />}>
          <IntakeContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

function IntakeLoading() {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-white p-10 text-center shadow-sm">
      <p className="text-base text-brand-muted">Opening your patient intake link…</p>
    </div>
  );
}

async function IntakeContent({ params }: PageProps) {
  const { token } = await params;

  let valid = false;
  let mode: "kiosk" | "email" = "email";
  let clinicName = "Your clinic";
  let patientName: string | null = null;

  try {
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("intake_links")
      .select("consult_id, clinic_id, mode, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (link) {
      const l = link as LinkRow;
      const open =
        !l.used_at && new Date(l.expires_at).getTime() >= Date.now();
      if (open) {
        const { data: consult } = await admin
          .from("consults")
          .select("status, patient_name")
          .eq("id", l.consult_id)
          .maybeSingle();
        if (consult?.status === "awaiting_patient") {
          valid = true;
          mode = l.mode;
          patientName = (consult.patient_name as string | null) ?? null;
          const { data: clinic } = await admin
            .from("clinics")
            .select("name")
            .eq("id", l.clinic_id)
            .maybeSingle();
          if (clinic?.name) clinicName = clinic.name as string;
        }
      }
    }
  } catch (err) {
    console.error("intake.page token validation failed", err);
  }

  return valid ? (
    <PatientIntake
      token={token}
      mode={mode}
      patientName={patientName}
      clinicName={clinicName}
    />
  ) : (
    <LinkUnavailable />
  );
}

function LinkUnavailable() {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-white p-10 text-center shadow-sm">
      <h1 className="font-heading text-2xl font-semibold text-brand-navy">
        This link is no longer available
      </h1>
      <p className="mx-auto mt-3 max-w-prose text-lg leading-relaxed text-brand-muted">
        It may have expired or already been used. Please contact your hearing
        clinic and they will send you a new one — or you can simply answer the
        questions together at your appointment.
      </p>
    </div>
  );
}
