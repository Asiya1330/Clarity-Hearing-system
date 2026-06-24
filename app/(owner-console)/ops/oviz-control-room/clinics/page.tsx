import { Suspense } from "react";
import Link from "next/link";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { listClinics } from "@/lib/owner-console/clinics";
import { stripeDashboardCustomerUrl } from "@/lib/owner-console/stripe";
import { OWNER_CONSOLE_ROOT_PATH } from "@/lib/owner-console/constants";
import {
  EmptyState,
  PageHeading,
  Panel,
  StatusPill,
  formatDate,
} from "@/components/owner-console/console-ui";

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default function ClinicsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading clinics…</p>}>
      <ClinicsBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ClinicsBody({ searchParams }: PageProps) {
  await requireOwnerConsoleAccess();
  const sp = await searchParams;
  const search = sp.search?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { rows, total, pageSize } = await listClinics({ search, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = `${OWNER_CONSOLE_ROOT_PATH}/clinics`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Clinics"
        description="Every tenant. Search by clinic name, clinic id, or owner email."
      />

      <form action={base} method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Clinic name, id, or owner@email"
          className="h-10 w-full max-w-sm rounded-lg border border-brand-line bg-brand-white px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-teal px-4 text-sm font-semibold text-brand-white hover:bg-brand-teal-700"
        >
          Search
        </button>
        {search && (
          <Link href={base} className="text-sm text-brand-muted hover:underline">
            Clear
          </Link>
        )}
      </form>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState message="No clinics match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-brand-muted">
                  <th className="py-2 pr-4 font-semibold">Clinic</th>
                  <th className="py-2 pr-4 font-semibold">Owner</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Plan</th>
                  <th className="py-2 pr-4 font-semibold">Subscription</th>
                  <th className="py-2 pr-4 font-semibold">Created</th>
                  <th className="py-2 pr-4 font-semibold">Last activity</th>
                  <th className="py-2 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-brand-line/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-brand-navy">{c.name}</td>
                    <td className="py-2 pr-4 text-brand-muted">{c.ownerEmail ?? "—"}</td>
                    <td className="py-2 pr-4"><StatusPill status={c.accountStatus} /></td>
                    <td className="py-2 pr-4 capitalize text-brand-muted">{c.subscriptionPlan}</td>
                    <td className="py-2 pr-4"><StatusPill status={c.subscriptionStatus} /></td>
                    <td className="py-2 pr-4 text-brand-muted">{formatDate(c.createdAt)}</td>
                    <td className="py-2 pr-4 text-brand-muted">{formatDate(c.lastActivityAt)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`${base}/${c.id}`}
                          className="font-medium text-brand-teal-700 hover:underline"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`${base}/${c.id}/support-view`}
                          className="text-brand-muted hover:underline"
                        >
                          Support
                        </Link>
                        {c.stripeCustomerId && (
                          <a
                            href={stripeDashboardCustomerUrl(c.stripeCustomerId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-muted hover:underline"
                          >
                            Stripe ↗
                          </a>
                        )}
                      </div>
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
          {total} clinic{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`${base}?${new URLSearchParams({ search, page: String(page - 1) })}`}
              className="rounded-md border border-brand-line px-3 py-1 hover:bg-brand-mist"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`${base}?${new URLSearchParams({ search, page: String(page + 1) })}`}
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
