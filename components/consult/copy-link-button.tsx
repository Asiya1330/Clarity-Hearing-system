"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Selection fallback is the visible URL text above the button.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copy}
      data-testid="copy-intake-link"
      className="h-11 border-brand-teal/40 px-4 text-sm font-medium text-brand-teal-700 hover:bg-brand-tint"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
