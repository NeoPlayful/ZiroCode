import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY 未配置');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-04-22.dahlia',
    });
  }
  return _stripe;
}

export async function getStripeOrNull(): Promise<Stripe | null> {
  try {
    return getStripe();
  } catch {
    return null;
  }
}

export const PRICE_IDS = {
  pay_as_you_go: process.env.STRIPE_PRICE_PAYG,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  permanent: process.env.STRIPE_PRICE_PERMANENT,
};

export function getStripePriceId(type: string): string | undefined {
  switch (type) {
    case 'PAY_AS_YOU_GO': return PRICE_IDS.pay_as_you_go;
    case 'MONTHLY': return PRICE_IDS.monthly;
    case 'PERMANENT': return PRICE_IDS.permanent;
    default: return undefined;
  }
}
