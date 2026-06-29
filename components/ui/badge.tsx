import type React from "react";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  awaiting_screenshot: "bg-amber-200 text-amber-950 shadow-amber-900/10",
  preparing: "bg-cyan-200 text-cyan-950 shadow-cyan-900/10",
  ready: "bg-emerald-200 text-emerald-950 shadow-emerald-900/10",
  completed: "bg-zinc-900 text-white shadow-zinc-900/15",
  cancelled: "bg-rose-200 text-rose-950 shadow-rose-900/10"
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
