"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";

type LoginState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({ status: "idle" });

  async function submitLogin(formData: FormData) {
    setState({ status: "loading" });

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({ status: "error", message: result.error ?? "Login failed." });
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form action={submitLogin} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={state.status === "loading"}
        type="submit"
      >
        <LogIn className="size-4" />
        {state.status === "loading" ? "Signing in" : "Sign in"}
      </button>

      {state.status === "error" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
