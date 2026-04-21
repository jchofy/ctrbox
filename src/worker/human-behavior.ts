import type { Page } from "rebrowser-playwright";
import { randomInt, randomFloat, randomGaussian, sleep } from "@/lib/random";

// --- MOUSE: Bezier curves with jitter, overshoot, variable speed ---

interface Point {
  x: number;
  y: number;
}

function bezierPoint(t: number, points: Point[]): Point {
  // De Casteljau's algorithm for arbitrary control points
  let current = [...points];
  while (current.length > 1) {
    const next: Point[] = [];
    for (let i = 0; i < current.length - 1; i++) {
      next.push({
        x: (1 - t) * current[i].x + t * current[i + 1].x,
        y: (1 - t) * current[i].y + t * current[i + 1].y,
      });
    }
    current = next;
  }
  return current[0];
}

function generateBezierPath(from: Point, to: Point): Point[] {
  // 3-5 control points for natural curve
  const numControls = randomInt(3, 5);
  const controls: Point[] = [from];

  for (let i = 0; i < numControls; i++) {
    const t = (i + 1) / (numControls + 1);
    const midX = from.x + (to.x - from.x) * t;
    const midY = from.y + (to.y - from.y) * t;
    controls.push({
      x: midX + randomFloat(-50, 50),
      y: midY + randomFloat(-30, 30),
    });
  }
  controls.push(to);

  // Generate path points with variable density
  const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const steps = Math.max(20, Math.floor(distance / 3));
  const path: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    // Ease-in-out: slower at start and end
    let t = i / steps;
    t = t * t * (3 - 2 * t); // Smoothstep

    const point = bezierPoint(t, controls);

    // Micro-jitter: ±1-3px
    path.push({
      x: Math.round(point.x + randomFloat(-2, 2)),
      y: Math.round(point.y + randomFloat(-2, 2)),
    });
  }

  return path;
}

export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number
): Promise<void> {
  const currentPos = await page.evaluate(() => ({
    x: (window as unknown as { _mouseX?: number })._mouseX || window.innerWidth / 2,
    y: (window as unknown as { _mouseY?: number })._mouseY || window.innerHeight / 2,
  }));

  // 15% chance of overshoot
  let finalX = targetX;
  let finalY = targetY;
  const willOvershoot = Math.random() < 0.15;

  if (willOvershoot) {
    // Overshoot by 10-30px
    const overshootX = targetX + randomFloat(-30, 30);
    const overshootY = targetY + randomFloat(-20, 20);

    // Move to overshoot position first
    const overshootPath = generateBezierPath(currentPos, {
      x: overshootX,
      y: overshootY,
    });
    for (const point of overshootPath) {
      await page.mouse.move(point.x, point.y);
      await sleep(randomInt(1, 4));
    }

    // Correct to actual target
    const correctionPath = generateBezierPath(
      { x: overshootX, y: overshootY },
      { x: targetX, y: targetY }
    );
    for (const point of correctionPath) {
      await page.mouse.move(point.x, point.y);
      await sleep(randomInt(2, 5));
    }
  } else {
    const path = generateBezierPath(currentPos, { x: finalX, y: finalY });
    for (const point of path) {
      await page.mouse.move(point.x, point.y);
      await sleep(randomInt(1, 5));
    }
  }

  // Track mouse position
  await page.evaluate(
    ([x, y]) => {
      (window as unknown as { _mouseX: number })._mouseX = x;
      (window as unknown as { _mouseY: number })._mouseY = y;
    },
    [finalX, finalY]
  );
}

export async function humanClick(
  page: Page,
  x: number,
  y: number
): Promise<void> {
  await humanMouseMove(page, x, y);

  // Hover delay before click: 200-800ms
  await sleep(randomInt(200, 800));

  // Click with realistic press duration
  await page.mouse.down();
  await sleep(randomInt(50, 150));
  await page.mouse.up();
}

export async function humanClickElement(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = await page.$(selector);
  if (!element) return false;

  const box = await element.boundingBox();
  if (!box) return false;

  // Click at a random point within the element
  const x = box.x + randomFloat(box.width * 0.2, box.width * 0.8);
  const y = box.y + randomFloat(box.height * 0.2, box.height * 0.8);

  await humanClick(page, x, y);
  return true;
}

// --- KEYBOARD: Gaussian typing with typos ---

export async function humanType(
  page: Page,
  text: string,
  options?: { typoRate?: number }
): Promise<void> {
  const typoRate = options?.typoRate ?? 0.04; // 4% chance per character

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Typo simulation
    if (Math.random() < typoRate && char !== " ") {
      // Type a wrong character
      const wrongChar = String.fromCharCode(
        char.charCodeAt(0) + randomInt(-2, 2)
      );
      await pressKey(page, wrongChar);

      // Pause and notice the mistake
      await sleep(randomInt(100, 400));

      // Backspace to fix
      await pressKey(page, "Backspace");
      await sleep(randomInt(50, 200));
    }

    // Type the correct character
    await pressKey(page, char);

    // Inter-key delay: gaussian, mean 120ms, σ=40ms
    let delay = Math.max(40, randomGaussian(120, 40));

    // Longer pause between words
    if (char === " ") {
      delay = randomFloat(200, 500);
    }

    // Brief pause every 3-5 characters (thinking)
    if (i > 0 && i % randomInt(3, 5) === 0) {
      delay += randomFloat(100, 400);
    }

    await sleep(delay);
  }
}

async function pressKey(page: Page, key: string): Promise<void> {
  // Realistic key press/release duration
  const pressDuration = Math.max(30, randomGaussian(80, 20));
  await page.keyboard.down(key);
  await sleep(pressDuration);
  await page.keyboard.up(key);
}

// --- SCROLL: Variable increments with reading pauses ---

export async function humanScroll(
  page: Page,
  options?: {
    scrolls?: number;
    direction?: "down" | "up" | "mixed";
  }
): Promise<void> {
  const { scrolls = randomInt(3, 8), direction = "mixed" } = options || {};

  for (let i = 0; i < scrolls; i++) {
    // Variable scroll amount: 150-400px
    const amount = randomInt(150, 400);

    // Direction: mostly down, some up
    let scrollDown: boolean;
    if (direction === "down") {
      scrollDown = true;
    } else if (direction === "up") {
      scrollDown = false;
    } else {
      scrollDown = Math.random() > 0.18; // ~82% down, ~18% up
    }

    const delta = scrollDown ? amount : -amount;

    // Smooth scroll simulation with variable delta per step
    const steps = randomInt(3, 6);
    for (let s = 0; s < steps; s++) {
      const stepDelta = delta / steps + randomFloat(-10, 10);
      await page.mouse.wheel(0, stepDelta);
      await sleep(randomInt(20, 60));
    }

    // Reading pause between scrolls: 1-4 seconds
    await sleep(randomInt(1000, 4000));
  }
}

// --- WAIT: Realistic page processing delay ---

export async function humanWaitAfterLoad(page: Page): Promise<void> {
  // Humans need 500-1500ms to process visual content after page load
  await sleep(randomInt(500, 1500));

  // Sometimes move mouse slightly to show "awareness"
  if (Math.random() > 0.5) {
    const viewport = page.viewportSize();
    if (viewport) {
      await page.mouse.move(
        randomInt(100, viewport.width - 100),
        randomInt(100, 300)
      );
    }
  }
}
