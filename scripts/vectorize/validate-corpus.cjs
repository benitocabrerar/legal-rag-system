/**
 * Smoke test del corpus vectorizado: 5 queries representativas
 * cubriendo distintas áreas del derecho ecuatoriano.
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const QUERIES = [
  '¿Cuáles son los derechos humanos reconocidos en la Constitución?',
  'Penas por el delito de peculado',
  'Procedimiento de divorcio en el Código Civil',
  'Obligaciones tributarias del sujeto pasivo',
  'Causales de despido intempestivo en el Código del Trabajo',
];

(async () => {
  const lr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'benitocabrera@hotmail.com', password: 'Benitomz2026$' }),
  });
  const tok = (await lr.json()).access_token;

  for (const q of QUERIES) {
    console.log(`\n>>> ${q}`);
    const r = await fetch('http://localhost:8000/api/v1/search/legal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, matchCount: 3 }),
    });
    const d = await r.json();
    if (!d.results || d.results.length === 0) {
      console.log('  (sin resultados)');
      continue;
    }
    for (const x of d.results) {
      console.log(`  [${x.rrf_score?.toFixed(4)}] ${x.norm_title?.slice(0, 70)}`);
      console.log(`    ${(x.content || '').slice(0, 140).replace(/\n/g, ' ')}…`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
