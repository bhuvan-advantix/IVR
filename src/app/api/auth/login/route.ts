import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdmin, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email and password." }, { status: 400 });
  }

  const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie(admin);

  return NextResponse.json({ ok: true });
}
