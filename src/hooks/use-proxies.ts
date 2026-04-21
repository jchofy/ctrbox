"use client";

import { useCallback, useEffect, useState } from "react";

export interface Proxy {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: "http" | "https" | "socks5";
  isActive: boolean;
  lastStatus: "unknown" | "healthy" | "unhealthy";
  failCount: number;
  totalUsed: number;
  captchaCount: number;
  profilePath: string | null;
  lastBackoffUntil: string | null;
  createdAt: string;
}

export function useProxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proxies");
      const data = await res.json();
      setProxies(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  return { proxies, loading, refetch: fetchProxies };
}
