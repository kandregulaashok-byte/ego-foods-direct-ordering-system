"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginFormSchema = z.object({
  password: z.string().min(1, "Password is required.")
});

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { password: "" }
  });

  async function submit(values: z.infer<typeof loginFormSchema>) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    if (!res.ok) {
      form.setError("password", { message: "Password was not accepted." });
      return;
    }
    router.push(search.get("next") ?? "/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={form.handleSubmit(submit)} className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Ego Foods Direct</h1>
            <p className="text-sm text-muted-foreground">Restaurant dashboard</p>
          </div>
        </div>
        <Input
          type="password"
          placeholder="Dashboard password"
          {...form.register("password")}
          autoFocus
        />
        {form.formState.errors.password ? (
          <p className="mt-3 text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
        <Button className="mt-4 w-full">Sign in</Button>
      </form>
    </main>
  );
}
