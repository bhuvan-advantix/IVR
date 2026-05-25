import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lookupOtpRoute } from "@/lib/otp-routes";
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

function getOtp(payload: Record<string, string>) {
  const rawOtp = payload.otp || payload.OTP || payload.Digits || payload.digits || payload.Input || payload.input || "";
  const otp = rawOtp.replace(/\D/g, "");
  return otp.length >= 4 ? otp : "";
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

function dialXml(number: string) {
  return `<Dial>${xmlEscape(number)}</Dial>`;
}

function isExotelConnectRequest(payload: Record<string, string>) {
  return Boolean(
    payload.CallSid ||
      payload.CallFrom ||
      payload.CallTo ||
      payload.DialCallStatus ||
      payload.DialWhomNumber ||
      payload.Direction,
  );
}

function textResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function connectResponse(number: string) {
  return NextResponse.json({
    fetch_after_attempt: false,
    destination: {
      numbers: [number],
    },
    record: true,
    recording_channels: "dual",
    max_ringing_duration: 45,
    max_conversation_duration: 3600,
  });
}

async function handleAutoRoute(request: NextRequest) {
  await initDatabase();

  const payload = await parseRequest(request);
  const otp = getOtp(payload);
  const otpRoute = otp ? await lookupOtpRoute(otp) : null;
  const provider = otp ? null : await selectProvider();
  const destinationPhone = otpRoute?.providerPhone ?? provider?.phone ?? "";

  await db().execute({
    sql: `INSERT INTO call_events (call_sid, event_type, status, payload)
          VALUES (?, ?, ?, ?)`,
    args: [
      getCallSid(payload) || null,
      "auto-route",
      destinationPhone ? (otp ? "matched_otp" : "matched") : otp ? "otp_not_found" : "no_provider",
      JSON.stringify({ otp, otpRouteId: otpRoute?.id ?? null, providerId: provider?.id ?? null, ...payload }),
    ],
  });

  const wantsXml =
    request.nextUrl.searchParams.get("format") === "xml" ||
    (request.headers.get("accept") ?? "").includes("xml");
  const wantsText = request.nextUrl.searchParams.get("format") === "text";
  const wantsConnect = request.nextUrl.searchParams.get("format") === "connect" || isExotelConnectRequest(payload);

  if (wantsXml) {
    if (!destinationPhone) {
      const message = otp ? "Invalid OTP. Please try again." : "No provider is available right now. Please try again later.";
      return xmlResponse(`<Response><Say>${xmlEscape(message)}</Say><Hangup /></Response>`);
    }

    return xmlResponse(`<Response>${dialXml(normalizeIndianPhoneForE164(destinationPhone))}</Response>`);
  }

  if (wantsText || wantsConnect) {
    if (!destinationPhone) {
      return textResponse(otp ? "OTP route not found." : "No active provider available.", 404);
    }

    const number = normalizeIndianPhoneForE164(destinationPhone);
    return wantsConnect ? connectResponse(number) : textResponse(number);
  }

  return NextResponse.json({
    ok: Boolean(destinationPhone),
    route: otpRoute,
    provider,
    error: destinationPhone ? undefined : otp ? "OTP route not found." : "No active provider available.",
  });
}

export async function GET(request: NextRequest) {
  return handleAutoRoute(request);
}

export async function POST(request: NextRequest) {
  return handleAutoRoute(request);
}
