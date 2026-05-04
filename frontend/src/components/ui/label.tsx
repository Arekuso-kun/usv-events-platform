import * as React from "react";
import { cn } from "../../lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium leading-none text-[#192041]", className)}
      {...props}
    />
  );
}

export { Label };
