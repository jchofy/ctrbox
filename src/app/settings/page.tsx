"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SettingsMap {
  [key: string]: { value: string; description: string | null };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, string> = {};
    for (const [key, { value }] of Object.entries(settings)) {
      payload[key] = value;
    }

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Configuración guardada");
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: "Horarios",
      description: "Configura las horas de actividad del worker",
      keys: ["schedule_start_hour", "schedule_end_hour", "peak_hours", "peak_multiplier"],
    },
    {
      title: "Concurrencia",
      description: "Control de visitas simultáneas",
      keys: ["max_concurrent_visits"],
    },
    {
      title: "Anti-detección: Ratón",
      description: "Umbrales de varianza para movimientos de ratón (SearchGuard)",
      keys: ["mouse_variance_min", "mouse_variance_max"],
    },
    {
      title: "Anti-detección: Teclado",
      description: "Umbrales de varianza para tecleo (SearchGuard)",
      keys: ["typing_variance_min", "typing_variance_max"],
    },
    {
      title: "Anti-detección: Scroll",
      description: "Umbrales de varianza para scroll (SearchGuard)",
      keys: ["scroll_variance_min", "scroll_variance_max"],
    },
    {
      title: "Anti-detección: Eventos",
      description: "Límite de eventos por segundo",
      keys: ["max_events_per_second"],
    },
    {
      title: "CAPTCHA",
      description: "Configuración de manejo de CAPTCHAs",
      keys: ["captcha_max_consecutive"],
    },
    {
      title: "Limpieza",
      description: "Retención de datos",
      keys: ["visits_retention_days"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Ajustes globales del sistema</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.keys.map((key) => {
                  const setting = settings[key];
                  if (!setting) return null;
                  return (
                    <div key={key}>
                      <Label htmlFor={key} className="text-sm">
                        {setting.description || key}
                      </Label>
                      <Input
                        id={key}
                        value={setting.value}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{key}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
