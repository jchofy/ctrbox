import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { v4 as uuid } from "uuid";
import * as schema from "../src/db/schema";
import { DEFAULT_SETTINGS } from "../src/lib/constants";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DATABASE_PATH || "./data/ctrbox.db";
const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Seed default settings
  for (const [key, { value, description }] of Object.entries(DEFAULT_SETTINGS)) {
    await db
      .insert(schema.settings)
      .values({ key, value, description })
      .onConflictDoNothing();
  }
  console.log(`  ✓ Settings seeded (${Object.keys(DEFAULT_SETTINGS).length} keys)`);

  // Seed example campaign
  const campaignId = uuid();
  await db.insert(schema.campaigns).values({
    id: campaignId,
    name: "Ejemplo - Mi Web",
    domain: "ejemplo.com",
    dailyVisitTarget: 20,
    status: "paused",
    minVisitDuration: 30,
    maxVisitDuration: 90,
    minPagesPerVisit: 1,
    maxPagesPerVisit: 3,
    warmupSearches: true,
  });
  console.log("  ✓ Example campaign created");

  // Seed example keywords
  const kw1Id = uuid();
  const kw2Id = uuid();
  await db.insert(schema.keywords).values([
    {
      id: kw1Id,
      campaignId,
      keyword: "mejor herramienta seo",
      targetUrl: "https://ejemplo.com/herramienta-seo",
      dailyVisitTarget: 10,
    },
    {
      id: kw2Id,
      campaignId,
      keyword: "consultoria seo españa",
      targetUrl: "https://ejemplo.com/consultoria",
      dailyVisitTarget: 10,
    },
  ]);
  console.log("  ✓ Example keywords created");

  // Seed example proxy
  const proxyId = uuid();
  await db.insert(schema.proxies).values({
    id: proxyId,
    name: "Proxy Ejemplo",
    host: "proxy.ejemplo.com",
    port: 8080,
    username: "user",
    password: "pass",
    protocol: "http",
    isActive: false,
    profilePath: `data/profiles/${proxyId}`,
  });
  console.log("  ✓ Example proxy created");

  console.log("\nSeed completed!");
  sqlite.close();
}

seed().catch(console.error);
