import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/api-utils.js';
import { getReferralRules } from '../lib/referral.js';

export async function referralRoutes(app: FastifyInstance) {
  // 推荐统计
  app.get('/api/referral/stats', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);

      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { referralCode: true },
      });

      const referrals = await prisma.referral.findMany({
        where: { referrerId: user.userId },
        include: { referred: { select: { name: true, email: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const totalReward = referrals.reduce((sum, r) => sum + Number(r.totalReward), 0);
      const claimedReward = referrals.reduce((sum, r) => sum + Number(r.claimedReward), 0);
      const pendingReward = totalReward - claimedReward;

      return reply.send({
        referralCode: currentUser?.referralCode || '',
        stats: {
          totalReferrals: referrals.length,
          totalReward: totalReward / 100000000,  // 转为元
          claimedReward: claimedReward / 100000000,
          pendingReward: pendingReward / 100000000,
        },
        referrals: referrals.map(r => ({
          id: r.id,
          name: r.referred.name,
          email: r.referred.email,
          joinedAt: r.referred.createdAt,
          reward: Number(r.totalReward) / 100000000,
          claimed: Number(r.claimedReward) / 100000000,
        })),
        rules: getReferralRules(),
      });
    } catch (error) {
      console.error('Referral stats error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取推荐统计失败' } });
    }
  });

  // 领取奖励
  app.post('/api/referral/claim', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);

      const referrals = await prisma.referral.findMany({
        where: { referrerId: user.userId },
      });

      let totalPending = BigInt(0);
      for (const r of referrals) {
        totalPending += r.totalReward - r.claimedReward;
      }

      if (totalPending <= BigInt(0)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: '暂无待领取奖励' } });
      }

      // 检查最低提现
      const minQuota = BigInt(getReferralRules().minWithdrawal) * BigInt(100000000);
      if (totalPending < minQuota) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: `奖励未达到最低提现额度（${getReferralRules().minWithdrawal}元）` } });
      }

      // 创建提现申请
      const amount = Number(totalPending) / 100000000;
      await prisma.withdrawalRequest.create({
        data: { userId: user.userId, amount },
      });

      return reply.send({ ok: true, message: '提现申请已提交，等待管理员审核' });
    } catch (error) {
      console.error('Claim referral error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '领取失败' } });
    }
  });

  // 推荐数据分析
  app.get('/api/referral/analytics', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);

      const referrals = await prisma.referral.findMany({ where: { referrerId: user.userId } });
      const totalReferrals = referrals.length;
      const activeReferrals = referrals.filter(r => Number(r.totalReward) > 0).length;
      const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;
      const totalEarnings = referrals.reduce((sum, r) => sum + Number(r.totalReward), 0) / 100000000;

      return reply.send({
        analytics: {
          totalReferrals,
          activeReferrals,
          conversionRate: conversionRate.toFixed(2),
          totalEarnings: totalEarnings.toFixed(2),
        },
      });
    } catch (error) {
      console.error('Referral analytics error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取分析数据失败' } });
    }
  });

  // 推荐排行榜
  app.get('/api/referral/leaderboard', async (req, reply) => {
    try {
      const { sortBy = 'count' } = req.query as any;

      const referrers = await prisma.user.findMany({
        include: { referrals: true },
      });

      const leaderboard = referrers
        .map(u => ({
          name: u.name,
          referralCount: u.referrals.length,
          totalEarnings: u.referrals.reduce((sum, r) => sum + Number(r.totalReward), 0) / 100000000,
        }))
        .filter(u => u.referralCount > 0)
        .sort((a, b) => sortBy === 'earnings' ? b.totalEarnings - a.totalEarnings : b.referralCount - a.referralCount)
        .slice(0, 50);

      return reply.send({ leaderboard });
    } catch (error) {
      console.error('Referral leaderboard error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取排行榜失败' } });
    }
  });

  // 推荐链接统计
  app.get('/api/referral/link-stats', async (req, reply) => {
    try {
      const user = await requireAuth(req, reply);
      const referrals = await prisma.referral.findMany({ where: { referrerId: user.userId } });

      return reply.send({
        stats: {
          totalClicks: referrals.length,
          conversions: referrals.filter(r => Number(r.totalReward) > 0).length,
          conversionRate: referrals.length > 0 ? ((referrals.filter(r => Number(r.totalReward) > 0).length / referrals.length) * 100).toFixed(2) : '0.00',
        },
      });
    } catch (error) {
      console.error('Referral link stats error:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL', message: '获取链接统计失败' } });
    }
  });
}
