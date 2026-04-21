/**
 * Manual test script for a single visit.
 * Usage: npx tsx scripts/test-visit.ts
 *
 * Set BROWSER_HEADLESS=false to watch the visit happen visually.
 */

import { executeVisit } from "../src/worker/visit-engine";
import { db, schema } from "../src/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

async function main() {
  console.log("🔍 CTRBox Visit Test");
  console.log("====================\n");

  // Get first active campaign with keywords
  const campaign = await db.query.campaigns.findFirst({
    with: { keywords: true },
  });

  if (!campaign) {
    console.error("❌ No campaigns found. Run: npm run db:seed");
    process.exit(1);
  }

  const keyword = campaign.keywords[0];
  if (!keyword) {
    console.error("❌ No keywords found for campaign:", campaign.name);
    process.exit(1);
  }

  // Get first active proxy
  const proxy = await db.query.proxies.findFirst({
    where: eq(schema.proxies.isActive, true),
  });

  console.log(`Campaign: ${campaign.name}`);
  console.log(`Domain: ${campaign.domain}`);
  console.log(`Keyword: ${keyword.keyword}`);
  console.log(`Target URL: ${keyword.targetUrl}`);
  console.log(
    `Proxy: ${proxy ? `${proxy.host}:${proxy.port}` : "No proxy (direct)"}`
  );
  console.log(
    `Headless: ${process.env.BROWSER_HEADLESS !== "false" ? "yes" : "no"}\n`
  );

  const proxyConfig = proxy
    ? {
        id: proxy.id,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password,
        protocol: proxy.protocol as "http" | "https" | "socks5",
        profilePath: proxy.profilePath || `data/profiles/${proxy.id}`,
      }
    : {
        id: "test-direct",
        host: "",
        port: 0,
        username: "",
        password: "",
        protocol: "http" as const,
        profilePath: "data/profiles/test-direct",
      };

  console.log("Starting visit...\n");

  const result = await executeVisit({
    keywordId: keyword.id,
    campaignId: campaign.id,
    keyword: keyword.keyword,
    targetUrl: keyword.targetUrl,
    domain: campaign.domain,
    proxy: proxyConfig,
    warmupSearches: campaign.warmupSearches,
    minVisitDuration: campaign.minVisitDuration,
    maxVisitDuration: campaign.maxVisitDuration,
    minPagesPerVisit: campaign.minPagesPerVisit,
    maxPagesPerVisit: campaign.maxPagesPerVisit,
    maxConsecutiveCaptchas: 5,
  });

  console.log("\n📊 Visit Result:");
  console.log(`  Status: ${result.status}`);
  console.log(`  SERP Position: ${result.serpPosition ?? "N/A"}`);
  console.log(`  Pages Visited: ${result.pagesVisited}`);
  console.log(`  Duration: ${result.duration.toFixed(1)}s`);
  console.log(`  Viewport: ${result.viewport}`);
  console.log(`  Warmup Done: ${result.warmupDone}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
