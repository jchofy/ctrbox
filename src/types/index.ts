export type CampaignStatus = "active" | "paused" | "completed";

export type VisitStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "captcha"
  | "not_found"
  | "timeout";

export type ProxyProtocol = "http" | "https" | "socks5";

export type ProxyStatus = "unknown" | "healthy" | "unhealthy";

export type WorkerStatus = "running" | "stopped" | "paused";

export interface WorkerMessage {
  type:
    | "start"
    | "stop"
    | "pause"
    | "resume"
    | "status"
    | "status-response"
    | "visit-complete"
    | "visit-started"
    | "error";
  payload?: unknown;
}

export interface VisitResult {
  status: VisitStatus;
  serpPosition: number | null;
  pagesVisited: number;
  duration: number;
  userAgent: string;
  viewport: string;
  warmupDone: boolean;
  error?: string;
}

export interface BrowserPersona {
  userAgent: string;
  viewport: { width: number; height: number };
  platform: string;
  deviceMemory: number;
  hardwareConcurrency: number;
  locale: string;
  timezone: string;
}

export interface ProxyConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: ProxyProtocol;
  profilePath: string;
}
