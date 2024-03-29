import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL
const REDIS_PASSWORD = process.env.REDIS_PASSWORD

/**
 * Create a redis instance only for the duration of the function call
 */
export async function withRedis<T>(fn: (redis: Redis) => Promise<T>) {
  if (!REDIS_URL) {
    throw new Error('REDIS_URL not found in process.env')
  }
  const redis = new Redis(
    REDIS_URL,
    {
      family: 6,
      connectTimeout: 2000,
      commandTimeout: 2000,
      disconnectTimeout: 2000,
      password: REDIS_PASSWORD,
      reconnectOnError: () => 1
    }
  )
  redis.on('error', err => {
    console.error('Redis error: ', err)
  })
  const result = await fn(redis)
  await redis.quit()
  return result
}
