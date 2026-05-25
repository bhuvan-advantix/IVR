import { createClient } from "@tursodatabase/serverless/compat";

const required = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "DEFAULT_CAMPAIGN_NAME",
  "DEFAULT_CAMPAIGN_DESCRIPTION",
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key}. Run with: node --env-file=.env.local scripts/init-db.mjs`);
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const schema = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT NOT NULL UNIQUE,
    language TEXT DEFAULT 'en',
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_sid TEXT UNIQUE,
    customer_id INTEGER,
    campaign_id INTEGER,
    from_number TEXT NOT NULL,
    caller_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    direction TEXT NOT NULL DEFAULT 'outbound',
    custom_field TEXT,
    recording_url TEXT,
    raw_response TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  )`,
  `CREATE TABLE IF NOT EXISTS call_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_sid TEXT,
    event_type TEXT NOT NULL,
    status TEXT,
    payload TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS otp_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    otp TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    customer_phone TEXT,
    location_name TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_calls_call_sid ON calls(call_sid)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_call_events_call_sid ON call_events(call_sid)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_routes_otp ON otp_routes(otp)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_routes_status ON otp_routes(status)`,
];

for (const statement of schema) {
  await db.execute(statement);
}

await db.execute({
  sql: `INSERT OR IGNORE INTO campaigns (name, description, status)
        VALUES (?, ?, ?)`,
  args: [process.env.DEFAULT_CAMPAIGN_NAME, process.env.DEFAULT_CAMPAIGN_DESCRIPTION, "active"],
});

console.log("Turso schema is ready.");
