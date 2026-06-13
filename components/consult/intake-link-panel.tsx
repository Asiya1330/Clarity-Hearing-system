import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "./copy-link-button";

export async function IntakeLinkPanel({ consultId }: { consultId: string }) {
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("intake_links")
    .select("token, mode, expires_at, used_at, patient_email")
    .eq("consult_id", consultId)
    .order("created_at", { ascending: false })
    .limit(1);

  const link = links?.[0] as
    | {
        token: string;
        mode: "kiosk" | "email";
        expires_at: string;
        used_at: string | null;
        patient_email: string | null;
      }
    | undefined;

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const expired =
    !link || !!link.used_at || new Date(link.expires_at).getTime() < Date.now();

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
      <h2 className="font-heading text-xl font-semibold text-brand-navy">
        Patient link
      </h2>
      {!link || expired ? (
        <p className="mt-2 max-w-prose text-base leading-relaxed text-brand-muted">
          The intake link is no longer active. Start a new consult from the
          dashboard to send a fresh link, or run the consult in clinic.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          <p className="max-w-prose text-base leading-relaxed text-brand-muted">
            {link.mode === "email" ? (
              <>
                Sent to <span className="font-semibold text-brand-navy">{link.patient_email ?? "the patient"}</span>.
                The patient answers from home; their responses will appear
                here automatically.
              </>
            ) : (
              "Open this link on the clinic tablet and hand it to the patient in the waiting area."
            )} Expires {new Date(link.expires_at).toLocaleString()}.
          </p>
          <p className="break-all rounded-lg border border-brand-line bg-brand-mist/50 p-3 text-sm text-brand-muted">
            {origin}/intake/{link.token}
          </p>
          <div>
            <CopyLinkButton path={`/intake/${link.token}`} />
          </div>
        </div>
      )}
    </section>
  );
}
