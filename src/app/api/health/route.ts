import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  await db().execute("SELECT 1 AS ok");

  return NextResponse.json({
    ok: true,
    database: "connected",
    latencyMs: Date.now() - startedAt,
  });
}
