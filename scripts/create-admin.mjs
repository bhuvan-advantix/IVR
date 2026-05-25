import bcrypt from "bcryptjs";
import { createClient } from "@tursodatabase/serverless/compat";

const required = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key}. Set it in .env.local before running npm run admin:create`);
  }
}

if (process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

await db.execute({
  sql: `INSERT INTO admins (email, password_hash)
        VALUES (?, ?)
        ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`,
  args: [process.env.ADMIN_EMAIL.toLowerCase(), passwordHash],
});

console.log(`Admin user is ready: ${process.env.ADMIN_EMAIL.toLowerCase()}`);
