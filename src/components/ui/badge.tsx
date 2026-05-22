import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-brand/30 bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand",
        className,
      )}
      {...props}
    />
  );
}
