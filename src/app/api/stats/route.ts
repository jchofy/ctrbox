import { db, schema } from "@/db";
import { eq, and, gte, sql, desc, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  // Total campaigns (filtered by domain if specified)
  const allCampaigns = await db.query.campaigns.findMany({
    where: domain ? eq(schema.campaigns.domain, domain) : undefined,
  });
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;

  // Campaign IDs for filtering visits
  const campaignIds = allCampaigns.map((c) => c.id);

  // Today's visits (filtered by campaign if domain is set)
  const todayVisits = campaignIds.length === 0 && domain
    ? []
    : await db.query.visits.findMany({
        where: domain && campaignIds.length > 0
          ? and(
              gte(schema.visits.createdAt, todayStr),
              inArray(schema.visits.campaignId, campaignIds)
            )
          : gte(schema.visits.createdAt, todayStr),
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
    where: domain && campaignIds.length > 0
      ? inArray(schema.visits.campaignId, campaignIds)
      : undefined,
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
