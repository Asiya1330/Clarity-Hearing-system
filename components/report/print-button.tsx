"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="h-12 bg-brand-teal px-5 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
    >
      <Printer className="h-5 w-5" />
      Print or save as PDF
    </Button>
  );
}
