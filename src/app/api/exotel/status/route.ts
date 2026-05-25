import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

function getStatus(payload: Record<string, string>) {
  return payload.CallStatus || payload.Status || payload.status || "";
}

async function saveCallback(payload: Record<string, string>, eventType: string) {
  await initDatabase();

  const callSid = getCallSid(payload);
  const status = getStatus(payload);
  const turso = db();

  await turso.execute({
    sql: `INSERT INTO call_events (call_sid, event_type, status, payload)
          VALUES (?, ?, ?, ?)`,
    args: [callSid || null, eventType, status || null, JSON.stringify(payload)],
  });

  if (callSid) {
    await turso.execute({
      sql: `UPDATE calls
            SET status = COALESCE(NULLIF(?, ''), status),
                recording_url = COALESCE(NULLIF(?, ''), recording_url),
                updated_at = datetime('now')
            WHERE call_sid = ?`,
      args: [status, payload.RecordingUrl || payload.RecordingURL || "", callSid],
    });
  }
}

export async function GET(request: NextRequest) {
  const payload = normalizePayload(request.nextUrl.searchParams.entries());
  await saveCallback(payload, "get-callback");
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: Record<string, string>;

  if (contentType.includes("application/json")) {
    payload = await request.json();
  } else {
    const formData = await request.formData();
    payload = normalizePayload(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    );
  }

  await saveCallback(payload, "post-callback");
  return NextResponse.json({ ok: true });
}
