import { db } from "./db";
import { initDatabase } from "./schema";

export type RecentCall = {
  id: number;
  callSid: string | null;
  customerName: string | null;
  fromNumber: string;
  status: string;
  createdAt: string;
};

export type DashboardData = {
  totals: {
    calls: number;
    customers: number;
    completed: number;
    failed: number;
  };
  recentCalls: RecentCall[];
  error?: string;
};

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    await initDatabase();

    const turso = db();
    const [calls, customers, completed, failed, recentCalls] = await Promise.all([
      turso.execute("SELECT COUNT(*) AS count FROM calls"),
      turso.execute("SELECT COUNT(*) AS count FROM customers"),
      turso.execute("SELECT COUNT(*) AS count FROM calls WHERE status = 'completed'"),
      turso.execute("SELECT COUNT(*) AS count FROM calls WHERE status IN ('failed', 'busy', 'no-answer')"),
      turso.execute(`
        SELECT
          calls.id,
          calls.call_sid,
          customers.name AS customer_name,
          calls.from_number,
          calls.status,
          calls.created_at
        FROM calls
        LEFT JOIN customers ON customers.id = calls.customer_id
        ORDER BY calls.created_at DESC
        LIMIT 8
      `),
    ]);

    return {
      totals: {
        calls: asNumber(calls.rows[0]?.count),
        customers: asNumber(customers.rows[0]?.count),
        completed: asNumber(completed.rows[0]?.count),
        failed: asNumber(failed.rows[0]?.count),
      },
      recentCalls: recentCalls.rows.map((row) => ({
        id: asNumber(row.id),
        callSid: asString(row.call_sid),
        customerName: asString(row.customer_name),
        fromNumber: String(row.from_number ?? ""),
        status: String(row.status ?? "unknown"),
        createdAt: String(row.created_at ?? ""),
      })),
    };
  } catch (error) {
    return {
      totals: {
        calls: 0,
        customers: 0,
        completed: 0,
        failed: 0,
      },
      recentCalls: [],
      error: error instanceof Error ? error.message : "Dashboard failed to load.",
    };
  }
}
