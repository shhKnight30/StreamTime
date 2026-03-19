import Redis from 'ioredis'

export const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
            if (times > 3) {
                // Stop retrying after 3 attempts — don't spam logs
                return null;
            }
            return Math.min(times * 500, 2000);
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,  // ← don't queue commands when disconnected
        lazyConnect: true,          // ← don't connect immediately on creation
    })
    : null

if (redis) {
    redis.on('error', (err) => {
        // Show the actual error, not just message (which can be undefined)
        console.error('Redis error:', err.code || err.message || String(err));
    });
    redis.on('connect', () => console.info('Redis connected'));
}

export const withCache = async (key, ttlSeconds, fetchFn) => {
    if (!redis) return fetchFn();

    try {
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);

        const data = await fetchFn();
        if (data !== null && data !== undefined) {
            await redis.setex(key, ttlSeconds, JSON.stringify(data));
        }
        return data;
    } catch (err) {
        // Cache miss — fall through to DB silently
        return fetchFn();
    }
};

export const invalidateCache = async (pattern) => {
    if (!redis) return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
    } catch (err) {
        // non-critical
    }
};