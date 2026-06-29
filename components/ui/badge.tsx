import type React from "react";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  awaiting_screenshot: "bg-amber-100 text-amber-950 ring-1 ring-amber-300",
  preparing: "bg-sky-100 text-sky-950 ring-1 ring-sky-300",
  ready: "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300",
  completed: "bg-zinc-950 text-white ring-1 ring-zinc-800",
  cancelled: "bg-red-100 text-red-950 ring-1 ring-red-300"
};

export function Badge({ children, status }: { children: React.ReactNode; status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
        status ? statusClasses[status] : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
