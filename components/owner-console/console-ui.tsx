import * as React from "react";
import { cn } from "@/lib/utils";

/** Deterministic UTC formatter (avoids SSR/client locale mismatch). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-navy">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-brand-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-brand-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-sky-100 text-sky-800",
  suspended: "bg-rose-100 text-rose-800",
  past_due: "bg-amber-100 text-amber-900",
  canceled: "bg-stone-200 text-stone-700",
  sent: "bg-emerald-100 text-emerald-800",
  delivered: "bg-emerald-100 text-emerald-800",
  queued: "bg-sky-100 text-sky-800",
  failed: "bg-rose-100 text-rose-800",
  bounced: "bg-rose-100 text-rose-800",
  complained: "bg-amber-100 text-amber-900",
  unknown: "bg-stone-200 text-stone-700",
  synced: "bg-emerald-100 text-emerald-800",
  not_applicable: "bg-stone-200 text-stone-700",
  not_configured: "bg-stone-200 text-stone-700",
  sync_failed: "bg-rose-100 text-rose-800",
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "bg-stone-200 text-stone-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function ConfigDot({
  configured,
}: {
  configured: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        configured ? "text-emerald-700" : "text-stone-500",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          configured ? "bg-emerald-500" : "bg-stone-300",
        )}
      />
      {configured ? "Configured" : "Missing"}
    </span>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-brand-line bg-brand-white p-6 shadow-sm",
        className,
      )}
    >
      {title && (
        <h2 className="mb-4 font-heading text-lg font-semibold text-brand-navy">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-brand-line bg-brand-mist/30 px-4 py-8 text-center text-sm text-brand-muted">
      {message}
    </p>
  );
}
