import { existsSync, mkdirSync } from "fs";
import { logger } from "@/lib/logger";
import { sleep, randomInt } from "@/lib/random";
import type { Page } from "rebrowser-playwright";

const WARMUP_SITES = [
  "https://www.google.es",
  "https://www.elpais.com",
  "https://www.elmundo.es",
  "https://www.marca.com",
  "https://www.abc.es",
  "https://www.20minutos.es",
  "https://www.rtve.es",
  "https://www.lavanguardia.com",
  "https://es.wikipedia.org",
  "https://www.youtube.com",
];

export function ensureProfileDir(profilePath: string): string {
  if (!existsSync(profilePath)) {
    mkdirSync(profilePath, { recursive: true });
    logger.info({ profilePath }, "Created browser profile directory");
  }
  return profilePath;
}

export function isProfileWarmedUp(profilePath: string): boolean {
  // A warmed up profile has a Default directory with data
  const defaultDir = `${profilePath}/Default`;
  return existsSync(defaultDir);
}

export async function warmupProfile(page: Page): Promise<void> {
  logger.info("Warming up browser profile...");

  // Visit 2-4 random sites to build cookie/history
  const sitesToVisit = randomInt(2, 4);
  const shuffled = [...WARMUP_SITES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < sitesToVisit && i < shuffled.length; i++) {
    try {
      await page.goto(shuffled[i], {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Handle Google consent dialog if it appears
      if (shuffled[i].includes("google")) {
        await handleGoogleConsent(page);
      }

      // Simulate brief browsing
      await sleep(randomInt(2000, 5000));

      // Scroll a bit
      await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 500 + 200);
      });

      await sleep(randomInt(1000, 3000));

      logger.debug({ site: shuffled[i] }, "Warmup visit completed");
    } catch (error) {
      logger.debug({ site: shuffled[i], error }, "Warmup visit failed (non-critical)");
    }
  }

  logger.info("Profile warmup completed");
}

export async function handleGoogleConsent(page: Page): Promise<void> {
  try {
    // Look for the GDPR consent dialog
    const consentButton = await page.$(
      'button[aria-label="Aceptar todo"], button:has-text("Aceptar todo"), #L2AGLb'
    );
    if (consentButton) {
      await sleep(randomInt(500, 1500));
      await consentButton.click();
      logger.debug("Google consent dialog accepted");
      await sleep(randomInt(500, 1000));
    }
  } catch {
    // Consent dialog may not appear, that's fine
  }
}
