import { z } from "zod";
import { db } from "./db";
import { getServerEnv } from "./env";
import { selectProvider } from "./providers";
import { initDatabase } from "./schema";

export type OtpRoute = {
  id: number;
  otp: string;
  providerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  locationName: string;
  providerName: string;
  providerPhone: string;
  status: string;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export const otpRouteInputSchema = z.object({
  otp: z.string().regex(/^\d+$/, "OTP must contain only digits.").optional().or(z.literal("")),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  locationName: z.string().optional(),
  providerId: z.coerce.number().int().positive().optional().or(z.literal("")),
  providerName: z.string().optional(),
  providerPhone: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
  expiresAt: z.string().optional(),
});

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function asString(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

function mapOtpRoute(row: Record<string, unknown>): OtpRoute {
  return {
    id: asNumber(row.id),
    otp: String(row.otp ?? ""),
    providerId: row.provider_id ? asNumber(row.provider_id) : null,
    customerName: asString(row.customer_name),
    customerPhone: asString(row.customer_phone),
    locationName: String(row.location_name ?? ""),
    providerName: String(row.provider_name ?? ""),
    providerPhone: String(row.provider_phone ?? ""),
    status: String(row.status ?? "inactive"),
    notes: asString(row.notes),
    expiresAt: asString(row.expires_at),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listOtpRoutes(limit = 10) {
  await initDatabase();

  const result = await db().execute({
    sql: `SELECT *
          FROM otp_routes
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => mapOtpRoute(row));
}

async function otpExists(otp: string) {
  const result = await db().execute({
    sql: "SELECT 1 FROM otp_routes WHERE otp = ? LIMIT 1",
    args: [otp],
  });

  return result.rows.length > 0;
}

function randomOtp(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export async function generateUniqueOtp() {
  const env = getServerEnv();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const otp = randomOtp(env.OTP_LENGTH);
    if (!(await otpExists(otp))) {
      return otp;
    }
  }

  throw new Error("Could not generate a unique OTP. Try again.");
}

export async function createOtpRoute(input: z.infer<typeof otpRouteInputSchema>) {
  await initDatabase();

  const env = getServerEnv();
  const parsed = otpRouteInputSchema.parse(input);
  const provider =
    parsed.providerId && typeof parsed.providerId === "number"
      ? await selectProvider(parsed.providerId)
      : await selectProvider();
  const otp = parsed.otp || (await generateUniqueOtp());

  if (otp.length !== env.OTP_LENGTH) {
    throw new Error(`OTP must be ${env.OTP_LENGTH} digits.`);
  }

  if (!provider && (!parsed.providerName || !parsed.providerPhone || !parsed.locationName)) {
    throw new Error("Add an active provider or send provider details.");
  }

  const providerName = provider?.name ?? parsed.providerName ?? "";
  const providerPhone = provider?.phone ?? parsed.providerPhone ?? "";
  const locationName = parsed.locationName || provider?.locationName || env.DEFAULT_LOCATION_NAME;

  await db().execute({
    sql: `INSERT INTO otp_routes (
            otp,
            provider_id,
            customer_name,
            customer_phone,
            location_name,
            provider_name,
            provider_phone,
            status,
            notes,
            expires_at,
            generated_by,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(otp) DO UPDATE SET
            provider_id = excluded.provider_id,
            customer_name = excluded.customer_name,
            customer_phone = excluded.customer_phone,
            location_name = excluded.location_name,
            provider_name = excluded.provider_name,
            provider_phone = excluded.provider_phone,
            status = excluded.status,
            notes = excluded.notes,
            expires_at = excluded.expires_at,
            generated_by = excluded.generated_by,
            updated_at = datetime('now')`,
    args: [
      otp,
      provider?.id ?? null,
      parsed.customerName || null,
      parsed.customerPhone || null,
      locationName,
      providerName,
      providerPhone,
      parsed.status,
      parsed.notes || null,
      parsed.expiresAt || null,
      parsed.otp ? "admin" : "system",
    ],
  });

  return lookupOtpRoute(otp);
}

export async function lookupOtpRoute(otp: string) {
  await initDatabase();

  const result = await db().execute({
    sql: `SELECT *
          FROM otp_routes
          WHERE otp = ?
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at = '' OR datetime(expires_at) > datetime('now'))
          LIMIT 1`,
    args: [otp],
  });

  return result.rows[0] ? mapOtpRoute(result.rows[0]) : null;
}

export async function recordOtpLookup(input: {
  otp: string;
  callSid?: string;
  status: "matched" | "not_found";
  payload: Record<string, string>;
}) {
  await initDatabase();

  await db().execute({
    sql: `INSERT INTO call_events (call_sid, event_type, status, payload)
          VALUES (?, ?, ?, ?)`,
    args: [
      input.callSid || null,
      "otp-lookup",
      input.status,
      JSON.stringify({ otp: input.otp, ...input.payload }),
    ],
  });
}
