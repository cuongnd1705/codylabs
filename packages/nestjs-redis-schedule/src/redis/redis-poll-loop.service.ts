import { Injectable, Logger } from '@nestjs/common';
import { Cron as CronScheduler } from 'croner';
import { setTimeout as sleep } from 'node:timers/promises';

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

interface ClaimedJob {
  name: string;
  score: number;
  claimId?: string;
  attempt: number;
  retry: boolean;
}

@Injectable()
export class RedisPollLoop {
  private readonly logger = new Logger(RedisPollLoop.name);
  private running = false;
  private abortController?: AbortController;
  private readonly jobs = new Map<string, CronJobEntry>();
  private readonly inFlight = new Set<Promise<unknown>>();
  private readonly heartbeatRefs = new Set<NodeJS.Timeout>();

  constructor(private readonly store: RedisJobStore) {}

  registerJob(entry: CronJobEntry): void {
    this.jobs.set(entry.name, entry);
  }

  unregisterJob(name: string): void {
    this.jobs.delete(name);
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.abortController = new AbortController();
    void this.loop(this.abortController.signal);
  }

  async stop(shutdownTimeout = 5000): Promise<void> {
    this.running = false;
    this.abortController?.abort();

    if (this.inFlight.size > 0) {
      let deadlineRef: NodeJS.Timeout | undefined;
      const deadline = new Promise<void>((resolve) => {
        deadlineRef = setTimeout(resolve, shutdownTimeout);
      });
      // oxlint-disable-next-line unicorn/no-useless-spread
      await Promise.race([Promise.allSettled([...this.inFlight]), deadline]);
      if (deadlineRef) {
        clearTimeout(deadlineRef);
      }
    }
    for (const heartbeat of this.heartbeatRefs) {
      clearInterval(heartbeat);
    }
    this.heartbeatRefs.clear();
  }

  private async loop(signal: AbortSignal): Promise<void> {
    while (this.running && !signal.aborted) {
      try {
        const recoveryTime = await this.store.getTime();
        const recovered = await this.store.reclaimExpiredJob(recoveryTime);
        if (recovered) {
          await this.processClaim(recovered, recoveryTime);
          continue;
        }

        const next = await this.store.peekNextJob();
        const now = await this.store.getTime();
        if (signal.aborted) {
          break;
        }

        if (!next) {
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);

          continue;
        }

        if (next.score > now) {
          await this.interruptibleSleep(Math.min(next.score - now, MAX_POLL_INTERVAL_MS), signal);
          if (signal.aborted) {
            break;
          }
        }

        const claimedAt = await this.store.getTime();
        const claimed = await this.store.claimDueJob(claimedAt);

        if (!claimed) {
          continue;
        }

        await this.processClaim(claimed, claimedAt);
      } catch (error: unknown) {
        if (!signal.aborted) {
          this.logger.error('Poll loop error', error);
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);
        }
      }
    }
  }

  private async processClaim(claimed: ClaimedJob, claimedAt: number): Promise<void> {
    const entry = this.jobs.get(claimed.name);
    if (!entry) {
      this.logger.warn(`Claimed unknown job: ${claimed.name}`);
      if (claimed.claimId) {
        await this.store.acknowledgeJob(claimed.claimId);
      }
      return;
    }

    if (claimed.attempt > this.store.maxRetries) {
      this.logger.error(`Dropping job "${claimed.name}" after ${this.store.maxRetries} retries`);
      if (claimed.claimId) {
        await this.store.acknowledgeJob(claimed.claimId);
      }
      return;
    }

    if (!claimed.retry) {
      const nextTs = this.computeNextOccurrence(entry, claimedAt);
      await this.store.enqueueJob(claimed.name, nextTs);
    }

    if (!claimed.retry && claimedAt - claimed.score > entry.threshold) {
      this.logger.warn(
        `Skipping late job "${claimed.name}" (${claimedAt - claimed.score}ms overdue, threshold ${entry.threshold}ms)`,
      );
      if (claimed.claimId) {
        await this.store.acknowledgeJob(claimed.claimId);
      }
      return;
    }

    this.dispatchHandler(entry, claimed);
  }

  private dispatchHandler(entry: CronJobEntry, claimed: ClaimedJob): void {
    const promise = Promise.resolve()
      .then(() => entry.handler())
      .then(() => (claimed.claimId ? this.store.acknowledgeJob(claimed.claimId) : undefined));

    const heartbeat = claimed.claimId
      ? setInterval(
          () => {
            void this.renewLease(claimed.claimId!);
          },
          Math.max(1, Math.floor(this.store.leaseDuration / 3)),
        )
      : undefined;
    if (heartbeat) {
      this.heartbeatRefs.add(heartbeat);
    }

    const trackedPromise = promise
      .catch((error: unknown) => {
        this.logger.error(`Handler error for job "${entry.name}" (attempt ${claimed.attempt + 1})`, error);
      })
      .finally(() => {
        if (heartbeat) {
          clearInterval(heartbeat);
          this.heartbeatRefs.delete(heartbeat);
        }
        this.inFlight.delete(trackedPromise);
      });

    this.inFlight.add(trackedPromise);
  }

  private async renewLease(claimId: string): Promise<void> {
    try {
      const now = await this.store.getTime();
      await this.store.extendLease(claimId, now);
    } catch (error: unknown) {
      this.logger.error(`Failed to renew scheduler lease "${claimId}"`, error);
    }
  }

  private computeNextOccurrence(entry: CronJobEntry, redisTime: number): number {
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
      return redisTime + 86_400_000;
    }
    return next.getTime();
  }

  private async interruptibleSleep(ms: number, signal: AbortSignal): Promise<void> {
    try {
      await sleep(ms, undefined, { signal });
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        throw error;
      }
    }
  }
}
