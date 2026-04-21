import { db, schema } from "@/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  // Total campaigns
  const allCampaigns = await db.query.campaigns.findMany();
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;

  // Today's visits
  const todayVisits = await db.query.visits.findMany({
    where: gte(schema.visits.createdAt, todayStr),
  });

  const totalVisitsToday = todayVisits.length;
  const successfulVisitsToday = todayVisits.filter((v) => v.status === "success").length;
  const failedVisitsToday = todayVisits.filter((v) => v.status === "failed").length;
  const captchaVisitsToday = todayVisits.filter((v) => v.status === "captcha").length;

  // Proxies
  const allProxies = await db.query.proxies.findMany();
  const totalProxies = allProxies.filter((p) => p.isActive).length;
  const healthyProxies = allProxies.filter(
    (p) => p.isActive && p.lastStatus !== "unhealthy"
  ).length;

  // Average position from successful visits today
  const successWithPosition = todayVisits.filter(
    (v) => v.status === "success" && v.serpPosition
  );
  const avgPosition =
    successWithPosition.length > 0
      ? successWithPosition.reduce((sum, v) => sum + (v.serpPosition || 0), 0) /
        successWithPosition.length
      : null;

  // Visits by hour today
  const visitsByHour: { hour: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const count = todayVisits.filter((v) => {
      const d = new Date(v.createdAt);
      return d.getHours() === h;
    }).length;
    visitsByHour.push({ hour: h, count });
  }

  // Recent visits (last 20)
  const recentVisitsRaw = await db.query.visits.findMany({
    orderBy: desc(schema.visits.createdAt),
    limit: 20,
    with: { keyword: true },
  });

  const recentVisits = recentVisitsRaw.map((v) => ({
    id: v.id,
    keyword: v.keyword?.keyword || "Unknown",
    status: v.status,
    serpPosition: v.serpPosition,
    duration: v.duration || 0,
    completedAt: v.completedAt || v.createdAt,
  }));

  return NextResponse.json({
    totalCampaigns,
    activeCampaigns,
    totalVisitsToday,
    successfulVisitsToday,
    failedVisitsToday,
    captchaVisitsToday,
    totalProxies,
    healthyProxies,
    avgPosition,
    visitsByHour,
    recentVisits,
  });
}
