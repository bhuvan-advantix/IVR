import { z } from "zod";

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  EXOTEL_API_KEY: z.string().min(1),
  EXOTEL_API_TOKEN: z.string().min(1),
  EXOTEL_ACCOUNT_SID: z.string().min(1),
  EXOTEL_SUBDOMAIN: z.string().min(1).default("api.exotel.com"),
  EXOTEL_APP_ID: z.string().optional().default(""),
  EXOTEL_MASTER_NUMBER: z.string().optional().default(""),
  EXOTEL_TRIAL_NUMBER: z.string().optional().default(""),
  EXOTEL_CALLER_ID: z.string().optional().default(""),
  EXOTEL_DEFAULT_FLOW_URL: z.string().optional().default(""),
  EXOTEL_CALL_RECORDING_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(4),
  APP_BASE_URL: z.string().min(1).default("http://localhost:3000"),
  SETUP_SECRET: z.string().min(1).default("change-me"),
  SESSION_SECRET: z.string().min(16).default("change-me-change-me"),
  SESSION_COOKIE_NAME: z.string().min(1).default("atithiseva_session"),
  DEFAULT_CAMPAIGN_NAME: z.string().min(1),
  DEFAULT_CAMPAIGN_DESCRIPTION: z.string().min(1),
});

export function getServerEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }

  return parsed.data;
}
