import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { AudiogramTool } from "@/components/tools/audiogram-conversation/audiogram-tool";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Audiogram → Conversation · Clarity-Hearing-system",
  description:
    "An interactive demonstration that turns an audiogram into the plain-language story of a patient's hearing.",
};

export default function AudiogramToolPage() {
  return (
    <Suspense fallback={<ToolSkeleton />}>
      <AudiogramToolBody />
    </Suspense>
  );
}

function ToolSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-5 w-32 animate-pulse rounded bg-brand-line" />
      <div className="h-10 w-72 animate-pulse rounded bg-brand-line" />
      <div className="h-[480px] w-full animate-pulse rounded-2xl bg-brand-line" />
    </div>
  );
}

async function AudiogramToolBody() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login"); // defense-in-depth; the global proxy already gates this path

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/dashboard" label="Dashboard" />

      <PageHeader
        eyebrow="Demonstration tool"
        title="Audiogram → Conversation"
        subtitle="Show a patient what their audiogram means — which sounds slip past, why noise is tiring, and what hearing aids give back. Nothing here is saved to a consult."
      />

      <AudiogramTool />
    </div>
  );
}
