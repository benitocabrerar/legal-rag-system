import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

async function testRedisConnection() {
  console.log('🔍 Testing Redis Cloud Connection...\n');

  // Use REDIS_URL if available (from .env)
  const redisUrl = process.env.REDIS_URL;

  // Redis Cloud does NOT use TLS on port 12465 (standard redis:// protocol)
  const redis = redisUrl
    ? new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        enableReadyCheck: false,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      })
    : new Redis({
        host: process.env.REDIS_HOST || 'redis-12465.c85.us-east-1-2.ec2.redns.redis-cloud.com',
        port: parseInt(process.env.REDIS_PORT || '12465'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        enableReadyCheck: false,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

  try {
    // Test 1: PING
    console.log('Test 1: PING command...');
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}\n`);

    // Test 2: SET/GET
    console.log('Test 2: SET/GET operations...');
    await redis.set('test:week3', 'Redis Cloud Connected!', 'EX', 60);
    const value = await redis.get('test:week3');
    console.log(`✅ SET/GET: ${value}\n`);

    // Test 3: Server Info
    console.log('Test 3: Server info...');
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    const mode = info.match(/redis_mode:([^\r\n]+)/)?.[1];
    console.log(`✅ Redis Version: ${version}`);
    console.log(`✅ Redis Mode: ${mode}\n`);

    // Test 4: Memory Info
    console.log('Test 4: Memory info...');
    const memory = await redis.info('memory');
    const usedMemory = memory.match(/used_memory_human:([^\r\n]+)/)?.[1];
    const maxMemory = memory.match(/maxmemory_human:([^\r\n]+)/)?.[1];
    console.log(`✅ Used Memory: ${usedMemory}`);
    console.log(`✅ Max Memory: ${maxMemory}\n`);

    // Test 5: Cache simulation
    console.log('Test 5: Multi-tier cache simulation...');
    const cacheKey = 'cache:test:query';
    const cacheValue = JSON.stringify({
      query: 'test search',
      results: ['doc1', 'doc2', 'doc3'],
      timestamp: Date.now(),
    });

    await redis.setex(cacheKey, 300, cacheValue); // 5 minutes TTL
    const cachedData = await redis.get(cacheKey);
    const ttl = await redis.ttl(cacheKey);

    console.log(`✅ Cache SET: ${cacheKey}`);
    console.log(`✅ Cache GET: ${cachedData ? 'Retrieved successfully' : 'Failed'}`);
    console.log(`✅ Cache TTL: ${ttl} seconds\n`);

    console.log('🎉 All Redis tests passed!\n');
    console.log('Redis Cloud is ready for Week 3 implementation.');

  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

testRedisConnection();
