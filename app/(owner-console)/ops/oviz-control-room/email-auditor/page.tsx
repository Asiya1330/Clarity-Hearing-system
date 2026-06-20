import { Suspense } from "react";
import Link from "next/link";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { listEmailLogs } from "@/lib/owner-console/emails";
import { EmailResendButton } from "@/components/owner-console/email-resend-button";
import { OWNER_CONSOLE_ROOT_PATH } from "@/lib/owner-console/constants";
import {
  EmptyState,
  PageHeading,
  Panel,
  StatusPill,
  formatDateTime,
} from "@/components/owner-console/console-ui";

const STATUSES = [
  "all",
  "queued",
  "sent",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "unknown",
];

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default function EmailAuditorPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading email logs…</p>}>
      <EmailAuditorBody searchParams={searchParams} />
    </Suspense>
  );
}

async function EmailAuditorBody({ searchParams }: PageProps) {
  await requireOwnerConsoleAccess();
  const sp = await searchParams;
  const search = sp.search?.trim() ?? "";
  const status = sp.status ?? "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { rows, total, pageSize } = await listEmailLogs({ search, status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = `${OWNER_CONSOLE_ROOT_PATH}/email-auditor`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Email auditor"
        description="Transactional email delivery. Recipients are masked; raw addresses are never stored."
      />

      <form action={base} method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Masked recipient (e.g. jo***)"
          className="h-10 w-full max-w-xs rounded-lg border border-brand-line bg-brand-white px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-brand-line bg-brand-white px-3 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-teal px-4 text-sm font-semibold text-brand-white hover:bg-brand-teal-700"
        >
          Filter
        </button>
      </form>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState message="No email logs match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-brand-muted">
                  <th className="py-2 pr-4 font-semibold">When</th>
                  <th className="py-2 pr-4 font-semibold">Clinic</th>
                  <th className="py-2 pr-4 font-semibold">Recipient</th>
                  <th className="py-2 pr-4 font-semibold">Template</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Provider id</th>
                  <th className="py-2 pr-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-brand-line/60 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-brand-muted">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="py-2 pr-4 text-brand-muted">{e.clinicName ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-navy">{e.maskedRecipient ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-muted">{e.template ?? "—"}</td>
                    <td className="py-2 pr-4"><StatusPill status={e.status} /></td>
                    <td className="py-2 pr-4 font-mono text-xs text-brand-muted">
                      {e.providerMessageId ? e.providerMessageId.slice(0, 12) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <EmailResendButton emailLogId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="flex items-center justify-between text-sm text-brand-muted">
        <span>
          {total} log{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`${base}?${new URLSearchParams({ search, status, page: String(page - 1) })}`}
              className="rounded-md border border-brand-line px-3 py-1 hover:bg-brand-mist"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`${base}?${new URLSearchParams({ search, status, page: String(page + 1) })}`}
              className="rounded-md border border-brand-line px-3 py-1 hover:bg-brand-mist"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
