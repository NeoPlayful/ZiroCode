import { prisma } from './db.js';
import type { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content?: string,
  link?: string
) {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });

  // 检查用户偏好
  if (pref) {
    if (type === 'QUOTA_LOW' && !pref.quotaLow) return;
    if (type === 'QUOTA_EXHAUSTED' && !pref.quotaExhausted) return;
    if (type === 'SUBSCRIPTION_EXPIRING' && !pref.subscriptionExpiring) return;
  }

  return prisma.notification.create({
    data: { userId, type, title, content, link },
  });
}
