import { logger } from "@/lib/logger";

interface QueueItem<T> {
  id: string;
  task: T;
  addedAt: Date;
}

export class VisitQueue<T> {
  private queue: QueueItem<T>[] = [];
  private running = 0;
  private maxConcurrency: number;
  private processor: (task: T) => Promise<void>;

  constructor(
    maxConcurrency: number,
    processor: (task: T) => Promise<void>
  ) {
    this.maxConcurrency = maxConcurrency;
    this.processor = processor;
  }

  get size(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.running;
  }

  setMaxConcurrency(max: number): void {
    this.maxConcurrency = max;
  }

  enqueue(id: string, task: T): void {
    // Don't add duplicates
    if (this.queue.some((item) => item.id === id)) {
      return;
    }

    this.queue.push({ id, task, addedAt: new Date() });
    logger.debug({ id, queueSize: this.queue.length }, "Task enqueued");
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    logger.debug(
      { id: item.id, running: this.running },
      "Processing task"
    );

    try {
      await this.processor(item.task);
    } catch (error) {
      logger.error({ id: item.id, error }, "Task processing failed");
    } finally {
      this.running--;
      // Process next item if available
      this.processNext();
    }
  }

  clear(): void {
    this.queue = [];
  }
}
