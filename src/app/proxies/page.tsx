"use client";

import { useState } from "react";
import { useProxies, Proxy } from "@/hooks/use-proxies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  Trash2,
  Globe,
  Shield,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";

export default function ProxiesPage() {
  const { proxies, loading, refetch } = useProxies();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: "",
    username: "",
    password: "",
    protocol: "http" as "http" | "https" | "socks5",
  });
  const [bulkText, setBulkText] = useState("");

  async function handleAddProxy() {
    if (!form.host || !form.port) {
      toast.error("Host y puerto son obligatorios");
      return;
    }

    const res = await fetch("/api/proxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || `${form.host}:${form.port}`,
        host: form.host,
        port: parseInt(form.port),
        username: form.username,
        password: form.password,
        protocol: form.protocol,
      }),
    });

    if (res.ok) {
      toast.success("Proxy añadido");
      setAddOpen(false);
      setForm({ name: "", host: "", port: "", username: "", password: "", protocol: "http" });
      refetch();
    } else {
      toast.error("Error al añadir proxy");
    }
  }

  async function handleBulkImport() {
    if (!bulkText.trim()) {
      toast.error("Introduce al menos un proxy");
      return;
    }

    const res = await fetch("/api/proxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proxies: bulkText }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.created} proxies importados`);
      setBulkOpen(false);
      setBulkText("");
      refetch();
    } else {
      toast.error("Error al importar proxies");
    }
  }

  async function handleToggleActive(proxy: Proxy) {
    await fetch(`/api/proxies/${proxy.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !proxy.isActive }),
    });
    refetch();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/proxies/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Proxy eliminado");
      refetch();
    }
  }

  function statusIcon(status: string) {
    switch (status) {
      case "healthy":
        return <Shield className="h-4 w-4 text-green-500" />;
      case "unhealthy":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default:
        return <ShieldQuestion className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "healthy":
        return <Badge variant="outline" className="border-green-500 text-green-500">Sano</Badge>;
      case "unhealthy":
        return <Badge variant="outline" className="border-red-500 text-red-500">No sano</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proxies</h1>
          <p className="text-muted-foreground">Gestiona tus proxies residenciales</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger>
              <Button variant="outline" tabIndex={-1}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar proxies</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Proxies (uno por línea)</Label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`protocol://user:pass@host:port\nhost:port:user:pass\nhost:port`}
                    rows={8}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: protocol://user:pass@host:port, host:port:user:pass, host:port
                  </p>
                </div>
                <Button onClick={handleBulkImport} className="w-full">Importar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger>
              <Button tabIndex={-1}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Proxy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir proxy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre (opcional)</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Mi proxy"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Host</Label>
                    <Input
                      value={form.host}
                      onChange={(e) => setForm({ ...form, host: e.target.value })}
                      placeholder="proxy.example.com"
                    />
                  </div>
                  <div>
                    <Label>Puerto</Label>
                    <Input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm({ ...form, port: e.target.value })}
                      placeholder="8080"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Usuario</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Protocolo</Label>
                  <div className="flex gap-2 mt-1">
                    {(["http", "https", "socks5"] as const).map((p) => (
                      <Button
                        key={p}
                        variant={form.protocol === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setForm({ ...form, protocol: p })}
                      >
                        {p.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddProxy} className="w-full">Añadir</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : proxies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin proxies</h3>
            <p className="text-muted-foreground mb-4">
              Añade proxies residenciales para empezar
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {proxies.length} proxy{proxies.length !== 1 ? "s" : ""} configurado{proxies.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Servidor</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>CAPTCHAs</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-medium">{proxy.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {proxy.host}:{proxy.port}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{proxy.protocol.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcon(proxy.lastStatus)}
                        {statusBadge(proxy.lastStatus)}
                      </div>
                    </TableCell>
                    <TableCell>{proxy.totalUsed}</TableCell>
                    <TableCell>
                      <span className={proxy.captchaCount > 0 ? "text-yellow-500" : ""}>
                        {proxy.captchaCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={proxy.isActive}
                        onCheckedChange={() => handleToggleActive(proxy)}
                      />
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger>
                          <Button variant="ghost" size="icon" tabIndex={-1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar proxy</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará {proxy.name} permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(proxy.id)}>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
