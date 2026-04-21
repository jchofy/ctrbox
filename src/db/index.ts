import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { randomUUID } from "crypto";

const allSchema = { ...schema, ...relations };

let _db: BetterSQLite3Database<typeof allSchema> | null = null;

function createTables(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      daily_visit_target INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'paused',
      min_visit_duration INTEGER NOT NULL DEFAULT 30,
      max_visit_duration INTEGER NOT NULL DEFAULT 120,
      min_pages_per_visit INTEGER NOT NULL DEFAULT 1,
      max_pages_per_visit INTEGER NOT NULL DEFAULT 4,
      warmup_searches INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      target_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      daily_visit_target INTEGER NOT NULL DEFAULT 5,
      last_known_position INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      keyword_id TEXT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      proxy_id TEXT REFERENCES proxies(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      serp_position INTEGER,
      pages_visited INTEGER DEFAULT 0,
      duration REAL DEFAULT 0,
      user_agent TEXT,
      viewport TEXT,
      warmup_done INTEGER DEFAULT 0,
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      protocol TEXT NOT NULL DEFAULT 'http',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_status TEXT NOT NULL DEFAULT 'unknown',
      fail_count INTEGER NOT NULL DEFAULT 0,
      total_used INTEGER NOT NULL DEFAULT 0,
      captcha_count INTEGER NOT NULL DEFAULT 0,
      profile_path TEXT,
      last_backoff_until TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );
  `);
}

function seedSettings(db: BetterSQLite3Database<typeof allSchema>) {
  for (const [key, { value, description }] of Object.entries(DEFAULT_SETTINGS)) {
    db.insert(schema.settings)
      .values({ key, value, description })
      .onConflictDoNothing()
      .run();
  }
}

function seedDomainsFromCampaigns(db: BetterSQLite3Database<typeof allSchema>) {
  const rows = db
    .selectDistinct({ domain: schema.campaigns.domain })
    .from(schema.campaigns)
    .all();
  for (const row of rows) {
    db.insert(schema.domains)
      .values({ id: randomUUID(), domain: row.domain, createdAt: new Date().toISOString() })
      .onConflictDoNothing()
      .run();
  }
}

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

  // Auto-create tables if they don't exist
  createTables(sqlite);

  _db = drizzle(sqlite, { schema: allSchema });

  // Seed default settings
  seedSettings(_db);

  // Seed domains from existing campaigns
  seedDomainsFromCampaigns(_db);

  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof allSchema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
