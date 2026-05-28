import { prisma } from './db.js';
import type { FraudType } from '@prisma/client';

const FRAUD_RULES = {
  SAME_IP_LIMIT: 3,
  MIN_REGISTRATION_INTERVAL: 300,
  MIN_FIRST_PURCHASE_DELAY: 3600,
};

export async function detectFraud(referralId: string, context: { ip?: string; deviceId?: string }): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { id: referralId }, include: { referrer: true, referred: true } });
  if (!referral) return;

  const fraudTypes: { type: FraudType; evidence: any }[] = [];

  if (context.ip) {
    const sameIpCount = await prisma.user.count({ where: { id: { in: await getUserIdsByIp(context.ip) } } });
    if (sameIpCount > FRAUD_RULES.SAME_IP_LIMIT) {
      fraudTypes.push({ type: 'SAME_IP', evidence: { ip: context.ip, count: sameIpCount } });
    }
  }

  const recentReferrals = await prisma.referral.findMany({
    where: { referrerId: referral.referrerId, createdAt: { gte: new Date(Date.now() - FRAUD_RULES.MIN_REGISTRATION_INTERVAL * 1000) } },
  });
  if (recentReferrals.length > 1) {
    fraudTypes.push({ type: 'RAPID_REGISTRATION', evidence: { count: recentReferrals.length, interval: FRAUD_RULES.MIN_REGISTRATION_INTERVAL } });
  }

  for (const fraud of fraudTypes) {
    await prisma.referralFraudLog.create({ data: { referralId, fraudType: fraud.type, evidence: fraud.evidence } });
  }
}

async function getUserIdsByIp(ip: string): Promise<string[]> {
  return [];
}
