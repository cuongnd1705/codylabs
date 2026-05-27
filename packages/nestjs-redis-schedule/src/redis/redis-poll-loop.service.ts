import { Injectable, Logger } from '@nestjs/common';
import { Cron as CronScheduler } from 'croner';

import { RedisJobStore } from './redis-job-store.service';

const DEFAULT_EMPTY_SLEEP_MS = 1000;
const MAX_POLL_INTERVAL_MS = 60_000;

export interface CronJobEntry {
  name: string;
  expression: string;
  timeZone?: string;
  utcOffset?: number;
  threshold: number;
  handler: () => unknown;
}

@Injectable()
export class RedisPollLoop {
  private readonly logger = new Logger(RedisPollLoop.name);
  private running = false;
  private abortController?: AbortController;
  private readonly jobs = new Map<string, CronJobEntry>();
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(private readonly store: RedisJobStore) {}

  registerJob(entry: CronJobEntry): void {
    this.jobs.set(entry.name, entry);
  }

  unregisterJob(name: string): void {
    this.jobs.delete(name);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    void this.loop(this.abortController.signal);
  }

  async stop(shutdownTimeout = 5000): Promise<void> {
    this.running = false;
    this.abortController?.abort();

    if (this.inFlight.size > 0) {
      const deadline = new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout));
      // oxlint-disable-next-line unicorn/no-useless-spread
      await Promise.race([Promise.allSettled([...this.inFlight]), deadline]);
    }
  }

  private async loop(signal: AbortSignal): Promise<void> {
    while (this.running && !signal.aborted) {
      try {
        const next = await this.store.peekNextJob();
        const now = await this.store.getTime();

        if (!next) {
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);

          continue;
        }

        if (next.score > now) {
          await this.interruptibleSleep(Math.min(next.score - now, MAX_POLL_INTERVAL_MS), signal);
          if (signal.aborted) break;
        }

        const claimedAt = await this.store.getTime();
        const claimed = await this.store.claimDueJob(claimedAt);

        if (!claimed) {
          continue;
        }

        const entry = this.jobs.get(claimed.name);
        if (!entry) {
          this.logger.warn(`Claimed unknown job: ${claimed.name}`);
          continue;
        }
        const nextTs = this.computeNextOccurrence(entry);
        await this.store.enqueueJob(claimed.name, nextTs);

        if (claimedAt - claimed.score > entry.threshold) {
          this.logger.warn(
            `Skipping late job "${claimed.name}" (${claimedAt - claimed.score}ms overdue, threshold ${entry.threshold}ms)`,
          );
          continue;
        }

        this.dispatchHandler(entry);
      } catch (error: unknown) {
        if (!signal.aborted) {
          this.logger.error('Poll loop error', error);
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);
        }
      }
    }
  }

  private dispatchHandler(entry: CronJobEntry): void {
    const promise = Promise.resolve()
      .then(() => entry.handler())
      .catch((error: unknown) => {
        this.logger.error(`Handler error for job "${entry.name}"`, error);
      })
      .finally(() => {
        this.inFlight.delete(promise);
      });

    this.inFlight.add(promise);
  }

  private computeNextOccurrence(entry: CronJobEntry): number {
    const next = new CronScheduler(entry.expression, {
      paused: true,
      ...(entry.timeZone
        ? { timezone: entry.timeZone }
        : entry.utcOffset !== undefined
          ? { utcOffset: entry.utcOffset }
          : {}),
    }).nextRun();
    if (!next) {
      this.logger.error(`Cron expression "${entry.expression}" has no upcoming runs for job "${entry.name}".`);
      return Date.now() + 86_400_000;
    }
    return next.getTime();
  }

  private interruptibleSleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
