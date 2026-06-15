import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Age-friendly sizing and an accessible focus ring are intentional:
// OViz serves older patients and clinicians. The visible focus outline is
// defined globally in globals.css (3px teal); variants here must NOT suppress
// it with `outline-none`. Text-bearing teal fills hover into brand-teal-700
// (6.5:1 on white) so labels stay legible on interaction.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-teal text-brand-white shadow-sm hover:bg-brand-teal-700",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-brand-line bg-brand-white text-brand-navy shadow-sm hover:border-brand-teal hover:bg-brand-mist hover:text-brand-teal-700",
        secondary:
          "bg-brand-navy text-brand-white shadow-sm hover:bg-brand-ink",
        ghost: "text-brand-navy hover:bg-brand-mist hover:text-brand-teal-700",
        link: "text-brand-teal-700 underline-offset-4 hover:underline",
      },
      size: {
        // Comfortable, touch-friendly defaults (>=44px) for an older audience.
        default: "h-11 px-5 text-base [&_svg]:size-5",
        sm: "h-9 rounded-md px-3 text-sm [&_svg]:size-4",
        lg: "h-14 px-8 text-lg [&_svg]:size-5",
        icon: "h-11 w-11 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
