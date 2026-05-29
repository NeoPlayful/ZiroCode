import type { FastifyRequest, FastifyReply } from 'fastify';
import i18next from './index.js';

export function i18nMiddleware(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const acceptLanguage = req.headers['accept-language'];
  const lang = acceptLanguage?.split(',')[0]?.trim() || 'zh-CN';

  (req as any).t = i18next.getFixedT(lang);
  (req as any).language = lang;

  done();
}
