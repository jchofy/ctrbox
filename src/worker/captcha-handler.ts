import type { Page } from "rebrowser-playwright";
import { logger } from "@/lib/logger";

export interface CaptchaDetectionResult {
  detected: boolean;
  type: "botguard" | "recaptcha" | "sorry_page" | "unusual_traffic" | null;
}

export async function detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
  try {
    const url = page.url();

    // Check for Google "sorry" page
    if (url.includes("/sorry/") || url.includes("sorry.google")) {
      logger.warn("CAPTCHA detected: Google sorry page");
      return { detected: true, type: "sorry_page" };
    }

    // Check page content for CAPTCHA indicators
    const captchaIndicators = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const bodyText = document.body?.innerText || "";

      return {
        hasRecaptchaIframe: !!document.querySelector(
          'iframe[src*="recaptcha"], iframe[src*="gstatic.com/recaptcha"]'
        ),
        hasBotGuardScript: !!document.querySelector(
          'script[src*="gstatic.com/recaptcha/releases"]'
        ),
        hasUnusualTraffic:
          bodyText.includes("unusual traffic") ||
          bodyText.includes("tráfico inusual") ||
          bodyText.includes("sistemas han detectado"),
        hasSorryText:
          bodyText.includes("Lo sentimos") &&
          bodyText.includes("solicitudes"),
        hasCaptchaChallenge: !!document.querySelector(
          "#captcha-form, .g-recaptcha, #recaptcha"
        ),
      };
    });

    if (captchaIndicators.hasRecaptchaIframe || captchaIndicators.hasCaptchaChallenge) {
      logger.warn("CAPTCHA detected: reCAPTCHA challenge");
      return { detected: true, type: "recaptcha" };
    }

    if (captchaIndicators.hasBotGuardScript) {
      logger.warn("CAPTCHA detected: BotGuard script loaded");
      return { detected: true, type: "botguard" };
    }

    if (captchaIndicators.hasUnusualTraffic || captchaIndicators.hasSorryText) {
      logger.warn("CAPTCHA detected: unusual traffic message");
      return { detected: true, type: "unusual_traffic" };
    }

    return { detected: false, type: null };
  } catch (error) {
    logger.error({ error }, "Error detecting CAPTCHA");
    return { detected: false, type: null };
  }
}

// Backoff times in minutes: 5, 10, 20, 40, 120
const BACKOFF_SCHEDULE = [5, 10, 20, 40, 120];

export function calculateBackoffUntil(consecutiveCaptchas: number): Date {
  const index = Math.min(consecutiveCaptchas - 1, BACKOFF_SCHEDULE.length - 1);
  const minutes = BACKOFF_SCHEDULE[index];
  const backoffUntil = new Date();
  backoffUntil.setMinutes(backoffUntil.getMinutes() + minutes);
  return backoffUntil;
}

export function isProxyBackedOff(lastBackoffUntil: string | null): boolean {
  if (!lastBackoffUntil) return false;
  return new Date(lastBackoffUntil) > new Date();
}
