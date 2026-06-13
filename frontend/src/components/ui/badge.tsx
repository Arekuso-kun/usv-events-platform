import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[rgba(134,193,234,0.22)] text-[#254591]",
        secondary: "bg-[rgba(39,46,83,0.08)] text-[#272E53]",
        info: "bg-[rgba(134,193,234,0.22)] text-[#254591]",
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        neutral: "bg-[rgba(39,46,83,0.08)] text-[#272E53]",
        count: "bg-indigo-50 text-indigo-700",
        outline: "border border-[#d7dfeb] bg-white text-[#192041]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export { Badge };
