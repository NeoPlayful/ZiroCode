// 模型单价（每百万 token 的美元价格）
// 数据来源：各模型官方定价，可按需补充
export const MODEL_PRICES: Record<string, {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}> = {
  'gpt-4o':               { input: 2.50,   output: 10.00,  cacheWrite: 3.75,   cacheRead: 0.625 },
  'gpt-4o-mini':          { input: 0.15,   output: 0.60,   cacheWrite: 0.225,  cacheRead: 0.0375 },
  'gpt-4-turbo':          { input: 10.00,  output: 30.00,  cacheWrite: 15.00,  cacheRead: 2.50 },
  'gpt-3.5-turbo':        { input: 0.50,   output: 1.50,   cacheWrite: 0.75,   cacheRead: 0.125 },
  'gpt-4':                { input: 30.00,  output: 60.00,  cacheWrite: 45.00,  cacheRead: 7.50 },
  'claude-sonnet-4-6':    { input: 3.00,   output: 15.00,  cacheWrite: 3.75,   cacheRead: 0.30 },
  'claude-3-5-sonnet':    { input: 3.00,   output: 15.00,  cacheWrite: 3.75,   cacheRead: 0.30 },
  'claude-3-opus':        { input: 15.00,  output: 75.00,  cacheWrite: 18.75,  cacheRead: 1.50 },
  'claude-3-haiku':       { input: 0.25,   output: 1.25,   cacheWrite: 0.3125, cacheRead: 0.025 },
};

export function getModelPrice(model: string) {
  // Try exact match first, then prefix match
  if (MODEL_PRICES[model]) return MODEL_PRICES[model];
  for (const [key, price] of Object.entries(MODEL_PRICES)) {
    if (model.startsWith(key)) return price;
  }
  // Default fallback pricing
  return { input: 0.75, output: 3.75, cacheWrite: 0.9375, cacheRead: 0.075 };
}

// 1 美元 = 1,000,000 额度
export const QUOTA_PER_DOLLAR = 1_000_000;
