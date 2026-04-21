/** Random integer between min and max (inclusive) */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min and max */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Gaussian (normal) distribution random number */
export function randomGaussian(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/** Log-normal delay (more short delays, some long ones) */
export function randomLogNormal(median: number, sigma: number): number {
  const mu = Math.log(median);
  const normal = randomGaussian(mu, sigma);
  return Math.max(0, Math.exp(normal));
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pick random item from weighted array */
export function weightedRandom<T extends { weight: number }>(
  items: T[]
): Omit<T, "weight"> {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      const { weight: _, ...rest } = item;
      return rest;
    }
  }
  const { weight: _, ...rest } = items[items.length - 1];
  return rest;
}
