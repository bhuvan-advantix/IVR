"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Shuffle } from "lucide-react";
import type { Provider } from "@/lib/providers";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function OtpRouteForm({
  otpLength,
  providers,
}: {
  otpLength: number;
  providers: Provider[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function submitRoute(formData: FormData) {
    setState({ status: "loading" });

    const response = await fetch("/api/otp-routes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: formData.get("customerName"),
        customerPhone: formData.get("customerPhone"),
        locationName: formData.get("locationName"),
        providerId: formData.get("providerId") || undefined,
        status: formData.get("status"),
        notes: formData.get("notes"),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({ status: "error", message: result.error ?? "Could not save OTP route." });
      return;
    }

    setState({
      status: "success",
      message: `Automatic OTP generated: ${result.route?.otp ?? "saved"}`,
    });
    router.refresh();
  }

  return (
    <form action={submitRoute} className="grid gap-4">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        The system generates a unique {otpLength}-digit OTP automatically.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="customerName">
            Customer
          </label>
          <input
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="customerName"
            name="customerName"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="customerPhone">
            Customer phone
          </label>
          <input
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="customerPhone"
            name="customerPhone"
            placeholder="+91..."
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="locationName">
          Location
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="locationName"
          name="locationName"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="providerId">
          Provider assignment
        </label>
        <select
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="providerId"
          name="providerId"
        >
          <option value="">Auto-select active provider</option>
          {providers
            .filter((provider) => provider.status === "active")
            .map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.locationName}
              </option>
            ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="status">
          Status
        </label>
        <select
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue="active"
          id="status"
          name="status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="notes">
          Notes
        </label>
        <textarea
          className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="notes"
          name="notes"
        />
      </div>

      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={state.status === "loading"}
        type="submit"
      >
        {state.status === "loading" ? <KeyRound className="size-4 animate-pulse" /> : <Shuffle className="size-4" />}
        Generate route
      </button>

      {state.status === "success" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
