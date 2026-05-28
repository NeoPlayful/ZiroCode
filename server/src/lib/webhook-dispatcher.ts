import crypto from 'crypto';
import { prisma } from './db.js';
import type { WebhookEvent } from '@prisma/client';

export async function dispatchWebhook(userId: string, event: WebhookEvent, data: any) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId, isActive: true, events: { has: event } },
  });

  for (const endpoint of endpoints) {
    dispatchToEndpoint(endpoint.id, event, data).catch(() => {});
  }
}

async function dispatchToEndpoint(endpointId: string, event: WebhookEvent, data: any) {
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) return;

  const payload = { event, timestamp: new Date().toISOString(), data };
  const signature = crypto.createHmac('sha256', endpoint.secret).update(JSON.stringify(payload)).digest('hex');

  let success = false;
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': `sha256=${signature}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = response.status;
      responseBody = await response.text();
      success = response.ok;

      if (success) {
        await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { lastSuccessAt: new Date() } });
        break;
      }
    } catch (error: any) {
      responseBody = error.message;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, [60000, 300000, 900000][attempt]));
    }
  }

  const durationMs = Date.now() - startTime;

  await prisma.webhookLog.create({
    data: { endpointId, event, statusCode, responseBody, success, durationMs },
  });

  if (!success) {
    await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { lastFailureAt: new Date() } });
  }
}
