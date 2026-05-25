import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { lookupOtpRoute, recordOtpLookup } from "@/lib/otp-routes";

export const runtime = "nodejs";

function normalizePayload(entries: Iterable<[string, string]>) {
  const payload: Record<string, string> = {};
  for (const [key, value] of entries) {
    payload[key] = value;
  }
  return payload;
}

function getOtp(payload: Record<string, string>) {
  return payload.otp || payload.OTP || payload.Digits || payload.digits || payload.Input || payload.input || "";
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

function routeXml(route: Awaited<ReturnType<typeof lookupOtpRoute>>) {
  const env = getServerEnv();

  if (!route) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid OTP. Please try again.</Say><Hangup /></Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting you to ${xmlEscape(
    route.providerName,
  )}.</Say><Dial callerId="${xmlEscape(env.EXOTEL_CALLER_ID)}" record="${
    env.EXOTEL_CALL_RECORDING_ENABLED ? "true" : "false"
  }">${xmlEscape(route.providerPhone)}</Dial></Response>`;
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

async function handleLookup(request: NextRequest) {
  const payload = await parseRequest(request);
  const otp = getOtp(payload);
  const route = otp ? await lookupOtpRoute(otp) : null;

  await recordOtpLookup({
    otp,
    callSid: getCallSid(payload),
    status: route ? "matched" : "not_found",
    payload,
  });

  const wantsXml =
    request.nextUrl.searchParams.get("format") === "xml" ||
    (request.headers.get("accept") ?? "").includes("xml");

  if (wantsXml) {
    return new NextResponse(routeXml(route), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }

  return NextResponse.json({
    ok: Boolean(route),
    route,
    error: route ? undefined : "OTP route not found.",
  });
}

export async function GET(request: NextRequest) {
  return handleLookup(request);
}

export async function POST(request: NextRequest) {
  return handleLookup(request);
}
