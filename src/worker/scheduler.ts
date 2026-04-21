import { db, schema } from "@/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getNextProxy } from "./proxy-rotator";
import { executeVisit } from "./visit-engine";
import { VisitQueue } from "./queue";
import * as cron from "node-cron";

interface SchedulerConfig {
  startHour: number;
  endHour: number;
  peakHours: number[];
  peakMultiplier: number;
  maxConcurrency: number;
  maxConsecutiveCaptchas: number;
}

let cronJob: ReturnType<typeof cron.schedule> | null = null;
let visitQueue: VisitQueue<Parameters<typeof executeVisit>[0]> | null = null;

async function getConfig(): Promise<SchedulerConfig> {
  const settings = await db.query.settings.findMany();
  const get = (key: string, def: string) =>
    settings.find((s) => s.key === key)?.value || def;

  return {
    startHour: parseInt(get("schedule_start_hour", "8")),
    endHour: parseInt(get("schedule_end_hour", "22")),
    peakHours: get("peak_hours", "10,11,12,13,14,18,19,20")
      .split(",")
      .map(Number),
    peakMultiplier: parseFloat(get("peak_multiplier", "1.5")),
    maxConcurrency: parseInt(get("max_concurrent_visits", "1")),
    maxConsecutiveCaptchas: parseInt(get("captcha_max_consecutive", "5")),
  };
}

async function tick(): Promise<void> {
  const config = await getConfig();
  const now = new Date();
  const currentHour = now.getHours();

  // Check if within active hours
  if (currentHour < config.startHour || currentHour >= config.endHour) {
    logger.debug({ currentHour }, "Outside active hours, skipping");
    return;
  }

  // Update queue concurrency
  if (visitQueue) {
    visitQueue.setMaxConcurrency(config.maxConcurrency);
  }

  // Get active campaigns with keywords
  const activeCampaigns = await db.query.campaigns.findMany({
    where: eq(schema.campaigns.status, "active"),
    with: {
      keywords: {
        where: eq(schema.keywords.isActive, true),
      },
    },
  });

  if (activeCampaigns.length === 0) {
    return;
  }

  // Calculate remaining minutes in active window
  const minutesRemaining = (config.endHour - currentHour) * 60 - now.getMinutes();
  if (minutesRemaining <= 0) return;

  const isPeakHour = config.peakHours.includes(currentHour);
  const multiplier = isPeakHour ? config.peakMultiplier : 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  for (const campaign of activeCampaigns) {
    for (const keyword of campaign.keywords) {
      // Count today's visits for this keyword
      const todayVisits = await db.query.visits.findMany({
        where: and(
          eq(schema.visits.keywordId, keyword.id),
          gte(schema.visits.createdAt, todayStr)
        ),
      });

      const completedToday = todayVisits.filter(
        (v) => v.status !== "pending" && v.status !== "running"
      ).length;
      const runningNow = todayVisits.filter(
        (v) => v.status === "running"
      ).length;

      const remaining = keyword.dailyVisitTarget - completedToday - runningNow;
      if (remaining <= 0) continue;

      // Probabilistic scheduling: probability = remaining / minutesRemaining * multiplier
      const probability = Math.min(
        1,
        (remaining / minutesRemaining) * multiplier
      );

      if (Math.random() < probability) {
        // Get a proxy for this visit
        const proxy = await getNextProxy();
        if (!proxy) {
          logger.warn("No proxy available, skipping visit");
          continue;
        }

        // Enqueue the visit
        if (visitQueue) {
          visitQueue.enqueue(`${keyword.id}-${Date.now()}`, {
            keywordId: keyword.id,
            campaignId: campaign.id,
            keyword: keyword.keyword,
            targetUrl: keyword.targetUrl,
            domain: campaign.domain,
            proxy,
            warmupSearches: campaign.warmupSearches,
            minVisitDuration: campaign.minVisitDuration,
            maxVisitDuration: campaign.maxVisitDuration,
            minPagesPerVisit: campaign.minPagesPerVisit,
            maxPagesPerVisit: campaign.maxPagesPerVisit,
            maxConsecutiveCaptchas: config.maxConsecutiveCaptchas,
          });

          logger.info(
            {
              keyword: keyword.keyword,
              remaining,
              probability: probability.toFixed(3),
            },
            "Visit enqueued"
          );
        }
      }
    }
  }
}

export function startScheduler(): void {
  if (cronJob) {
    logger.warn("Scheduler already running");
    return;
  }

  visitQueue = new VisitQueue(1, async (task) => {
    await executeVisit(task);
  });

  // Run every minute
  cronJob = cron.schedule("* * * * *", () => {
    tick().catch((error) => {
      logger.error({ error }, "Scheduler tick failed");
    });
  });

  logger.info("Scheduler started (cron every minute)");
}

export function stopScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  if (visitQueue) {
    visitQueue.clear();
    visitQueue = null;
  }
  logger.info("Scheduler stopped");
}

export function pauseScheduler(): void {
  if (cronJob) {
    cronJob.stop();
  }
  logger.info("Scheduler paused");
}

export function resumeScheduler(): void {
  if (cronJob) {
    cronJob.start();
  }
  logger.info("Scheduler resumed");
}

export function getSchedulerStats() {
  return {
    isRunning: cronJob !== null,
    queueSize: visitQueue?.size || 0,
    activeVisits: visitQueue?.activeCount || 0,
  };
}
