import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const allSchema = { ...schema, ...relations };

let _db: BetterSQLite3Database<typeof allSchema> | null = null;

function getDb() {
  if (_db) return _db;

  const DB_PATH = process.env.DATABASE_PATH || "./data/ctrbox.db";

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  _db = drizzle(sqlite, { schema: allSchema });
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof allSchema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
