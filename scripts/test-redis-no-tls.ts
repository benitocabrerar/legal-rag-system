import Redis from 'ioredis';

async function testRedisNoTLS() {
  console.log('🔍 Testing Redis Cloud WITHOUT TLS...\n');

  const redis = new Redis({
    host: 'redis-12465.c85.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 12465,
    password: 'dkt07pUGLlqSEi2CQvAve949bee1OAr4',
    db: 0,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  try {
    console.log('Attempting PING without TLS...');
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}\n`);

    console.log('Attempting SET/GET...');
    await redis.set('test:week3', 'Success without TLS!', 'EX', 60);
    const value = await redis.get('test:week3');
    console.log(`✅ Value: ${value}\n`);

    console.log('🎉 Redis Cloud connected successfully WITHOUT TLS!');
  } catch (error) {
    console.error('❌ Connection failed:', error);

    console.log('\n🔄 Now trying WITH TLS...\n');

    const redisTLS = new Redis({
      host: 'redis-12465.c85.us-east-1-2.ec2.redns.redis-cloud.com',
      port: 12465,
      password: 'dkt07pUGLlqSEi2CQvAve949bee1OAr4',
      db: 0,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      },
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    try {
      const pongTLS = await redisTLS.ping();
      console.log(`✅ PING with TLS: ${pongTLS}\n`);
      console.log('🎉 TLS connection works!');
      await redisTLS.quit();
    } catch (tlsError) {
      console.error('❌ TLS connection also failed:', tlsError);
      process.exit(1);
    }

    process.exit(1);
  } finally {
    await redis.quit();
  }
}

testRedisNoTLS();
