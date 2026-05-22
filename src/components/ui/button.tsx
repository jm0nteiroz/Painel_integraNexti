import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-brand px-4 py-2 text-slate-950 hover:bg-brand/90",
          variant === "outline" && "border border-slate-600 bg-slate-900/45 px-4 py-2 text-slate-100 hover:border-brand/60 hover:bg-slate-800/80",
          variant === "ghost" && "px-3 py-2 text-slate-100 hover:bg-white/10",
          variant === "danger" && "bg-rose-500/15 px-4 py-2 text-rose-100 ring-1 ring-rose-500/30 hover:bg-rose-500/25",
          size === "sm" && "h-9 px-3 py-1.5 text-xs",
          size === "icon" && "size-9 p-0",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
