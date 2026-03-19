// src/utils/cache.js — CLEAN VERSION
import Redis from 'ioredis'

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null

export const withCache = async (key, ttlSeconds, fetchFn) => {
    if (!redis) return fetchFn()  // gracefully degrade if Redis not configured
    
    try {
        const cached = await redis.get(key)
        if (cached) return JSON.parse(cached)
        
        const data = await fetchFn()
        if (data !== null && data !== undefined) {
            await redis.setex(key, ttlSeconds, JSON.stringify(data))
        }
        return data
    } catch (err) {
        // Redis failure should not break the app
        console.error('Cache error:', err.message)
        return fetchFn()
    }
}