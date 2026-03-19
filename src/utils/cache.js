// src/utils/cache.js
import Redis from 'ioredis'

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
    })
    : null

if (redis) {
    redis.on('error', (err) => console.error('Redis error:', err.message))
    redis.on('connect', () => console.info('Redis connected'))
}

export const withCache = async (key, ttlSeconds, fetchFn) => {
    if (!redis) return fetchFn()

    try {
        const cached = await redis.get(key)
        if (cached) return JSON.parse(cached)

        const data = await fetchFn()
        if (data !== null && data !== undefined) {
            await redis.setex(key, ttlSeconds, JSON.stringify(data))
        }
        return data
    } catch (err) {
        console.error('Cache error, falling through to DB:', err.message)
        return fetchFn()
    }
}

// ← ADD THIS EXPORT
export const invalidateCache = async (pattern) => {
    if (!redis) return
    try {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) await redis.del(...keys)
    } catch (err) {
        console.error('Cache invalidation error:', err.message)
    }
}