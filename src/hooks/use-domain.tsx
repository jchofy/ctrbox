"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface DomainInfo {
  id: string;
  domain: string;
  count: number;
  createdAt: string;
}

interface DomainContextValue {
  domain: string | null;
  setDomain: (domain: string | null) => void;
  domains: DomainInfo[];
  loading: boolean;
  refetchDomains: () => Promise<void>;
}

const DomainContext = createContext<DomainContextValue | null>(null);

const STORAGE_KEY = "ctrbox-selected-domain";

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [domain, setDomainState] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDomainState(stored);
    }
  }, []);

  const setDomain = useCallback((d: string | null) => {
    setDomainState(d);
    if (d) {
      localStorage.setItem(STORAGE_KEY, d);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      if (res.ok) {
        const data: DomainInfo[] = await res.json();
        setDomains(data);
        // If stored domain no longer exists, reset to all
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && !data.some((d) => d.domain === stored)) {
          setDomain(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [setDomain]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return (
    <DomainContext.Provider value={{ domain, setDomain, domains, loading, refetchDomains: fetchDomains }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const ctx = useContext(DomainContext);
  if (!ctx) {
    throw new Error("useDomain must be used within DomainProvider");
  }
  return ctx;
}
