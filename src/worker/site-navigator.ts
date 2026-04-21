import type { Page } from "rebrowser-playwright";
import { logger } from "@/lib/logger";
import { randomInt, randomFloat, sleep } from "@/lib/random";
import {
  humanScroll,
  humanWaitAfterLoad,
  humanClickElement,
  humanMouseMove,
} from "./human-behavior";

interface NavigationOptions {
  minDuration: number; // seconds
  maxDuration: number; // seconds
  minPages: number;
  maxPages: number;
}

export async function navigateSite(
  page: Page,
  options: NavigationOptions
): Promise<{ pagesVisited: number; duration: number }> {
  const targetDuration =
    randomFloat(options.minDuration, options.maxDuration) * 1000;
  const targetPages = randomInt(options.minPages, options.maxPages);
  const startTime = Date.now();
  let pagesVisited = 1; // Counting the landing page
  const domain = new URL(page.url()).hostname;

  logger.debug(
    { targetDuration: targetDuration / 1000, targetPages },
    "Starting site navigation"
  );

  // Initial page browsing
  await humanWaitAfterLoad(page);
  await browseCurrentPage(page);

  // Navigate internal links
  while (
    pagesVisited < targetPages &&
    Date.now() - startTime < targetDuration
  ) {
    const navigated = await clickRandomInternalLink(page, domain);
    if (!navigated) break;

    pagesVisited++;
    await browseCurrentPage(page);

    // Random chance to go back
    if (Math.random() < 0.2 && pagesVisited > 1) {
      await sleep(randomInt(500, 1500));
      try {
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 10000 });
        await humanWaitAfterLoad(page);
      } catch {
        break;
      }
    }
  }

  // If we haven't reached minimum duration, keep reading
  const elapsed = Date.now() - startTime;
  if (elapsed < targetDuration * 0.7) {
    const remaining = targetDuration - elapsed;
    await browseCurrentPage(page, remaining);
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  logger.debug(
    { pagesVisited, duration: totalDuration },
    "Site navigation completed"
  );

  return { pagesVisited, duration: totalDuration };
}

async function browseCurrentPage(
  page: Page,
  maxDuration?: number
): Promise<void> {
  const browseDuration = maxDuration || randomInt(5000, 20000);
  const startTime = Date.now();

  // Scroll down through the page
  await humanScroll(page, {
    scrolls: randomInt(2, 5),
    direction: "mixed",
  });

  // Move mouse around (reading behavior)
  const viewport = page.viewportSize();
  if (viewport) {
    const moves = randomInt(2, 5);
    for (let i = 0; i < moves; i++) {
      if (Date.now() - startTime > browseDuration) break;

      await humanMouseMove(
        page,
        randomInt(50, viewport.width - 50),
        randomInt(50, viewport.height - 50)
      );
      await sleep(randomInt(500, 2000));
    }
  }

  // Wait remaining time
  const remaining = browseDuration - (Date.now() - startTime);
  if (remaining > 0) {
    await sleep(Math.min(remaining, 5000));
  }
}

async function clickRandomInternalLink(
  page: Page,
  domain: string
): Promise<boolean> {
  try {
    const links = await page.evaluate((d) => {
      const allLinks = Array.from(document.querySelectorAll("a[href]"));
      return allLinks
        .filter((a) => {
          const href = (a as HTMLAnchorElement).href;
          try {
            const url = new URL(href);
            return (
              url.hostname.includes(d) &&
              !href.includes("#") &&
              !href.includes("mailto:") &&
              !href.includes("tel:") &&
              !href.match(/\.(pdf|zip|jpg|png|gif|svg)$/i) &&
              (a as HTMLElement).offsetParent !== null // is visible
            );
          } catch {
            return false;
          }
        })
        .map((a, i) => ({
          index: i,
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLElement).textContent?.trim().slice(0, 50) || "",
        }));
    }, domain);

    if (links.length === 0) return false;

    // Pick a random link, preferring content links (not nav/footer)
    const link = links[randomInt(0, Math.min(links.length - 1, 9))];

    logger.debug({ href: link.href, text: link.text }, "Clicking internal link");

    // Click using human behavior
    const clicked = await humanClickElement(
      page,
      `a[href="${link.href}"]`
    );

    if (clicked) {
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    logger.debug({ error }, "Failed to click internal link");
    return false;
  }
}
