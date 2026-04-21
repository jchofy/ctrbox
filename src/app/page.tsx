"use client";

import {
  Eye,
  CheckCircle2,
  Target,
  Globe,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStats } from "@/hooks/use-stats";
import { useDomain } from "@/hooks/use-domain";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {subtitle && !loading && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {loading && <Skeleton className="mt-2 h-3 w-32" />}
      </CardContent>
    </Card>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "success":
      return "border-green-500 text-green-500";
    case "failed":
    case "timeout":
      return "border-red-500 text-red-500";
    case "captcha":
      return "border-yellow-500 text-yellow-500";
    case "not_found":
      return "border-orange-500 text-orange-500";
    case "running":
      return "border-blue-500 text-blue-500";
    default:
      return "";
  }
}

export default function DashboardPage() {
  const { domain } = useDomain();
  const { stats, loading } = useStats(domain);

  const successRate =
    stats && stats.totalVisitsToday > 0
      ? Math.round(
          (stats.successfulVisitsToday / stats.totalVisitsToday) * 100
        )
      : 0;

  const captchaRate =
    stats && stats.totalVisitsToday > 0
      ? Math.round(
          (stats.captchaVisitsToday / stats.totalVisitsToday) * 100
        )
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen general de la actividad de hoy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Visitas hoy"
          value={stats?.totalVisitsToday ?? 0}
          icon={Eye}
          subtitle={`${stats?.failedVisitsToday ?? 0} fallidas`}
          loading={loading}
        />
        <StatCard
          title="Tasa de éxito"
          value={`${successRate}%`}
          icon={CheckCircle2}
          subtitle={`${stats?.successfulVisitsToday ?? 0} de ${stats?.totalVisitsToday ?? 0}`}
          loading={loading}
        />
        <StatCard
          title="Campañas activas"
          value={stats?.activeCampaigns ?? 0}
          icon={Target}
          subtitle={`${stats?.totalCampaigns ?? 0} totales`}
          loading={loading}
        />
        <StatCard
          title="Proxies sanos"
          value={stats?.healthyProxies ?? 0}
          icon={Globe}
          subtitle={`${stats?.totalProxies ?? 0} totales`}
          loading={loading}
        />
        <StatCard
          title="Tasa CAPTCHA"
          value={`${captchaRate}%`}
          icon={ShieldAlert}
          subtitle={`${stats?.captchaVisitsToday ?? 0} captchas hoy`}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Visitas por hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.visitsByHour || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="hour"
                    fontSize={12}
                    tickFormatter={(h) => `${h}h`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={12}
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    labelFormatter={(h) => `${h}:00`}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Visitas"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Posición media
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : stats?.avgPosition != null ? (
              <div className="flex h-52 flex-col items-center justify-center">
                <div className="text-6xl font-bold">
                  #{stats.avgPosition.toFixed(1)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  posición media en SERP hoy
                </p>
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center text-muted-foreground">
                Sin datos de posición
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Visitas recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stats?.recentVisits && stats.recentVisits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">
                      {visit.keyword}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColor(visit.status)}
                      >
                        {visit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {visit.serpPosition ? `#${visit.serpPosition}` : "-"}
                    </TableCell>
                    <TableCell>{visit.duration.toFixed(0)}s</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(visit.completedAt).toLocaleTimeString("es-ES")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Sin visitas recientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
