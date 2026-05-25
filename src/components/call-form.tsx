"use client";

import { useState } from "react";
import { PhoneCall, Send } from "lucide-react";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function CallForm({
  defaultCampaignName,
  defaultFlowUrl,
}: {
  defaultCampaignName: string;
  defaultFlowUrl: string;
}) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function submitCall(formData: FormData) {
    setState({ status: "loading" });

    const response = await fetch("/api/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: formData.get("phone"),
        customerName: formData.get("customerName"),
        campaignName: formData.get("campaignName"),
        flowUrl: formData.get("flowUrl"),
        customField: formData.get("customField"),
      }),
    });

    const result = await response.json().catch(() => ({
      error: "Call API returned an invalid response. Please try again.",
    }));

    if (!response.ok) {
      setState({ status: "error", message: result.error ?? "Call failed." });
      return;
    }

    setState({
      status: "success",
      message: `Call queued${result.callSid ? `: ${result.callSid}` : ""}`,
    });
  }

  return (
    <form action={submitCall} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="phone">
          Customer phone
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="phone"
          name="phone"
          placeholder="+919876543210"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="customerName">
          Customer name
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="customerName"
          name="customerName"
          placeholder="Guest name"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="campaignName">
          Campaign
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={defaultCampaignName}
          id="campaignName"
          name="campaignName"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="flowUrl">
          Exotel app/flow URL
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={defaultFlowUrl}
          id="flowUrl"
          name="flowUrl"
          placeholder="https://my.exotel.com/..."
          type="url"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="customField">
          Tracking field
        </label>
        <input
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          id="customField"
          maxLength={128}
          name="customField"
          placeholder="booking-id or lead-id"
        />
      </div>

      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={state.status === "loading"}
        type="submit"
      >
        {state.status === "loading" ? <PhoneCall className="size-4 animate-pulse" /> : <Send className="size-4" />}
        Queue call
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
