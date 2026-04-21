import { chromium } from "rebrowser-playwright";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { logger } from "@/lib/logger";
import { randomInt, randomFloat, sleep } from "@/lib/random";
import { generatePersona, getStealthScripts } from "./anti-detection";
import { ensureProfileDir, isProfileWarmedUp, warmupProfile } from "./profiles";
import {
  navigateToGoogle,
  performSearch,
  performWarmupSearches,
  findTargetInSerp,
  clickSerpResult,
} from "./google-search";
import { navigateSite } from "./site-navigator";
import { detectCaptcha } from "./captcha-handler";
import {
  reportProxySuccess,
  reportProxyFailure,
  reportProxyCaptcha,
  resetProxyCaptchaCount,
} from "./proxy-rotator";
import type { VisitResult, ProxyConfig } from "@/types";

interface VisitTask {
  keywordId: string;
  campaignId: string;
  keyword: string;
  targetUrl: string;
  domain: string;
  proxy: ProxyConfig;
  warmupSearches: boolean;
  minVisitDuration: number;
  maxVisitDuration: number;
  minPagesPerVisit: number;
  maxPagesPerVisit: number;
  maxConsecutiveCaptchas: number;
}

export async function executeVisit(task: VisitTask): Promise<VisitResult> {
  const visitId = uuid();
  const persona = generatePersona();
  const startTime = Date.now();

  logger.info(
    {
      visitId,
      keyword: task.keyword,
      domain: task.domain,
      proxy: `${task.proxy.host}:${task.proxy.port}`,
    },
    "Starting visit"
  );

  // Create visit record
  await db.insert(schema.visits).values({
    id: visitId,
    keywordId: task.keywordId,
    campaignId: task.campaignId,
    proxyId: task.proxy.id,
    status: "running",
    userAgent: persona.userAgent,
    viewport: `${persona.viewport.width}x${persona.viewport.height}`,
    startedAt: new Date().toISOString(),
  });

  let browser;
  try {
    // Ensure profile directory exists
    const profilePath = ensureProfileDir(task.proxy.profilePath);
    const needsWarmup = !isProfileWarmedUp(profilePath);

    // Launch browser with stealth config
    browser = await chromium.launch({
      headless: process.env.BROWSER_HEADLESS !== "false",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-infobars",
        "--no-first-run",
        "--no-default-browser-check",
        `--window-size=${persona.viewport.width},${persona.viewport.height}`,
      ],
    });

    // Create context with persistent profile + proxy
    const contextOptions: Parameters<typeof browser.newContext>[0] = {
      userAgent: persona.userAgent,
      viewport: persona.viewport,
      locale: persona.locale,
      timezoneId: persona.timezone,
      geolocation: { latitude: 40.4168, longitude: -3.7038 }, // Madrid
      permissions: ["geolocation"],
      storageState: undefined,
    };

    // Add proxy config
    if (task.proxy.host) {
      (contextOptions as Record<string, unknown>).proxy = {
        server: `${task.proxy.protocol}://${task.proxy.host}:${task.proxy.port}`,
        username: task.proxy.username || undefined,
        password: task.proxy.password || undefined,
      };
    }

    const context = await browser.newContext(contextOptions);

    // Inject stealth scripts
    await context.addInitScript(getStealthScripts(persona));

    const page = await context.newPage();

    // Warmup profile if needed
    let warmupDone = false;
    if (needsWarmup) {
      await warmupProfile(page);
      warmupDone = true;
    }

    // Navigate to Google
    const googleOk = await navigateToGoogle(page);
    if (!googleOk) {
      await reportProxyCaptcha(task.proxy.id, task.maxConsecutiveCaptchas);
      return await finalizeVisit(visitId, {
        status: "captcha",
        serpPosition: null,
        pagesVisited: 0,
        duration: (Date.now() - startTime) / 1000,
        userAgent: persona.userAgent,
        viewport: `${persona.viewport.width}x${persona.viewport.height}`,
        warmupDone,
        error: "CAPTCHA on Google homepage",
      });
    }

    // Warmup searches (if enabled)
    if (task.warmupSearches) {
      const warmupOk = await performWarmupSearches(page);
      if (!warmupOk) {
        await reportProxyCaptcha(task.proxy.id, task.maxConsecutiveCaptchas);
        return await finalizeVisit(visitId, {
          status: "captcha",
          serpPosition: null,
          pagesVisited: 0,
          duration: (Date.now() - startTime) / 1000,
          userAgent: persona.userAgent,
          viewport: `${persona.viewport.width}x${persona.viewport.height}`,
          warmupDone,
          error: "CAPTCHA during warmup searches",
        });
      }
      warmupDone = true;
    }

    // Perform target search
    const searchOk = await performSearch(page, task.keyword);
    if (!searchOk) {
      await reportProxyCaptcha(task.proxy.id, task.maxConsecutiveCaptchas);
      return await finalizeVisit(visitId, {
        status: "captcha",
        serpPosition: null,
        pagesVisited: 0,
        duration: (Date.now() - startTime) / 1000,
        userAgent: persona.userAgent,
        viewport: `${persona.viewport.width}x${persona.viewport.height}`,
        warmupDone,
        error: "CAPTCHA during target search",
      });
    }

    // Variation: sometimes click another result first (pogo-sticking pattern)
    if (Math.random() < 0.15) {
      logger.debug("Variation: clicking non-target result first");
      // TODO: implement pogo-sticking variation
      await sleep(randomInt(1000, 3000));
    }

    // Find target in SERP
    const target = await findTargetInSerp(page, task.domain, task.targetUrl);

    if (!target) {
      // Variation: sometimes not finding is expected
      logger.info(
        { keyword: task.keyword, domain: task.domain },
        "Target not found in SERP"
      );

      await resetProxyCaptchaCount(task.proxy.id);
      return await finalizeVisit(visitId, {
        status: "not_found",
        serpPosition: null,
        pagesVisited: 0,
        duration: (Date.now() - startTime) / 1000,
        userAgent: persona.userAgent,
        viewport: `${persona.viewport.width}x${persona.viewport.height}`,
        warmupDone,
      });
    }

    // Update keyword position
    await db
      .update(schema.keywords)
      .set({ lastKnownPosition: target.position })
      .where(eq(schema.keywords.id, task.keywordId));

    logger.info(
      { position: target.position, url: target.url },
      "Target found in SERP"
    );

    // Scroll to result naturally
    await sleep(randomInt(500, 2000));

    // Click the target result
    const clicked = await clickSerpResult(page, target);
    if (!clicked) {
      return await finalizeVisit(visitId, {
        status: "failed",
        serpPosition: target.position,
        pagesVisited: 0,
        duration: (Date.now() - startTime) / 1000,
        userAgent: persona.userAgent,
        viewport: `${persona.viewport.width}x${persona.viewport.height}`,
        warmupDone,
        error: "Failed to click SERP result",
      });
    }

    // Navigate the target site
    const navResult = await navigateSite(page, {
      minDuration: task.minVisitDuration,
      maxDuration: task.maxVisitDuration,
      minPages: task.minPagesPerVisit,
      maxPages: task.maxPagesPerVisit,
    });

    // Success!
    await reportProxySuccess(task.proxy.id);
    await resetProxyCaptchaCount(task.proxy.id);

    // Save storage state for profile persistence
    try {
      await context.storageState({
        path: `${task.proxy.profilePath}/storage.json`,
      });
    } catch (e) {
      logger.debug({ error: e }, "Failed to save storage state");
    }

    return await finalizeVisit(visitId, {
      status: "success",
      serpPosition: target.position,
      pagesVisited: navResult.pagesVisited,
      duration: navResult.duration,
      userAgent: persona.userAgent,
      viewport: `${persona.viewport.width}x${persona.viewport.height}`,
      warmupDone,
    });
  } catch (error) {
    logger.error({ error, visitId }, "Visit failed with error");
    await reportProxyFailure(task.proxy.id);

    return await finalizeVisit(visitId, {
      status: "failed",
      serpPosition: null,
      pagesVisited: 0,
      duration: (Date.now() - startTime) / 1000,
      userAgent: persona.userAgent,
      viewport: `${persona.viewport.width}x${persona.viewport.height}`,
      warmupDone: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser already closed
      }
    }
  }
}

async function finalizeVisit(
  visitId: string,
  result: VisitResult
): Promise<VisitResult> {
  await db
    .update(schema.visits)
    .set({
      status: result.status,
      serpPosition: result.serpPosition,
      pagesVisited: result.pagesVisited,
      duration: result.duration,
      warmupDone: result.warmupDone,
      error: result.error || null,
      completedAt: new Date().toISOString(),
    })
    .where(eq(schema.visits.id, visitId));

  logger.info(
    {
      visitId,
      status: result.status,
      position: result.serpPosition,
      pages: result.pagesVisited,
      duration: Math.round(result.duration),
    },
    "Visit finalized"
  );

  return result;
}
