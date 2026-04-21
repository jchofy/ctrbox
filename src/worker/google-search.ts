import type { Page } from "rebrowser-playwright";
import { logger } from "@/lib/logger";
import { randomInt, sleep } from "@/lib/random";
import {
  humanType,
  humanClick,
  humanScroll,
  humanWaitAfterLoad,
  humanClickElement,
} from "./human-behavior";
import { handleGoogleConsent } from "./profiles";
import { detectCaptcha } from "./captcha-handler";

// Random warmup search queries (Spanish)
const WARMUP_QUERIES = [
  "noticias españa hoy",
  "tiempo madrid",
  "recetas fáciles",
  "liga española resultados",
  "mejores películas 2025",
  "restaurantes cerca de mi",
  "ofertas vuelos baratos",
  "horario trenes renfe",
  "definición emprendimiento",
  "como hacer una presentación",
  "mejores libros 2026",
  "tendencias marketing digital",
  "noticias tecnología",
  "receta tortilla española",
  "calendario laboral 2026",
];

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  element: string; // selector to click
}

export async function navigateToGoogle(page: Page): Promise<boolean> {
  try {
    await page.goto("https://www.google.es", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await humanWaitAfterLoad(page);
    await handleGoogleConsent(page);

    // Check for CAPTCHA
    const captcha = await detectCaptcha(page);
    if (captcha.detected) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error }, "Failed to navigate to Google");
    return false;
  }
}

export async function performSearch(
  page: Page,
  query: string
): Promise<boolean> {
  try {
    // Focus search box
    const searchBox = await page.$(
      'textarea[name="q"], input[name="q"]'
    );
    if (!searchBox) {
      logger.error("Search box not found");
      return false;
    }

    const box = await searchBox.boundingBox();
    if (box) {
      await humanClick(
        page,
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await searchBox.click();
    }

    await sleep(randomInt(300, 800));

    // Clear any existing text
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await sleep(randomInt(100, 300));

    // Type the search query with human-like typing
    await humanType(page, query);

    await sleep(randomInt(300, 800));

    // Press Enter
    await page.keyboard.press("Enter");

    // Wait for results to load
    await page.waitForSelector("#search, #rso", { timeout: 15000 });
    await humanWaitAfterLoad(page);

    // Check for CAPTCHA after search
    const captcha = await detectCaptcha(page);
    if (captcha.detected) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, query }, "Search failed");
    return false;
  }
}

export async function performWarmupSearches(page: Page): Promise<boolean> {
  const numSearches = randomInt(1, 2);
  const shuffled = [...WARMUP_QUERIES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < numSearches; i++) {
    logger.debug({ query: shuffled[i] }, "Performing warmup search");

    const success = await performSearch(page, shuffled[i]);
    if (!success) return false;

    // Browse results briefly
    await humanScroll(page, { scrolls: randomInt(1, 3), direction: "down" });
    await sleep(randomInt(2000, 5000));

    // Sometimes click a result during warmup
    if (Math.random() < 0.3) {
      const results = await parseSerpResults(page);
      if (results.length > 0) {
        const randomResult = results[randomInt(0, Math.min(4, results.length - 1))];
        try {
          await humanClickElement(page, randomResult.element);
          await sleep(randomInt(3000, 8000));
          await page.goBack({ waitUntil: "domcontentloaded", timeout: 10000 });
          await sleep(randomInt(1000, 2000));
        } catch {
          // Navigation might fail, go back to Google
          await navigateToGoogle(page);
        }
      }
    }

    // Navigate back to Google for next search
    if (i < numSearches - 1) {
      await navigateToGoogle(page);
      await sleep(randomInt(1000, 3000));
    }
  }

  // Navigate back to Google for the real search
  await navigateToGoogle(page);
  await sleep(randomInt(500, 1500));

  return true;
}

export async function parseSerpResults(page: Page): Promise<SerpResult[]> {
  const results = await page.evaluate(() => {
    const items: {
      position: number;
      url: string;
      title: string;
      selector: string;
    }[] = [];

    // Standard organic results
    const resultElements = document.querySelectorAll("#search .g, #rso .g");
    let position = 0;

    resultElements.forEach((el) => {
      const link = el.querySelector("a[href]") as HTMLAnchorElement;
      const titleEl = el.querySelector("h3");

      if (link && titleEl && link.href.startsWith("http")) {
        position++;
        items.push({
          position,
          url: link.href,
          title: titleEl.textContent || "",
          selector: `#search .g:nth-of-type(${position}) a`,
        });
      }
    });

    return items;
  });

  return results.map((r) => ({
    position: r.position,
    url: r.url,
    title: r.title,
    element: r.selector,
  }));
}

export async function findTargetInSerp(
  page: Page,
  targetDomain: string,
  targetUrl?: string
): Promise<SerpResult | null> {
  const results = await parseSerpResults(page);

  // First try exact URL match
  if (targetUrl) {
    const exactMatch = results.find((r) =>
      r.url.includes(targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    );
    if (exactMatch) return exactMatch;
  }

  // Then try domain match
  const domainMatch = results.find((r) => {
    try {
      const resultDomain = new URL(r.url).hostname.replace("www.", "");
      const target = targetDomain.replace("www.", "");
      return resultDomain === target || resultDomain.endsWith(`.${target}`);
    } catch {
      return false;
    }
  });

  return domainMatch || null;
}

export async function clickSerpResult(
  page: Page,
  result: SerpResult
): Promise<boolean> {
  try {
    // Scroll to make the result visible
    const resultElements = await page.$$("#search .g, #rso .g");
    if (result.position <= resultElements.length) {
      const el = resultElements[result.position - 1];
      await el.scrollIntoViewIfNeeded();
      await sleep(randomInt(300, 800));
    }

    // Find and click the link
    const link = await page.$(`#search .g:nth-child(${result.position}) a, #rso .g:nth-child(${result.position}) a`);
    if (link) {
      const box = await link.boundingBox();
      if (box) {
        await humanClick(
          page,
          box.x + box.width * randomInt(20, 80) / 100,
          box.y + box.height / 2
        );

        // Wait for navigation
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
        return true;
      }
    }

    // Fallback: use evaluate to click
    const clicked = await page.evaluate((pos) => {
      const results = document.querySelectorAll("#search .g a[href], #rso .g a[href]");
      let count = 0;
      for (const el of results) {
        const h3 = el.querySelector("h3");
        if (h3) {
          count++;
          if (count === pos) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    }, result.position);

    if (clicked) {
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
    }

    return clicked;
  } catch (error) {
    logger.error({ error, result }, "Failed to click SERP result");
    return false;
  }
}
