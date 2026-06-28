"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Ego Foods Direct</h1>
            <p className="text-sm text-muted-foreground">Restaurant dashboard</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Open dashboard
        </Button>
      </div>
    </main>
  );
}
