import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  const env = getServerEnv();
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", env.APP_BASE_URL), 303);
}
