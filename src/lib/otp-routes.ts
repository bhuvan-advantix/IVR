import { z } from "zod";
import { db } from "./db";
import { getServerEnv } from "./env";
import { initDatabase } from "./schema";

export type OtpRoute = {
  id: number;
  otp: string;
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
  otp: z.string().regex(/^\d+$/, "OTP must contain only digits."),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  locationName: z.string().min(1),
  providerName: z.string().min(1),
  providerPhone: z.string().min(8),
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

export async function createOtpRoute(input: z.infer<typeof otpRouteInputSchema>) {
  await initDatabase();

  const env = getServerEnv();
  const parsed = otpRouteInputSchema.parse(input);

  if (parsed.otp.length !== env.OTP_LENGTH) {
    throw new Error(`OTP must be ${env.OTP_LENGTH} digits.`);
  }

  await db().execute({
    sql: `INSERT INTO otp_routes (
            otp,
            customer_name,
            customer_phone,
            location_name,
            provider_name,
            provider_phone,
            status,
            notes,
            expires_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(otp) DO UPDATE SET
            customer_name = excluded.customer_name,
            customer_phone = excluded.customer_phone,
            location_name = excluded.location_name,
            provider_name = excluded.provider_name,
            provider_phone = excluded.provider_phone,
            status = excluded.status,
            notes = excluded.notes,
            expires_at = excluded.expires_at,
            updated_at = datetime('now')`,
    args: [
      parsed.otp,
      parsed.customerName || null,
      parsed.customerPhone || null,
      parsed.locationName,
      parsed.providerName,
      parsed.providerPhone,
      parsed.status,
      parsed.notes || null,
      parsed.expiresAt || null,
    ],
  });

  return lookupOtpRoute(parsed.otp);
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
