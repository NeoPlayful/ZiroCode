import { prisma } from './db.js';

const RETENTION_DAYS = 30;
const HOURLY_RETENTION_DAYS = 90;

/**
 * 小时级聚合：扫描上一小时 ApiUsageLog → upsert ApiUsageHourly
 */
export async function aggregateHourly(): Promise<void> {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  hourStart.setHours(hourStart.getHours() - 1);

  const hourEnd = new Date(hourStart);
  hourEnd.setMinutes(59, 59, 999);

  const logs = await prisma.apiUsageLog.findMany({
    where: {
      requestTime: { gte: hourStart, lte: hourEnd },
    },
  });

  if (logs.length === 0) return;

  // Group by timeBucket + model + channelId + routePath
  const groups = new Map<string, {
    requestCount: number; successCount: number; errorCount: number;
    totalTokens: bigint; totalInputTokens: bigint; totalOutputTokens: bigint; totalCacheReadTokens: bigint; totalCacheWriteTokens: bigint;
    totalLatency: bigint; totalQuota: bigint;
  }>();

  for (const log of logs) {
    const bucket = new Date(log.requestTime);
    bucket.setMinutes(0, 0, 0);
    const key = `${bucket.toISOString()}|${log.model}|${log.channelId || ''}|${log.routePath || ''}`;

    const existing = groups.get(key) || {
      requestCount: 0, successCount: 0, errorCount: 0,
      totalTokens: BigInt(0), totalInputTokens: BigInt(0), totalOutputTokens: BigInt(0), totalCacheReadTokens: BigInt(0), totalCacheWriteTokens: BigInt(0),
      totalLatency: BigInt(0), totalQuota: BigInt(0),
    };

    existing.requestCount++;
    if (log.statusCode >= 200 && log.statusCode < 500) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }
    existing.totalTokens += BigInt(log.tokensUsed || 0);
    existing.totalInputTokens += BigInt(log.inputTokens || 0);
    existing.totalOutputTokens += BigInt(log.outputTokens || 0);
    existing.totalCacheReadTokens += BigInt(log.cacheReadTokens || 0);
    existing.totalCacheWriteTokens += BigInt(log.cacheCreationTokens || 0);
    existing.totalLatency += BigInt(log.latencyMs || 0);
    existing.totalQuota += log.quotaUsed;

    groups.set(key, existing);
  }

  // Upsert each group into ApiUsageHourly
  for (const [key, agg] of groups) {
    const [timeBucketStr, model, channelId, routePath] = key.split('|');
    const timeBucket = new Date(timeBucketStr);
    const chId = channelId || null;
    const rp = routePath || null;

    await prisma.apiUsageHourly.upsert({
      where: {
        timeBucket_model_channelId_routePath: {
          timeBucket, model,
          channelId: chId as any,
          routePath: rp as any,
        },
      },
      create: {
        timeBucket, model,
        channelId: channelId || null,
        routePath: routePath || null,
        ...agg,
      },
      update: {
        requestCount: { increment: agg.requestCount },
        successCount: { increment: agg.successCount },
        errorCount: { increment: agg.errorCount },
        totalTokens: { increment: agg.totalTokens },
        totalInputTokens: { increment: agg.totalInputTokens },
        totalOutputTokens: { increment: agg.totalOutputTokens },
        totalCacheReadTokens: { increment: agg.totalCacheReadTokens },
        totalCacheWriteTokens: { increment: agg.totalCacheWriteTokens },
        totalLatency: { increment: agg.totalLatency },
        totalQuota: { increment: agg.totalQuota },
      },
    });
  }
}

/**
 * 天级聚合：汇总 ApiUsageHourly → upsert ApiUsageDaily
 */
export async function aggregateDaily(): Promise<void> {
  const now = new Date();
  const dateStart = new Date(now);
  dateStart.setDate(dateStart.getDate() - 1);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(dateStart);
  dateEnd.setHours(23, 59, 59, 999);

  const hourlyRows = await prisma.apiUsageHourly.findMany({
    where: {
      timeBucket: { gte: dateStart, lte: dateEnd },
    },
  });

  if (hourlyRows.length === 0) return;

  // Group by date + model + channelId + routePath
  const groups = new Map<string, {
    requestCount: number; successCount: number; errorCount: number;
    totalTokens: bigint; totalInputTokens: bigint; totalOutputTokens: bigint; totalCacheReadTokens: bigint; totalCacheWriteTokens: bigint;
    totalLatency: bigint; totalQuota: bigint;
  }>();

  for (const row of hourlyRows) {
    const date = new Date(row.timeBucket);
    date.setHours(0, 0, 0, 0);
    const key = `${date.toISOString()}|${row.model}|${row.channelId || ''}|${row.routePath || ''}`;

    const existing = groups.get(key) || {
      requestCount: 0, successCount: 0, errorCount: 0,
      totalTokens: BigInt(0), totalInputTokens: BigInt(0), totalOutputTokens: BigInt(0), totalCacheReadTokens: BigInt(0), totalCacheWriteTokens: BigInt(0),
      totalLatency: BigInt(0), totalQuota: BigInt(0),
    };

    existing.requestCount += row.requestCount;
    existing.successCount += row.successCount;
    existing.errorCount += row.errorCount;
    existing.totalTokens += row.totalTokens;
    existing.totalInputTokens += row.totalInputTokens;
    existing.totalOutputTokens += row.totalOutputTokens;
    existing.totalCacheReadTokens += row.totalCacheReadTokens;
    existing.totalCacheWriteTokens += row.totalCacheWriteTokens;
    existing.totalLatency += row.totalLatency;
    existing.totalQuota += row.totalQuota;

    groups.set(key, existing);
  }

  for (const [key, agg] of groups) {
    const [dateStr, model, channelId, routePath] = key.split('|');
    const date = new Date(dateStr);
    const chId = channelId || null;
    const rp = routePath || null;

    await prisma.apiUsageDaily.upsert({
      where: {
        date_model_channelId_routePath: {
          date, model,
          channelId: chId as any,
          routePath: rp as any,
        },
      },
      create: {
        date, model,
        channelId: channelId || null,
        routePath: routePath || null,
        ...agg,
      },
      update: {
        requestCount: { increment: agg.requestCount },
        successCount: { increment: agg.successCount },
        errorCount: { increment: agg.errorCount },
        totalTokens: { increment: agg.totalTokens },
        totalInputTokens: { increment: agg.totalInputTokens },
        totalOutputTokens: { increment: agg.totalOutputTokens },
        totalCacheReadTokens: { increment: agg.totalCacheReadTokens },
        totalCacheWriteTokens: { increment: agg.totalCacheWriteTokens },
        totalLatency: { increment: agg.totalLatency },
        totalQuota: { increment: agg.totalQuota },
      },
    });
  }
}

/**
 * 清理过期的 ApiUsageLog
 */
export async function cleanExpiredLogs(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  await prisma.apiUsageLog.deleteMany({
    where: { requestTime: { lt: cutoff } },
  });
}

/**
 * 清理过期的 ApiUsageHourly
 */
export async function cleanExpiredHourly(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HOURLY_RETENTION_DAYS);

  await prisma.apiUsageHourly.deleteMany({
    where: { timeBucket: { lt: cutoff } },
  });
}
