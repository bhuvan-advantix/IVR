import { Activity, AlertTriangle, CheckCircle2, Circle, Database, KeyRound, PhoneCall, Shuffle, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { CallForm } from "@/components/call-form";
import { OtpRouteForm } from "@/components/otp-route-form";
import { getCurrentAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { getServerEnv } from "@/lib/env";
import { listOtpRoutes } from "@/lib/otp-routes";
import { listProviders } from "@/lib/providers";
import { getPhaseReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  busy: "bg-amber-50 text-amber-800 ring-amber-200",
  "no-answer": "bg-amber-50 text-amber-800 ring-amber-200",
  queued: "bg-blue-50 text-blue-700 ring-blue-200",
  "in-progress": "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function Home() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  const env = getServerEnv();
  const [data, readiness, otpRoutes, providers] = await Promise.all([
    getDashboardData(),
    getPhaseReadiness(),
    listOtpRoutes(6),
    listProviders(),
  ]);
  const callbackUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/exotel/status`;
  const otpLookupUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/ivr/otp-lookup`;
  const autoRouteUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/ivr/auto-route?format=xml`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Atithiseva IVR</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">Phase 1 demo command center</h1>
            <p className="mt-1 text-sm text-slate-600">{admin.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <Database className="size-4" />
              Turso connected
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Sign out
              </button>
            </form>
          </div>
          </div>
          <div className="mt-5 grid gap-3 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 md:grid-cols-2">
            <p className="break-all">Press-1 auto route: {autoRouteUrl}</p>
            <p className="break-all">OTP lookup route: {otpLookupUrl}?format=xml</p>
          </div>
        </header>

        {data.error ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{data.error}</span>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total calls" value={data.totals.calls} icon={<PhoneCall className="size-4" />} />
          <StatCard label="Customers" value={data.totals.customers} icon={<Users className="size-4" />} />
          <StatCard label="Completed" value={data.totals.completed} icon={<CheckCircle2 className="size-4" />} />
          <StatCard label="Needs review" value={data.totals.failed} icon={<Activity className="size-4" />} />
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Phase 1 readiness</h2>
              <p className="text-sm text-slate-600">
                {readiness.completed} of {readiness.total} setup checks ready
              </p>
            </div>
            <div className="max-w-full break-all rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              OTP webhook: {otpLookupUrl}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readiness.items.map((item) => (
              <div className="rounded-md border border-slate-200 p-3" key={item.label}>
                <div className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 text-amber-500" />
                  )}
                  <p className="font-medium text-slate-900">{item.label}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p className="break-all">Exotel status callback: {callbackUrl}</p>
            <p>Recording expected: {env.EXOTEL_CALL_RECORDING_ENABLED ? "enabled" : "disabled"}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Queue test call</h2>
            </div>
            <CallForm defaultCampaignName={env.DEFAULT_CAMPAIGN_NAME} defaultFlowUrl={env.EXOTEL_DEFAULT_FLOW_URL} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Recent calls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentCalls.length ? (
                    data.recentCalls.map((call) => (
                      <tr key={call.id}>
                        <td className="px-5 py-4 font-medium text-slate-900">{call.customerName ?? "Guest"}</td>
                        <td className="px-5 py-4 text-slate-600">{call.fromNumber}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                              statusStyles[call.status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
                            }`}
                          >
                            {call.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{call.createdAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-5 py-10 text-center text-slate-500" colSpan={4}>
                        No calls queued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Prepare OTP mapping</h2>
            </div>
            <OtpRouteForm otpLength={env.OTP_LENGTH} providers={providers} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <KeyRound className="size-4 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-950">OTP routes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">OTP</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Location</th>
                    <th className="px-5 py-3 font-semibold">Provider</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otpRoutes.length ? (
                    otpRoutes.map((route) => (
                      <tr key={route.id}>
                        <td className="px-5 py-4 font-semibold text-slate-900">{route.otp}</td>
                        <td className="px-5 py-4 text-slate-600">{route.customerName ?? route.customerPhone ?? "Guest"}</td>
                        <td className="px-5 py-4 text-slate-600">{route.locationName}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {route.providerName}
                          <span className="block text-xs text-slate-500">{route.providerPhone}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                              route.status === "active"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-100 text-slate-700 ring-slate-200"
                            }`}
                          >
                            {route.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-5 py-10 text-center text-slate-500" colSpan={5}>
                        No OTP routes prepared yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Shuffle className="size-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-950">Provider pool</h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
            {providers.length ? (
              providers.map((provider) => (
                <div className="rounded-md border border-slate-200 p-4" key={provider.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{provider.name}</p>
                      <p className="text-sm text-slate-600">{provider.locationName}</p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        provider.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {provider.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{provider.phone}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No providers configured.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
