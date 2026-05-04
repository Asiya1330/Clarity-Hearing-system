import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface BackLinkProps {
  href: string;
  label?: string;
}

export function BackLink({ href, label = "Back" }: BackLinkProps) {
  return (
    <Link
      href={href}
      data-testid="back-link"
      className="inline-flex items-center gap-1 text-sm text-brand-slate transition-colors hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
