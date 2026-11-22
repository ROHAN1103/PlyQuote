import * as React from "react";
import { cn } from "@/lib/utils";

/** Native <select>: accessible and touch-friendly on phones by default. */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink disabled:opacity-50 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
