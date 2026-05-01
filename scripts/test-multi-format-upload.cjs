/**
 * Sube 4 tipos de archivos al caso demo para validar el extractor universal:
 *  - DOCX (Word)
 *  - XLSX (Excel)
 *  - PNG (imagen, prueba Vision)
 *  - TXT (texto plano)
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

const ADMIN_EMAIL = 'benitocabrera@hotmail.com';
const ADMIN_PWD = 'Benitomz2026$';
const CASE_ID = 'b064c849-7d5b-4bbb-9d8a-27f892ea4c98';

async function login() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD }),
  });
  return (await r.json()).access_token;
}

async function uploadFile(tok, buffer, filename, mime, title) {
  const form = new FormData();
  form.append('caseId', CASE_ID);
  form.append('title', title);
  form.append('file', new Blob([buffer], { type: mime }), filename);

  const r = await fetch('http://localhost:8000/api/v1/documents/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}` },
    body: form,
  });
  return { status: r.status, body: await r.json() };
}

(async () => {
  const tok = await login();
  console.log('logged in, uploading 4 files...\n');

  // 1. TXT (texto plano)
  const txtBuf = Buffer.from(
    'Este es un memorando de honorarios profesionales del 30 de abril de 2026.\n\nPor servicios legales prestados en el caso Galarza Ríos:\n- 12 horas de revisión documental @ $150/h = $1,800\n- 8 horas de redacción @ $200/h = $1,600\n- Total: $3,400 USD',
    'utf8'
  );
  let r = await uploadFile(tok, txtBuf, 'memorando.txt', 'text/plain', 'Memorando de honorarios');
  console.log('1) TXT:', r.status, JSON.stringify(r.body.document || r.body));

  // 2. CSV
  const csvBuf = Buffer.from(
    'Fecha,Concepto,Monto\n2026-01-15,Anticipo cliente,5000\n2026-02-20,Honorarios primera etapa,3400\n2026-03-10,Gastos peritaje,1200\n2026-04-05,Honorarios formulación,2800\nTOTAL,,12400',
    'utf8'
  );
  r = await uploadFile(tok, csvBuf, 'movimientos-financieros.csv', 'text/csv', 'Movimientos financieros del caso');
  console.log('2) CSV:', r.status, JSON.stringify(r.body.document || r.body));

  // 3. XLSX (generar uno simple)
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Fecha', 'Banco', 'Cuenta', 'Movimiento', 'Monto USD'],
    ['2021-08-15', 'Banco Pichincha', '2104783291', 'Depósito efectivo', 9847],
    ['2021-08-22', 'Banco Pichincha', '2104783291', 'Depósito efectivo', 9650],
    ['2021-09-01', 'Produbanco', '4287394821', 'Transferencia internacional', 250000],
    ['2022-03-12', 'Produbanco', '4287394821', 'Transferencia a Panamá', 1250000],
    ['', '', '', 'TOTAL operaciones atípicas', 1519497],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Operaciones');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  r = await uploadFile(
    tok,
    xlsxBuf,
    'operaciones-uafe.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Operaciones bancarias UAFE'
  );
  console.log('3) XLSX:', r.status, JSON.stringify(r.body.document || r.body));

  // 4. Imagen PNG pequeña con texto sintético (Vision)
  // Generamos una imagen 200x80 con la librería minimalista
  // Como no tenemos canvas server-side, descargamos una imagen de internet
  // o usamos una imagen ya en disco. Intentamos con un icono PNG existente.
  const iconPath = 'C:/Users/benito/poweria/legal/frontend/public/icons/icon-512x512.png';
  if (fs.existsSync(iconPath)) {
    const imgBuf = fs.readFileSync(iconPath);
    r = await uploadFile(tok, imgBuf, 'logo-test.png', 'image/png', 'Logo de prueba (Vision OCR)');
    console.log('4) PNG (Vision):', r.status, JSON.stringify(r.body.document || r.body).slice(0, 300));
  } else {
    console.log('4) PNG: skip (no test image)');
  }

  console.log('\n✓ Done');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
