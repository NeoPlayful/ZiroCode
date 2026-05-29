import { aggregateHourly, aggregateDaily, cleanExpiredLogs, cleanExpiredHourly } from './aggregator.js';

let hourlyInterval: ReturnType<typeof setInterval> | null = null;
let dailyInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 启动定时调度任务
 */
export function startScheduler(): void {
  // 小时级聚合：每小时整点执行
  scheduleAtMinute(0, async () => {
    try {
      await aggregateHourly();
    } catch (err) {
      console.error('Hourly aggregation failed:', err);
    }
  });
  hourlyInterval = setInterval(() => {
    const now = new Date();
    if (now.getMinutes() === 0) {
      aggregateHourly().catch(err => console.error('Hourly aggregation failed:', err));
    }
  }, 60000);

  // 天级聚合 + 清理：每天 00:05 执行
  scheduleAtTime(0, 5, async () => {
    try {
      await aggregateDaily();
    } catch (err) {
      console.error('Daily aggregation failed:', err);
    }
  });
  dailyInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 5) {
      aggregateDaily().catch(err => console.error('Daily aggregation failed:', err));
    }
  }, 60000);

  // 日志清理：每天 01:00 执行
  scheduleAtTime(1, 0, async () => {
    try {
      await cleanExpiredLogs();
      await cleanExpiredHourly();
    } catch (err) {
      console.error('Log cleanup failed:', err);
    }
  });
  cleanupInterval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 1 && now.getMinutes() === 0) {
      cleanExpiredLogs().catch(err => console.error('Log cleanup failed:', err));
      cleanExpiredHourly().catch(err => console.error('Hourly cleanup failed:', err));
    }
  }, 60000);
}

/**
 * 停止定时调度任务
 */
export function stopScheduler(): void {
  if (hourlyInterval) { clearInterval(hourlyInterval); hourlyInterval = null; }
  if (dailyInterval) { clearInterval(dailyInterval); dailyInterval = null; }
  if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }
}

/**
 * 在指定分钟执行（启动后首次）
 */
function scheduleAtMinute(minute: number, fn: () => void): void {
  const now = new Date();
  const target = new Date(now);
  target.setMinutes(minute, 0, 0);
  if (target <= now) target.setHours(target.getHours() + 1);
  const delay = target.getTime() - now.getTime();
  setTimeout(fn, delay);
}

/**
 * 在指定时间执行（启动后首次）
 */
function scheduleAtTime(hour: number, minute: number, fn: () => void): void {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  setTimeout(fn, delay);
}
