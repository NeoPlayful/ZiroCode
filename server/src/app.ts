import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth.js';
import { keyRoutes } from './routes/keys.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { userRoutes } from './routes/user.js';
import { v1Routes } from './routes/v1.js';
import { healthRoutes } from './routes/health.js';
import { paymentRoutes } from './routes/payments.js';
import { referralRoutes } from './routes/referral.js';
import { ticketRoutes } from './routes/tickets.js';
import { announcementRoutes } from './routes/announcements.js';
import { adminRoutes } from './routes/admin.js';

const app = Fastify({ logger: true });

async function start() {
  // Stripe Webhook 需要原始 body
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    try {
      const isWebhook = (_req.url === '/api/payments/webhook');
      if (isWebhook) {
        (_req as any).rawBody = body;
        done(null, JSON.parse(body.toString()));
      } else {
        done(null, JSON.parse(body.toString()));
      }
    } catch (err: any) {
      done(err, undefined);
    }
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
  await app.register(cookie);

  app.register(authRoutes);
  app.register(keyRoutes);
  app.register(subscriptionRoutes);
  app.register(userRoutes);
  app.register(v1Routes);
  app.register(healthRoutes);
  app.register(paymentRoutes);
  app.register(referralRoutes);
  app.register(ticketRoutes);
  app.register(announcementRoutes);
  app.register(adminRoutes);

  const port = parseInt(process.env.PORT || '4000');
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server running on http://localhost:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default app;
