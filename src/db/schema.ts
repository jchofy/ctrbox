import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  dailyVisitTarget: integer("daily_visit_target").notNull().default(10),
  status: text("status", { enum: ["active", "paused", "completed"] })
    .notNull()
    .default("paused"),
  minVisitDuration: integer("min_visit_duration").notNull().default(30),
  maxVisitDuration: integer("max_visit_duration").notNull().default(120),
  minPagesPerVisit: integer("min_pages_per_visit").notNull().default(1),
  maxPagesPerVisit: integer("max_pages_per_visit").notNull().default(4),
  warmupSearches: integer("warmup_searches", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const keywords = sqliteTable("keywords", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  targetUrl: text("target_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  dailyVisitTarget: integer("daily_visit_target").notNull().default(5),
  lastKnownPosition: integer("last_known_position"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const visits = sqliteTable("visits", {
  id: text("id").primaryKey(),
  keywordId: text("keyword_id")
    .notNull()
    .references(() => keywords.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  proxyId: text("proxy_id").references(() => proxies.id, {
    onDelete: "set null",
  }),
  status: text("status", {
    enum: [
      "pending",
      "running",
      "success",
      "failed",
      "captcha",
      "not_found",
      "timeout",
    ],
  })
    .notNull()
    .default("pending"),
  serpPosition: integer("serp_position"),
  pagesVisited: integer("pages_visited").default(0),
  duration: real("duration").default(0),
  userAgent: text("user_agent"),
  viewport: text("viewport"),
  warmupDone: integer("warmup_done", { mode: "boolean" }).default(false),
  error: text("error"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const proxies = sqliteTable("proxies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  protocol: text("protocol", { enum: ["http", "https", "socks5"] })
    .notNull()
    .default("http"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastStatus: text("last_status", {
    enum: ["unknown", "healthy", "unhealthy"],
  })
    .notNull()
    .default("unknown"),
  failCount: integer("fail_count").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  captchaCount: integer("captcha_count").notNull().default(0),
  profilePath: text("profile_path"),
  lastBackoffUntil: text("last_backoff_until"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
});
