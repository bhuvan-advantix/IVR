import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { getServerEnv } from "./env";
import { initDatabase } from "./schema";

export type AdminSession = {
  id: number;
  email: string;
};

const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(getServerEnv().SESSION_SECRET);
}

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function createSession(admin: AdminSession) {
  return new SignJWT({ email: admin.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifySession(token?: string): Promise<AdminSession | null> {
  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify(token, getSecret());
    const id = Number(result.payload.sub);
    const email = typeof result.payload.email === "string" ? result.payload.email : "";

    if (!id || !email) {
      return null;
    }

    return { id, email };
  } catch {
    return null;
  }
}

export async function getCurrentAdmin() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}

export async function getRequestAdmin(request: NextRequest) {
  const env = getServerEnv();
  return verifySession(request.cookies.get(env.SESSION_COOKIE_NAME)?.value);
}

export async function authenticateAdmin(email: string, password: string) {
  const result = await db()
    .execute({
      sql: "SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1",
      args: [email.toLowerCase()],
    })
    .catch(async () => {
      await initDatabase();
      return db().execute({
        sql: "SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1",
        args: [email.toLowerCase()],
      });
    });

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const ok = await bcrypt.compare(password, asString(row.password_hash));
  if (!ok) {
    return null;
  }

  return {
    id: asNumber(row.id),
    email: asString(row.email),
  };
}

export async function setSessionCookie(admin: AdminSession) {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = await createSession(admin);

  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  cookieStore.set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
