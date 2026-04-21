"use client";

import { useCallback, useEffect, useState } from "react";

export interface Keyword {
  id: string;
  campaignId: string;
  keyword: string;
  targetUrl: string;
  isActive: boolean;
  dailyVisitTarget: number;
  lastKnownPosition: number | null;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  domain: string;
  dailyVisitTarget: number;
  status: "active" | "paused" | "completed";
  minVisitDuration: number;
  maxVisitDuration: number;
  minPagesPerVisit: number;
  maxPagesPerVisit: number;
  warmupSearches: boolean;
  createdAt: string;
  updatedAt: string;
  keywords: Keyword[];
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, refetch: fetchCampaigns };
}

export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        setCampaign(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return { campaign, loading, refetch: fetchCampaign };
}
