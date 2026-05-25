import { db } from "./db";
import { initDatabase } from "./schema";

export type Provider = {
  id: number;
  name: string;
  phone: string;
  locationName: string;
  status: string;
};

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function mapProvider(row: Record<string, unknown>): Provider {
  return {
    id: asNumber(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    locationName: String(row.location_name ?? ""),
    status: String(row.status ?? "inactive"),
  };
}

export async function listProviders() {
  await initDatabase();

  const result = await db().execute(`
    SELECT id, name, phone, location_name, status
    FROM providers
    ORDER BY status = 'active' DESC, priority ASC, name ASC
  `);

  return result.rows.map((row) => mapProvider(row));
}

export async function selectProvider(providerId?: number) {
  await initDatabase();

  const turso = db();
  const result = providerId
    ? await turso.execute({
        sql: `SELECT id, name, phone, location_name, status
              FROM providers
              WHERE id = ? AND status = 'active'
              LIMIT 1`,
        args: [providerId],
      })
    : await turso.execute(`
        SELECT id, name, phone, location_name, status
        FROM providers
        WHERE status = 'active'
        ORDER BY
          last_assigned_at IS NOT NULL ASC,
          datetime(last_assigned_at) ASC,
          priority ASC,
          RANDOM()
        LIMIT 1
      `);

  const provider = result.rows[0] ? mapProvider(result.rows[0]) : null;

  if (provider) {
    await turso.execute({
      sql: "UPDATE providers SET last_assigned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      args: [provider.id],
    });
  }

  return provider;
}
