import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 disabled:opacity-50 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
