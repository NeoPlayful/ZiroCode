import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function cacheGet(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function cacheSet(key: string, value: string, ttl: number = 300): Promise<void> {
  await redis.setex(key, ttl, value);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}
