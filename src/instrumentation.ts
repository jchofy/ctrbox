export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/lib/logger");

    logger.info("CTRBox instrumentation registered");

    // Auto-start worker if enabled
    if (process.env.WORKER_ENABLED === "true") {
      const { startWorker } = await import("@/worker");
      logger.info("Auto-starting worker...");
      startWorker();
    }
  }
}
