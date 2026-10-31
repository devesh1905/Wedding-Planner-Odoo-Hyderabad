"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { api, ApiError } from "@/frontend/lib/api-client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const res = await api<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      // only same-site paths: "//host" and "/\host" would be read as another site
      router.replace(next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : res.role === "FOUNDER" ? "/dashboard" : "/weddings");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@royalknot.in"
          aria-invalid={!!error || undefined}
          className="h-11 md:h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!error || undefined}
          className="h-11 md:h-10"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-sm text-rose">
          {error}
        </p>
      )}
      <Button type="submit" className="squircle h-12 w-full rounded-xl text-base" size="lg" disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="animate-spin" />} {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
