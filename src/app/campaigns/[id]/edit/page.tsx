"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCampaign } from "@/hooks/use-campaigns";

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { campaign, loading } = useCampaign(id);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    dailyVisitTarget: 50,
    minVisitDuration: 30,
    maxVisitDuration: 120,
    minPagesPerVisit: 1,
    maxPagesPerVisit: 3,
    warmupSearches: true,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (campaign && !initialized) {
      setForm({
        name: campaign.name,
        domain: campaign.domain,
        dailyVisitTarget: campaign.dailyVisitTarget,
        minVisitDuration: campaign.minVisitDuration,
        maxVisitDuration: campaign.maxVisitDuration,
        minPagesPerVisit: campaign.minPagesPerVisit,
        maxPagesPerVisit: campaign.maxPagesPerVisit,
        warmupSearches: campaign.warmupSearches,
      });
      setInitialized(true);
    }
  }, [campaign, initialized]);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.domain.trim()) {
      toast.error("Nombre y dominio son obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Campaña actualizada correctamente");
        router.push(`/campaigns/${id}`);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Error al actualizar la campaña");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-muted-foreground">Campaña no encontrada.</p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href="/campaigns" />}
        >
          Volver a campañas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/campaigns/${id}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar Campaña
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifica los parametros de &quot;{campaign.name}&quot;.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informacion basica</CardTitle>
            <CardDescription>
              Nombre y dominio objetivo de la campaña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Mi campaña"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio</Label>
                <Input
                  id="domain"
                  placeholder="ejemplo.com"
                  value={form.domain}
                  onChange={(e) => updateField("domain", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyVisitTarget">
                Objetivo de visitas diarias
              </Label>
              <Input
                id="dailyVisitTarget"
                type="number"
                min={1}
                value={form.dailyVisitTarget}
                onChange={(e) =>
                  updateField("dailyVisitTarget", Number(e.target.value))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Visit Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuracion de visitas</CardTitle>
            <CardDescription>
              Duracion y comportamiento de cada visita simulada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minVisitDuration">
                  Duracion minima (segundos)
                </Label>
                <Input
                  id="minVisitDuration"
                  type="number"
                  min={5}
                  value={form.minVisitDuration}
                  onChange={(e) =>
                    updateField("minVisitDuration", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxVisitDuration">
                  Duracion maxima (segundos)
                </Label>
                <Input
                  id="maxVisitDuration"
                  type="number"
                  min={5}
                  value={form.maxVisitDuration}
                  onChange={(e) =>
                    updateField("maxVisitDuration", Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minPagesPerVisit">
                  Paginas minimas por visita
                </Label>
                <Input
                  id="minPagesPerVisit"
                  type="number"
                  min={1}
                  value={form.minPagesPerVisit}
                  onChange={(e) =>
                    updateField("minPagesPerVisit", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPagesPerVisit">
                  Paginas maximas por visita
                </Label>
                <Input
                  id="maxPagesPerVisit"
                  type="number"
                  min={1}
                  value={form.maxPagesPerVisit}
                  onChange={(e) =>
                    updateField("maxPagesPerVisit", Number(e.target.value))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="warmupSearches">
                  Busquedas de calentamiento
                </Label>
                <p className="text-xs text-muted-foreground">
                  Realizar busquedas previas para simular comportamiento
                  natural.
                </p>
              </div>
              <Switch
                id="warmupSearches"
                checked={form.warmupSearches}
                onCheckedChange={(checked) =>
                  updateField("warmupSearches", !!checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href={`/campaigns/${id}`} />}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
