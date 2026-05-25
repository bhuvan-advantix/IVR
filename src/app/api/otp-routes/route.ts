import { NextRequest, NextResponse } from "next/server";
import { getRequestAdmin } from "@/lib/auth";
import { createOtpRoute, listOtpRoutes, otpRouteInputSchema } from "@/lib/otp-routes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getRequestAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const routes = await listOtpRoutes();
  return NextResponse.json({ ok: true, routes });
}

export async function POST(request: NextRequest) {
  const admin = await getRequestAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = otpRouteInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid OTP route.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const route = await createOtpRoute(parsed.data);
    return NextResponse.json({ ok: true, route });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save OTP route." },
      { status: 400 },
    );
  }
}
