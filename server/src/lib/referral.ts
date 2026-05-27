import { prisma } from './db.js';

// 奖励规则（可配置）
const RULES = {
  rewardPerUnit: parseInt(process.env.REFERRAL_REWARD_PER_UNIT || '1'),   // 每亿配额 = 1 元
  minWithdrawal: parseInt(process.env.REFERRAL_MIN_WITHDRAWAL || '10'),   // 最低提现
  tierRates: [1.0, 0.1],  // 一级 100%, 二级 10%
};

// 消费后触发推荐奖励（单位：配额）
export async function triggerReferralReward(userId: string, quotaAmount: bigint) {
  const referral = await prisma.referral.findFirst({
    where: { referredId: userId },
    include: { referrer: true },
  });
  if (!referral) return;

  // 计算奖励配额：消费配额的 10%
  const rewardQuota = quotaAmount / BigInt(10);
  if (rewardQuota <= BigInt(0)) return;

  // 更新推荐人累计奖励
  await prisma.referral.update({
    where: { id: referral.id },
    data: { totalReward: { increment: rewardQuota } },
  });

  // 给推荐人发放奖励配额
  await prisma.subscription.create({
    data: {
      userId: referral.referrerId,
      type: 'PAY_AS_YOU_GO',
      quotaTotal: rewardQuota,
      startsAt: new Date(),
      expiresAt: null,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: referral.referrerId,
      type: 'REFERRAL_REWARD',
      amount: 0,
      quotaAmount: rewardQuota,
      description: '推荐奖励：好友消费返佣',
    },
  });
}

export function getReferralRules() {
  return RULES;
}
