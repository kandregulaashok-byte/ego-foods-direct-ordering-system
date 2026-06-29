import Link from "next/link";
import type React from "react";
import { BarChart3, ClipboardList, LayoutDashboard, LogOut, Settings, Soup, Users } from "lucide-react";
import { logoutAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/menu", label: "Menu", icon: Soup },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen">
      <aside className="glass-sidebar fixed inset-y-0 left-0 hidden w-64 border-r p-4 md:block">
        <div className="mb-6">
          <p className="text-lg font-semibold">Ego Foods</p>
          <p className="text-sm text-muted-foreground">Direct ordering</p>
        </div>
        <nav className="grid gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-white/55"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="absolute bottom-4 left-4 right-4">
          <Button variant="outline" className="w-full">
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Ego Foods</p>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" aria-label="Sign out">
                <LogOut size={18} />
              </Button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md border bg-white/45 px-3 py-1 text-sm">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
