"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="bg-brand-teal text-brand-white hover:bg-brand-teal/90 h-11 px-5"
    >
      <Printer className="h-4 w-4" />
      Print or save as PDF
    </Button>
  );
}
