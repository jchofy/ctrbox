"use client";

import { useCallback, useEffect, useState } from "react";

export interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalVisitsToday: number;
  successfulVisitsToday: number;
  failedVisitsToday: number;
  captchaVisitsToday: number;
  totalProxies: number;
  healthyProxies: number;
  avgPosition: number | null;
  visitsByHour: { hour: number; count: number }[];
  recentVisits: {
    id: string;
    keyword: string;
    status: string;
    serpPosition: number | null;
    duration: number;
    completedAt: string;
  }[];
}

export function useStats(domain?: string | null) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = domain ? `?domain=${encodeURIComponent(domain)}` : "";
      const res = await fetch(`/api/stats${params}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
