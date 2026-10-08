"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { routeByRole } from "@/lib/roleRouting";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";

const DEMO_ACCOUNTS = [
  {
    role: "OPERATOR",
    label: "Control Room Operator",
    email: "operator@gov.in",
    password: "Password123!",
    badge: "Dispatches & Live Map",
    tone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    role: "FIELD_TEAM",
    label: "Field Rescue Team",
    email: "fieldteam@gov.in",
    password: "Password123!",
    badge: "Missions & On-scene RT-001",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  {
    role: "SHELTER_MANAGER",
    label: "Shelter Manager",
    email: "shelter@gov.in",
    password: "Password123!",
    badge: "Occupancy & Stock",
    tone: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  {
    role: "CITIZEN",
    label: "Resident Citizen",
    email: "citizen@gmail.com",
    password: "Password123!",
    badge: "Reports & Warnings",
    tone: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function performLogin(targetEmail: string, targetPass: string) {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPass,
      });

      if (error) {
        setError(
          error.message.includes("Invalid login credentials")
            ? "Wrong email or password — please try again"
            : error.message.includes("Email not confirmed")
              ? "Your email isn't confirmed yet — check your inbox for the verification link"
              : error.message
        );
        setLoading(false);
        return;
      }

      const dest = await routeByRole();
      router.push(dest);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  function handleDemoSelect(acc: (typeof DEMO_ACCOUNTS)[0]) {
    setEmail(acc.email);
    setPassword(acc.password);
    void performLogin(acc.email, acc.password);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={36} />
            <span className="text-sm font-bold tracking-tight">RakshaSetu</span>
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">
            Log in to your operational console or choose a 1-click demo role below
          </p>
        </div>

        {/* 1-Click Demo Logins */}
        <section aria-label="1-Click Demo Access" className="mb-6 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Quick 1-Click Demo Access
            </span>
            <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Ready to test
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                disabled={loading}
                onClick={() => handleDemoSelect(acc)}
                className={`flex flex-col text-left rounded-xl border p-3 transition-all active:scale-[0.98] ${acc.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{acc.label}</span>
                  <span className="text-[10px] font-mono opacity-80">→</span>
                </div>
                <span className="mt-0.5 text-[11px] opacity-90">{acc.badge}</span>
                <span className="mt-1 text-[10px] font-mono opacity-70 truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Standard Login Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="operator@gov.in or your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-[var(--color-primary)]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted">
            Need a citizen account?{" "}
            <Link href="/register" className="font-medium text-[var(--color-accent)]">
              Register here
            </Link>
          </p>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          In an emergency and can&apos;t log in?{" "}
          <Link href="/report" className="font-semibold underline">
            Report without an account
          </Link>
        </p>
      </main>
    </div>
  );
}
