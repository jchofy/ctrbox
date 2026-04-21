"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useCampaigns, type Campaign } from "@/hooks/use-campaigns";
import { useDomain } from "@/hooks/use-domain";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  Campaign["status"],
  { label: string; className: string }
> = {
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
};

export default function CampaignsPage() {
  const { domain } = useDomain();
  const { campaigns, loading, refetch } = useCampaigns(domain);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Campaña eliminada correctamente");
        refetch();
      } else {
        toast.error("Error al eliminar la campaña");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus campañas de CTR.
          </p>
        </div>
        <Button render={<Link href="/campaigns/new" />}>
          <Plus className="size-4" />
          Nueva Campaña
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No hay campañas creadas.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/campaigns/new" />}
          >
            <Plus className="size-4" />
            Crear primera campaña
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dominio</TableHead>
                <TableHead className="text-center">Keywords</TableHead>
                <TableHead className="text-center">Objetivo diario</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const status = statusConfig[campaign.status];
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {campaign.domain}
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.keywords?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.dailyVisitTarget}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn("border", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={
                            <Link href={`/campaigns/${campaign.id}/edit`} />
                          }
                        >
                          <Pencil className="size-3.5" />
                        </Button>

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
                                Eliminar campaña
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estas seguro de que quieres eliminar &quot;{campaign.name}&quot;?
                                Esta accion no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={deletingId === campaign.id}
                                onClick={() => handleDelete(campaign.id)}
                              >
                                {deletingId === campaign.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
