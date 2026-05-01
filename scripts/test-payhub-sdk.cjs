/* eslint-disable */
/**
 * Smoke test del Payments Hub usando wrappers public.payhub_*.
 *   node --env-file=.env scripts/test-payhub-sdk.cjs
 */
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const url = process.env.PAYHUB_SUPABASE_URL;
  const key = process.env.PAYHUB_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Faltan PAYHUB_SUPABASE_URL o PAYHUB_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log('\n🏦 Test 1: payhub_list_bank_accounts(poweria-legal)');
  const { data: banks, error: err1 } = await sb.rpc('payhub_list_bank_accounts', {
    p_app_slug: 'poweria-legal',
  });
  if (err1) { console.error('   ❌', err1.message); process.exit(2); }
  console.table(banks);

  console.log('\n📧 Test 2: payhub_get_notification_email(poweria-legal)');
  const { data: email, error: err2 } = await sb.rpc('payhub_get_notification_email', {
    p_app_slug: 'poweria-legal',
  });
  if (err2) { console.error('   ❌', err2.message); process.exit(3); }
  console.log('   →', email);

  console.log('\n📊 Test 3: payhub_compute_mrr(poweria-legal)');
  const { data: mrr, error: err3 } = await sb.rpc('payhub_compute_mrr', {
    p_app_slug: 'poweria-legal',
  });
  if (err3) { console.error('   ❌', err3.message); process.exit(4); }
  console.log('   MRR USD cents:', mrr, '(≈ $' + (Number(mrr) / 100).toFixed(2) + ')');

  console.log('\n💳 Test 4: payhub_record_payment (COP→USD FX snapshot)');
  const { data: pay, error: err4 } = await sb.rpc('payhub_record_payment', {
    p_app_slug: 'poweria-legal',
    p_external_user_id: 'sdk-smoke-' + Date.now(),
    p_user_email: 'sdk-smoke@example.com',
    p_user_full_name: 'SDK Smoke Test',
    p_amount_cents: 50000000,
    p_currency: 'COP',
    p_provider: 'bank_transfer',
    p_type: 'subscription',
    p_metadata: { test: true, plan_code: 'pro' },
  });
  if (err4) { console.error('   ❌', err4.message); process.exit(5); }
  console.log('   ✅', pay);

  console.log('\n📥 Test 5: payhub_attach_receipt + payhub_get_payment');
  const paymentId = pay.payment_id;
  const { error: err5 } = await sb.rpc('payhub_attach_receipt', {
    p_payment_id: paymentId,
    p_proof_url: 'https://example.com/proof/test.jpg',
  });
  if (err5) { console.error('   ❌', err5.message); process.exit(6); }
  const { data: stored } = await sb.rpc('payhub_get_payment', { p_payment_id: paymentId });
  console.log('   proof_url:', stored.proof_url);
  console.log('   status:   ', stored.status);

  // Cleanup
  await sb.from('payment_events').delete().eq('payment_id', paymentId);
  await sb.from('payments').delete().eq('id', paymentId);
  await sb.from('app_users').delete().like('external_user_id', 'sdk-smoke-%');
  console.log('   🧹 cleanup OK');

  console.log('\n✅ 5/5 smoke tests pasaron.\n');
})().catch((err) => {
  console.error('❌ FATAL:', err.message || err);
  process.exit(99);
});
