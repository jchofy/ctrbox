"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Target,
  Globe,
  Settings,
  Activity,
  Play,
  Square,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDomain } from "@/hooks/use-domain";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campañas", icon: Target },
  { href: "/proxies", label: "Proxies", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { domain, setDomain, domains } = useDomain();
  const [workerStatus, setWorkerStatus] = useState<string>("stopped");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/worker");
      if (res.ok) {
        const data = await res.json();
        setWorkerStatus(data.status);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function controlWorker(action: string) {
    const res = await fetch("/api/worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      setWorkerStatus(data.status);
    }
  }

  const statusColor =
    workerStatus === "running"
      ? "bg-green-500"
      : workerStatus === "paused"
        ? "bg-yellow-500"
        : "bg-red-500";

  const statusLabel =
    workerStatus === "running"
      ? "Worker activo"
      : workerStatus === "paused"
        ? "Worker pausado"
        : "Worker parado";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Activity className="size-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">CTRBox</span>
      </div>

      <Separator />

      <div className="px-3 py-2">
        <Select
          value={domain ?? "__all__"}
          onValueChange={(v) => setDomain(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos los dominios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los dominios</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d.domain} value={d.domain}>
                {d.domain}
                <span className="ml-auto text-xs text-muted-foreground">
                  {d.count}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center gap-3 px-1">
          <span className="relative flex size-2.5">
            {workerStatus === "running" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            )}
            <span className={cn("relative inline-flex size-2.5 rounded-full", statusColor)} />
          </span>
          <span className="text-xs text-sidebar-foreground/60">{statusLabel}</span>
        </div>
        <div className="flex gap-1">
          {workerStatus === "stopped" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => controlWorker("start")}
            >
              <Play className="mr-1 size-3" />
              Iniciar
            </Button>
          )}
          {workerStatus === "running" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => controlWorker("pause")}
              >
                <Pause className="mr-1 size-3" />
                Pausar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => controlWorker("stop")}
              >
                <Square className="mr-1 size-3" />
                Parar
              </Button>
            </>
          )}
          {workerStatus === "paused" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => controlWorker("resume")}
              >
                <Play className="mr-1 size-3" />
                Reanudar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => controlWorker("stop")}
              >
                <Square className="mr-1 size-3" />
                Parar
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
