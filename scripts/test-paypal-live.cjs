/* eslint-disable */
/**
 * Smoke test PayPal LIVE: OAuth + create Order + webhook signature path.
 *   node --env-file=.env scripts/test-paypal-live.cjs
 */
(async () => {
  const MODE = (process.env.PAYPAL_MODE || 'live').toLowerCase();
  const BASE = MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) { console.error('❌ Falta PAYPAL_CLIENT_ID/SECRET'); process.exit(1); }

  console.log(`\n🅿️  PayPal ${MODE.toUpperCase()} — base: ${BASE}\n`);

  // 1. OAuth token
  console.log('1️⃣  POST /v1/oauth2/token');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const tk = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!tk.ok) { console.error('   ❌', tk.status, await tk.text()); process.exit(2); }
  const tkData = await tk.json();
  console.log(`   ✅ token (expires_in=${tkData.expires_in}s)`);

  // 2. Create Order (1 USD test)
  console.log('\n2️⃣  POST /v2/checkout/orders (1 USD test)');
  const ord = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tkData.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: '1.00' }, custom_id: 'smoke-test' }],
      application_context: {
        brand_name: 'COGNITEX',
        return_url: 'http://localhost:3000/payment/test?paypal=success',
        cancel_url: 'http://localhost:3000/payment/test?paypal=cancel',
      },
    }),
  });
  if (!ord.ok) { console.error('   ❌', ord.status, await ord.text()); process.exit(3); }
  const order = await ord.json();
  console.log(`   ✅ orderId: ${order.id} status: ${order.status}`);
  const approveLink = order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href;
  console.log(`   approveUrl: ${approveLink || '(none)'}`);

  // 3. Webhook config
  console.log('\n3️⃣  GET /v1/notifications/webhooks');
  const hooks = await fetch(`${BASE}/v1/notifications/webhooks`, {
    headers: { Authorization: `Bearer ${tkData.access_token}` },
  });
  if (hooks.ok) {
    const hd = await hooks.json();
    const our = (hd.webhooks || []).find((w) => w.id === process.env.PAYPAL_WEBHOOK_ID);
    if (our) {
      console.log(`   ✅ Webhook ${our.id} → ${our.url}`);
      console.log(`   eventos: ${(our.event_types || []).map((e) => e.name).slice(0, 6).join(', ')}…`);
    } else {
      console.log(`   ⚠️  Webhook ID ${process.env.PAYPAL_WEBHOOK_ID} no encontrado en la cuenta`);
    }
  }

  console.log('\n✅ PayPal LIVE responde. Credenciales válidas. Order creada en producción.');
  console.log(`   ℹ️  Revisá la order en https://www.paypal.com/activity/payment/${order.id}`);
})().catch((e) => { console.error('FATAL:', e); process.exit(99); });
