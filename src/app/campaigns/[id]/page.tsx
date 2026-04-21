"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCampaign } from "@/hooks/use-campaigns";
import { cn } from "@/lib/utils";

const statusConfig = {
  active: {
    label: "Activa",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  paused: {
    label: "Pausada",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  completed: {
    label: "Completada",
    className: "bg-muted text-muted-foreground border-border",
  },
} as const;

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { campaign, loading, refetch } = useCampaign(id);

  const [addKeywordOpen, setAddKeywordOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState({
    keyword: "",
    targetUrl: "",
    dailyVisitTarget: 10,
  });
  const [submittingKeyword, setSubmittingKeyword] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  async function handleToggleStatus() {
    if (!campaign) return;
    setTogglingStatus(true);
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus === "active" ? "Campaña activada" : "Campaña pausada"
        );
        refetch();
      } else {
        toast.error("Error al cambiar el estado");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleAddKeyword() {
    if (!newKeyword.keyword.trim() || !newKeyword.targetUrl.trim()) {
      toast.error("Keyword y URL objetivo son obligatorios");
      return;
    }

    setSubmittingKeyword(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKeyword),
      });
      if (res.ok) {
        toast.success("Keyword añadida correctamente");
        setNewKeyword({ keyword: "", targetUrl: "", dailyVisitTarget: 10 });
        setAddKeywordOpen(false);
        refetch();
      } else {
        toast.error("Error al añadir la keyword");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSubmittingKeyword(false);
    }
  }

  async function handleDeleteKeyword(keywordId: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}/keywords?keywordId=${keywordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Keyword eliminada");
        refetch();
      } else {
        toast.error("Error al eliminar la keyword");
      }
    } catch {
      toast.error("Error de conexion");
    }
  }

  async function handleToggleKeyword(keywordId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/campaigns/${id}/keywords`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordId, isActive }),
      });
      if (res.ok) {
        refetch();
      } else {
        toast.error("Error al actualizar la keyword");
      }
    } catch {
      toast.error("Error de conexion");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
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

  const status = statusConfig[campaign.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/campaigns" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <Badge
                variant="outline"
                className={cn("border", status.className)}
              >
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{campaign.domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={togglingStatus}
            onClick={handleToggleStatus}
          >
            {campaign.status === "active" ? (
              <>
                <Pause className="size-3.5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Activar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/campaigns/${id}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuracion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Objetivo diario</p>
              <p className="font-medium">{campaign.dailyVisitTarget} visitas</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duracion visita</p>
              <p className="font-medium">
                {campaign.minVisitDuration}s - {campaign.maxVisitDuration}s
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Paginas por visita</p>
              <p className="font-medium">
                {campaign.minPagesPerVisit} - {campaign.maxPagesPerVisit}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Busquedas warmup</p>
              <p className="font-medium">
                {campaign.warmupSearches ? "Si" : "No"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Keywords</CardTitle>
            <CardDescription>
              {campaign.keywords?.length ?? 0} keywords configuradas
            </CardDescription>
          </div>
          <Dialog open={addKeywordOpen} onOpenChange={setAddKeywordOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="size-3.5" />
              Añadir Keyword
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Keyword</DialogTitle>
                <DialogDescription>
                  Configura una nueva keyword para esta campaña.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kw-keyword">Keyword</Label>
                  <Input
                    id="kw-keyword"
                    placeholder="comprar zapatos online"
                    value={newKeyword.keyword}
                    onChange={(e) =>
                      setNewKeyword((prev) => ({
                        ...prev,
                        keyword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kw-url">URL objetivo</Label>
                  <Input
                    id="kw-url"
                    placeholder="https://ejemplo.com/pagina"
                    value={newKeyword.targetUrl}
                    onChange={(e) =>
                      setNewKeyword((prev) => ({
                        ...prev,
                        targetUrl: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kw-target">Visitas diarias</Label>
                  <Input
                    id="kw-target"
                    type="number"
                    min={1}
                    value={newKeyword.dailyVisitTarget}
                    onChange={(e) =>
                      setNewKeyword((prev) => ({
                        ...prev,
                        dailyVisitTarget: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  disabled={submittingKeyword}
                  onClick={handleAddKeyword}
                >
                  {submittingKeyword ? "Añadiendo..." : "Añadir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!campaign.keywords || campaign.keywords.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                No hay keywords configuradas.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>URL objetivo</TableHead>
                    <TableHead className="text-center">Objetivo diario</TableHead>
                    <TableHead className="text-center">Posicion</TableHead>
                    <TableHead className="text-center">Activa</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.keywords.map((kw) => (
                    <TableRow key={kw.id}>
                      <TableCell className="font-medium">
                        {kw.keyword}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {kw.targetUrl}
                      </TableCell>
                      <TableCell className="text-center">
                        {kw.dailyVisitTarget}
                      </TableCell>
                      <TableCell className="text-center">
                        {kw.lastKnownPosition !== null
                          ? `#${kw.lastKnownPosition}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          size="sm"
                          checked={kw.isActive}
                          onCheckedChange={(checked) =>
                            handleToggleKeyword(kw.id, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" />
                            }
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Eliminar keyword
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Eliminar &quot;{kw.keyword}&quot;? Esta accion
                                no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleDeleteKeyword(kw.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Visits - placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Visitas recientes</CardTitle>
          <CardDescription>
            Ultimas visitas realizadas para esta campaña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              Las visitas recientes apareceran aqui cuando el worker este activo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
