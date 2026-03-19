// src/utils/cache.js
import Redis from 'ioredis'

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null

export const withCache = async (key, ttlSeconds, fetchFn) => {
    if (!redis) return fetchFn()  // gracefully degrade if Redis not configured
    
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)
    
    const data = await fetchFn()
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
    return data
}

// Usage in getAllVideos controller:
const videos = await withCache(
    `videos:${page}:${limit}:${category}`,
    60,  // 60 second TTL
    async () => Video.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).lean()
)