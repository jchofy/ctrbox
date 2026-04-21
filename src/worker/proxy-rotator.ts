import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { isProxyBackedOff, calculateBackoffUntil } from "./captcha-handler";
import type { ProxyConfig } from "@/types";

let lastProxyIndex = -1;

export async function getNextProxy(): Promise<ProxyConfig | null> {
  const allProxies = await db.query.proxies.findMany({
    where: eq(schema.proxies.isActive, true),
  });

  if (allProxies.length === 0) {
    logger.warn("No active proxies available");
    return null;
  }

  // Filter out backed-off proxies
  const available = allProxies.filter(
    (p) =>
      p.lastStatus !== "unhealthy" &&
      !isProxyBackedOff(p.lastBackoffUntil)
  );

  if (available.length === 0) {
    logger.warn("All proxies are backed off or unhealthy");
    return null;
  }

  // Round-robin selection
  lastProxyIndex = (lastProxyIndex + 1) % available.length;
  const proxy = available[lastProxyIndex];

  return {
    id: proxy.id,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username,
    password: proxy.password,
    protocol: proxy.protocol as ProxyConfig["protocol"],
    profilePath: proxy.profilePath || `data/profiles/${proxy.id}`,
  };
}

export async function reportProxySuccess(proxyId: string): Promise<void> {
  const proxy = await db.query.proxies.findFirst({
    where: eq(schema.proxies.id, proxyId),
  });

  if (proxy) {
    await db
      .update(schema.proxies)
      .set({
        lastStatus: "healthy",
        failCount: 0,
        totalUsed: proxy.totalUsed + 1,
      })
      .where(eq(schema.proxies.id, proxyId));
  }
}

export async function reportProxyFailure(proxyId: string): Promise<void> {
  const proxy = await db.query.proxies.findFirst({
    where: eq(schema.proxies.id, proxyId),
  });

  if (proxy) {
    const newFailCount = proxy.failCount + 1;
    await db
      .update(schema.proxies)
      .set({
        failCount: newFailCount,
        totalUsed: proxy.totalUsed + 1,
      })
      .where(eq(schema.proxies.id, proxyId));
  }
}

export async function reportProxyCaptcha(
  proxyId: string,
  maxConsecutive: number
): Promise<void> {
  const proxy = await db.query.proxies.findFirst({
    where: eq(schema.proxies.id, proxyId),
  });

  if (proxy) {
    const newCaptchaCount = proxy.captchaCount + 1;
    const backoffUntil = calculateBackoffUntil(newCaptchaCount);

    const updates: Record<string, unknown> = {
      captchaCount: newCaptchaCount,
      totalUsed: proxy.totalUsed + 1,
      lastBackoffUntil: backoffUntil.toISOString(),
    };

    // Mark unhealthy after too many consecutive CAPTCHAs
    if (newCaptchaCount >= maxConsecutive) {
      updates.lastStatus = "unhealthy";
      logger.warn(
        { proxyId, captchaCount: newCaptchaCount },
        "Proxy marked as unhealthy due to consecutive CAPTCHAs"
      );
    }

    await db
      .update(schema.proxies)
      .set(updates)
      .where(eq(schema.proxies.id, proxyId));
  }
}

export async function resetProxyCaptchaCount(proxyId: string): Promise<void> {
  await db
    .update(schema.proxies)
    .set({ captchaCount: 0 })
    .where(eq(schema.proxies.id, proxyId));
}
