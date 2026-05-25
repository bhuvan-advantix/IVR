import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { connectExotelCall, normalizeExotelFlowUrl } from "@/lib/exotel";
import { initDatabase } from "@/lib/schema";
import { getRequestAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const createCallSchema = z
  .object({
    phone: z.string().min(8),
    customerName: z.string().optional(),
    campaignName: z.string().optional(),
    flowUrl: z.string().url().optional().or(z.literal("")),
    to: z.string().optional(),
    customField: z.string().max(128).optional(),
  });

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function getPublicBaseUrl(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return getServerEnv().APP_BASE_URL.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getRequestAdmin(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    const parsed = createCallSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid call request.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    if (!env.EXOTEL_CALLER_ID) {
      return NextResponse.json(
        { ok: false, error: "Set EXOTEL_CALLER_ID before placing real Exotel calls." },
        { status: 400 },
      );
    }

    await initDatabase();

    const turso = db();
    const data = {
      ...parsed.data,
      campaignName: parsed.data.campaignName || env.DEFAULT_CAMPAIGN_NAME,
      flowUrl: normalizeExotelFlowUrl(parsed.data.flowUrl || env.EXOTEL_DEFAULT_FLOW_URL),
    };

    if (!data.flowUrl && !data.to) {
      return NextResponse.json(
        { ok: false, error: "Set an Exotel flow URL or destination number before queueing a call." },
        { status: 400 },
      );
    }

    await turso.execute({
      sql: `INSERT OR IGNORE INTO customers (name, phone) VALUES (?, ?)`,
      args: [data.customerName ?? null, data.phone],
    });

    if (data.customerName) {
      await turso.execute({
        sql: `UPDATE customers SET name = ? WHERE phone = ?`,
        args: [data.customerName, data.phone],
      });
    }

    await turso.execute({
      sql: `INSERT OR IGNORE INTO campaigns (name, description, status) VALUES (?, ?, ?)`,
      args: [data.campaignName, env.DEFAULT_CAMPAIGN_DESCRIPTION, "active"],
    });

    const customer = await turso.execute({
      sql: `SELECT id FROM customers WHERE phone = ? LIMIT 1`,
      args: [data.phone],
    });
    const campaign = await turso.execute({
      sql: `SELECT id FROM campaigns WHERE name = ? LIMIT 1`,
      args: [data.campaignName],
    });

    const statusCallback = `${getPublicBaseUrl(request)}/api/exotel/status`;
    const exotel = await connectExotelCall({
      from: data.phone,
      callerId: env.EXOTEL_CALLER_ID,
      flowUrl: data.flowUrl || undefined,
      to: data.to,
      customField: data.customField,
      statusCallback,
    });

    await turso.execute({
      sql: `INSERT INTO calls (
              call_sid,
              customer_id,
              campaign_id,
              from_number,
              caller_id,
              status,
              custom_field,
              raw_response
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        exotel.callSid ?? null,
        asNumber(customer.rows[0]?.id),
        asNumber(campaign.rows[0]?.id),
        data.phone,
        env.EXOTEL_CALLER_ID,
        exotel.status ?? "queued",
        data.customField ?? null,
        JSON.stringify(exotel.raw),
      ],
    });

    return NextResponse.json({
      ok: true,
      callSid: exotel.callSid,
      status: exotel.status ?? "queued",
      flowUrl: data.flowUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not queue call.",
      },
      { status: 502 },
    );
  }
}
