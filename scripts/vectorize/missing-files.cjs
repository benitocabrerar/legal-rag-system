require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const SRC = 'C:/Users/benito/Downloads/leyes legal ecuador';
const SKIP = new Set(['Ley-Organica poder del mercado.pdf']); // pdf-parse hangs

(async () => {
  const files = fs.readdirSync(SRC).filter(f => /\.(pdf|docx)$/i.test(f)).sort();
  const ids = files.map(f => crypto.createHash('md5').update(f).digest('hex'));
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    `SELECT id FROM public.legal_documents WHERE id = ANY($1)`,
    [ids]
  );
  const existing = new Set(r.rows.map(x => x.id));
  await c.end();
  const missing = files.filter((f, i) => !existing.has(ids[i]) && !SKIP.has(f));
  console.log(`Total: ${files.length}  Existing in DB: ${existing.size}  Skip-list: ${SKIP.size}  Missing: ${missing.length}`);
  console.log('---');
  missing.forEach(f => console.log(f));
})();
