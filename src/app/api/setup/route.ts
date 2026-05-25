import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { initDatabase } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const secret = request.headers.get("x-setup-secret");

  if (secret !== env.SETUP_SECRET) {
    return NextResponse.json({ ok: false, error: "Invalid setup secret." }, { status: 401 });
  }

  await initDatabase();

  return NextResponse.json({ ok: true, message: "Database schema is ready." });
}
