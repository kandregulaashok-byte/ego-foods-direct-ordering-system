import type React from "react";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  awaiting_screenshot: "bg-amber-100 text-amber-900",
  preparing: "bg-sky-100 text-sky-900",
  ready: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-800",
  cancelled: "bg-red-100 text-red-900"
};

export function Badge({ children, status }: { children: React.ReactNode; status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium",
        status ? statusClasses[status] : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
