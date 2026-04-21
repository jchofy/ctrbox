export const DEFAULT_SETTINGS: Record<
  string,
  { value: string; description: string }
> = {
  // Schedule
  schedule_start_hour: {
    value: "8",
    description: "Hora de inicio de actividad (0-23)",
  },
  schedule_end_hour: {
    value: "22",
    description: "Hora de fin de actividad (0-23)",
  },
  peak_hours: {
    value: "10,11,12,13,14,18,19,20",
    description: "Horas punta separadas por comas",
  },
  peak_multiplier: {
    value: "1.5",
    description: "Multiplicador de visitas en horas punta",
  },

  // Concurrency
  max_concurrent_visits: {
    value: "1",
    description: "Visitas simultáneas máximas",
  },

  // Anti-detection thresholds
  mouse_variance_min: {
    value: "80",
    description: "Varianza mínima velocidad ratón",
  },
  mouse_variance_max: {
    value: "350",
    description: "Varianza máxima velocidad ratón",
  },
  typing_variance_min: {
    value: "25",
    description: "Varianza mínima duración tecleo (ms)",
  },
  typing_variance_max: {
    value: "45",
    description: "Varianza máxima duración tecleo (ms)",
  },
  scroll_variance_min: {
    value: "30",
    description: "Varianza mínima delta scroll (px)",
  },
  scroll_variance_max: {
    value: "80",
    description: "Varianza máxima delta scroll (px)",
  },
  max_events_per_second: {
    value: "30",
    description: "Eventos máximos por segundo (15-40)",
  },

  // CAPTCHA
  captcha_max_consecutive: {
    value: "5",
    description: "CAPTCHAs consecutivos antes de marcar proxy como unhealthy",
  },

  // Cleanup
  visits_retention_days: {
    value: "30",
    description: "Días de retención de visitas antiguas",
  },
};

export const SPANISH_VIEWPORTS = [
  { width: 1920, height: 1080, weight: 40 },
  { width: 1366, height: 768, weight: 25 },
  { width: 1536, height: 864, weight: 15 },
  { width: 1440, height: 900, weight: 10 },
  { width: 2560, height: 1440, weight: 10 },
];
