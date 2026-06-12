import { RisingLine } from "./rising-line";

/**
 * Consistent page header used across the authenticated app.
 * Eyebrow + display title + plain-language subtitle, with a thin
 * rising-line accent under the eyebrow.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal-700">
              {eyebrow}
            </p>
            <RisingLine className="h-3 w-20 opacity-70" />
          </div>
        ) : null}
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-prose text-lg leading-relaxed text-brand-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
