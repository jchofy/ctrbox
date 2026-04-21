import { logger } from "@/lib/logger";
import {
  startScheduler,
  stopScheduler,
  pauseScheduler,
  resumeScheduler,
  getSchedulerStats,
} from "./scheduler";

let workerStatus: "running" | "stopped" | "paused" = "stopped";

export function getWorkerStatus() {
  return workerStatus;
}

export function startWorker(): void {
  if (workerStatus === "running") {
    logger.warn("Worker already running");
    return;
  }

  startScheduler();
  workerStatus = "running";
  logger.info("Worker started");
}

export function stopWorker(): void {
  stopScheduler();
  workerStatus = "stopped";
  logger.info("Worker stopped");
}

export function pauseWorker(): void {
  if (workerStatus !== "running") return;
  pauseScheduler();
  workerStatus = "paused";
  logger.info("Worker paused");
}

export function resumeWorker(): void {
  if (workerStatus !== "paused") return;
  resumeScheduler();
  workerStatus = "running";
  logger.info("Worker resumed");
}

export function getWorkerInfo() {
  const schedulerStats = getSchedulerStats();
  return {
    status: workerStatus,
    ...schedulerStats,
  };
}
