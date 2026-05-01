import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

async function testRedisSimple() {
  const redisUrl = 'rediss://default:dkt07pUGLlqSEi2CQvAve949bee1OAr4@redis-12465.c85.us-east-1-2.ec2.redns.redis-cloud.com:12465';

  console.log('🔍 Testing Redis Cloud with hardcoded URL...\n');
  console.log('Redis URL:', redisUrl.replace(/:[^:@]+@/, ':***@'), '\n');

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableReadyCheck: false,
    tls: {
      rejectUnauthorized: false
    },
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  try {
    console.log('Attempting PING...');
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}\n`);

    console.log('Attempting SET/GET...');
    await redis.set('test:week3', 'Success!', 'EX', 60);
    const value = await redis.get('test:week3');
    console.log(`✅ Value: ${value}\n`);

    console.log('🎉 Redis Cloud connected successfully!');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

testRedisSimple();
