import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeIndianPhoneForE164 } from "@/lib/phone";
import { selectProvider } from "@/lib/providers";
import { initDatabase } from "@/lib/schema";

export const runtime = "nodejs";

function normalizePayload(entries: Iterable<[string, string]>) {
  const payload: Record<string, string> = {};
  for (const [key, value] of entries) {
    payload[key] = value;
  }
  return payload;
}

function getCallSid(payload: Record<string, string>) {
  return payload.CallSid || payload.Sid || payload.call_sid || payload.sid || "";
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function parseRequest(request: NextRequest) {
  if (request.method === "GET") {
    return normalizePayload(request.nextUrl.searchParams.entries());
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return Object.fromEntries(
      Object.entries(body as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]),
    );
  }

  const formData = await request.formData();
  return normalizePayload(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
}

function xmlResponse(body: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

function connectXml(number: string) {
  return `<Connect><Number>${xmlEscape(number)}</Number></Connect>`;
}

async function handleAutoRoute(request: NextRequest) {
  await initDatabase();

  const payload = await parseRequest(request);
  const provider = await selectProvider();

  await db().execute({
    sql: `INSERT INTO call_events (call_sid, event_type, status, payload)
          VALUES (?, ?, ?, ?)`,
    args: [
      getCallSid(payload) || null,
      "auto-route",
      provider ? "matched" : "no_provider",
      JSON.stringify({ providerId: provider?.id ?? null, ...payload }),
    ],
  });

  const wantsXml =
    request.nextUrl.searchParams.get("format") === "xml" ||
    (request.headers.get("accept") ?? "").includes("xml");

  if (wantsXml) {
    if (!provider) {
      return xmlResponse("<Response><Say>No provider is available right now. Please try again later.</Say><Hangup /></Response>");
    }

    return xmlResponse(`<Response><Say>Connecting you now.</Say>${connectXml(normalizeIndianPhoneForE164(provider.phone))}</Response>`);
  }

  return NextResponse.json({
    ok: Boolean(provider),
    provider,
    error: provider ? undefined : "No active provider available.",
  });
}

export async function GET(request: NextRequest) {
  return handleAutoRoute(request);
}

export async function POST(request: NextRequest) {
  return handleAutoRoute(request);
}
