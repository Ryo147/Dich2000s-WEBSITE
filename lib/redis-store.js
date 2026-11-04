// Bộ chuyển Upstash Redis -> giao diện `store` mà lib/ratings-core.js cần.
import { Redis } from '@upstash/redis';

export function redisStore(redis = Redis.fromEnv()) {
  return {
    get: (k) => redis.get(k),
    set: (k, v, o) => redis.set(k, v, o || {}),
    del: (k) => redis.del(k),
    async incr(k, ttl) { const n = await redis.incr(k); if (n === 1 && ttl) await redis.expire(k, ttl); return n; },
    hget: (k, f) => redis.hget(k, f),
    hset: (k, o) => redis.hset(k, o),
    hdel: (k, f) => redis.hdel(k, f),
    hgetall: (k) => redis.hgetall(k),
    sadd: (k, m) => redis.sadd(k, m),
    srem: (k, m) => redis.srem(k, m),
    smembers: (k) => redis.smembers(k),
  };
}
