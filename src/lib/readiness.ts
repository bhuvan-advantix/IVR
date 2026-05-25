import { db } from "./db";
import { getServerEnv } from "./env";
import { initDatabase } from "./schema";

export type ReadinessItem = {
  label: string;
  done: boolean;
  detail: string;
};

export type PhaseReadiness = {
  items: ReadinessItem[];
  completed: number;
  total: number;
};

function publicUrl(value: string) {
  return value.startsWith("https://");
}

export async function getPhaseReadiness(publicBaseUrl: string): Promise<PhaseReadiness> {
  await initDatabase();

  const env = getServerEnv();
  const otpRoutes = await db().execute("SELECT COUNT(*) AS count FROM otp_routes WHERE status = 'active'");
  const providers = await db().execute("SELECT COUNT(*) AS count FROM providers WHERE status = 'active'");
  const activeOtpCount = Number(otpRoutes.rows[0]?.count ?? 0);
  const activeProviderCount = Number(providers.rows[0]?.count ?? 0);

  const items: ReadinessItem[] = [
    {
      label: "Exotel account",
      done: Boolean(env.EXOTEL_ACCOUNT_SID && env.EXOTEL_API_KEY && env.EXOTEL_API_TOKEN),
      detail: env.EXOTEL_ACCOUNT_SID ? `Account SID configured: ${env.EXOTEL_ACCOUNT_SID}` : "Missing Exotel credentials",
    },
    {
      label: "Master number",
      done: Boolean(env.EXOTEL_MASTER_NUMBER),
      detail: env.EXOTEL_MASTER_NUMBER || "Add EXOTEL_MASTER_NUMBER",
    },
    {
      label: "Virtual caller number",
      done: Boolean(env.EXOTEL_CALLER_ID),
      detail: env.EXOTEL_CALLER_ID || "Add EXOTEL_CALLER_ID",
    },
    {
      label: "Exotel app/flow",
      done: Boolean(env.EXOTEL_APP_ID && env.EXOTEL_DEFAULT_FLOW_URL),
      detail: env.EXOTEL_APP_ID ? `App ID ${env.EXOTEL_APP_ID}` : "Add EXOTEL_APP_ID and EXOTEL_DEFAULT_FLOW_URL",
    },
    {
      label: "Call recording setting",
      done: env.EXOTEL_CALL_RECORDING_ENABLED,
      detail: env.EXOTEL_CALL_RECORDING_ENABLED ? "Expected on" : "Enable recording in Exotel",
    },
    {
      label: "Provider pool",
      done: activeProviderCount > 0,
      detail: activeProviderCount > 0 ? `${activeProviderCount} active provider(s)` : "Add at least one active provider",
    },
    {
      label: "Automatic OTP logic",
      done: activeOtpCount > 0,
      detail: activeOtpCount > 0 ? `${activeOtpCount} generated OTP route(s)` : "Generate one automatic OTP route",
    },
    {
      label: "Public callback URL",
      done: publicUrl(publicBaseUrl),
      detail: publicUrl(publicBaseUrl)
        ? `${publicBaseUrl}/api/exotel/status`
        : "Use Vercel HTTPS URL before real Exotel callback testing",
    },
  ];

  return {
    items,
    completed: items.filter((item) => item.done).length,
    total: items.length,
  };
}
