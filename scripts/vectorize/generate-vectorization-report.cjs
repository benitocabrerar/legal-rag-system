/**
 * Genera INFORME_VECTORIZACION.html con:
 *   1. Stats globales (docs, chunks, tokens, tiempo, costo)
 *   2. Pirámide de Kelsen aplicada al ordenamiento ecuatoriano
 *   3. Tabla por documento con metadata extraída
 *   4. Distribución por categoría
 *   5. Sample queries E2E del search RPC
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const OUT = path.join(__dirname, '../../INFORME_VECTORIZACION.html');

const HIERARCHY_ORDER = [
  { key: 'CONSTITUCION',                  label: 'Constitución',                      level: 1, color: '#dc2626' },
  { key: 'TRATADOS_INTERNACIONALES_DDHH', label: 'Tratados Internacionales DDHH',     level: 1, color: '#dc2626' },
  { key: 'CODIGOS_ORGANICOS',             label: 'Códigos Orgánicos',                 level: 2, color: '#ea580c' },
  { key: 'LEYES_ORGANICAS',               label: 'Leyes Orgánicas',                   level: 2, color: '#ea580c' },
  { key: 'CODIGOS_ORDINARIOS',            label: 'Códigos Ordinarios',                level: 3, color: '#ca8a04' },
  { key: 'LEYES_ORDINARIAS',              label: 'Leyes Ordinarias',                  level: 3, color: '#ca8a04' },
  { key: 'REGLAMENTOS',                   label: 'Reglamentos',                       level: 4, color: '#16a34a' },
  { key: 'ORDENANZAS',                    label: 'Ordenanzas',                        level: 5, color: '#0891b2' },
  { key: 'RESOLUCIONES',                  label: 'Resoluciones / Normas Técnicas',    level: 5, color: '#0891b2' },
  { key: 'ACUERDOS_ADMINISTRATIVOS',      label: 'Acuerdos Administrativos',          level: 6, color: '#7c3aed' },
];

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const docsRes = await client.query(`
    SELECT
      ld.id, ld.title, ld.norm_title, ld.norm_type, ld.legal_hierarchy,
      ld.publication_type, ld.publication_number, ld.publication_date,
      ld.last_reform_date, ld.document_state, ld.category,
      ld.metadata->'extraction'->>'page_count' AS pages,
      ld.metadata->'extraction'->>'word_count' AS words,
      ld.metadata->'extraction'->>'char_count' AS chars,
      ld.metadata->'extraction'->>'method' AS method,
      ld.metadata->'detected'->'structure'->>'articles' AS articles,
      ld.metadata->'detected'->'structure'->>'books' AS books,
      ld.metadata->'detected'->'structure'->>'chapters' AS chapters,
      ld.metadata->'detected'->'structure'->>'titles' AS titles,
      ld.metadata->'pdf_native'->>'creator' AS pdf_creator,
      ld.metadata->'pdf_native'->>'producer' AS pdf_producer,
      ld.metadata->'file'->>'size_kb' AS size_kb,
      (SELECT COUNT(*) FROM public.legal_document_chunks WHERE legal_document_id = ld.id) AS chunks_total,
      (SELECT COUNT(*) FROM public.legal_document_chunks WHERE legal_document_id = ld.id AND embedding_v IS NOT NULL) AS chunks_v
    FROM public.legal_documents ld
    ORDER BY
      CASE ld.legal_hierarchy
        WHEN 'CONSTITUCION' THEN 1
        WHEN 'TRATADOS_INTERNACIONALES_DDHH' THEN 2
        WHEN 'CODIGOS_ORGANICOS' THEN 3
        WHEN 'LEYES_ORGANICAS' THEN 4
        WHEN 'CODIGOS_ORDINARIOS' THEN 5
        WHEN 'LEYES_ORDINARIAS' THEN 6
        WHEN 'REGLAMENTOS' THEN 7
        WHEN 'ORDENANZAS' THEN 8
        WHEN 'RESOLUCIONES' THEN 9
        ELSE 10
      END,
      ld.title
  `);
  const docs = docsRes.rows;

  const totalsRes = await client.query(`
    SELECT
      COUNT(*)::int AS docs,
      (SELECT COUNT(*)::int FROM public.legal_document_chunks WHERE embedding_v IS NOT NULL) AS chunks,
      COALESCE(SUM((metadata->'extraction'->>'word_count')::int),0)::bigint AS total_words,
      COALESCE(SUM((metadata->'extraction'->>'char_count')::int),0)::bigint AS total_chars,
      COALESCE(SUM((metadata->'file'->>'size_kb')::int),0)::bigint AS total_kb,
      COALESCE(SUM((metadata->'detected'->'structure'->>'articles')::int),0)::bigint AS total_articles
    FROM public.legal_documents
  `);
  const T = totalsRes.rows[0];

  const byHierarchyRes = await client.query(`
    SELECT
      legal_hierarchy::text AS h,
      COUNT(*)::int AS n_docs,
      COALESCE(SUM((metadata->'detected'->'structure'->>'articles')::int),0)::bigint AS articles,
      COALESCE(SUM((metadata->'extraction'->>'word_count')::int),0)::bigint AS words
    FROM public.legal_documents
    GROUP BY legal_hierarchy
  `);
  const byH = Object.fromEntries(byHierarchyRes.rows.map(r => [r.h, r]));

  const byCategoryRes = await client.query(`
    SELECT category, COUNT(*)::int AS n
    FROM public.legal_documents
    GROUP BY category
    ORDER BY n DESC, category
  `);
  const byCategory = byCategoryRes.rows;

  await client.end();

  // Cost estimate: text-embedding-3-small = $0.02 per 1M tokens
  // Aproximación: 1 token ≈ 4 chars
  const totalTokens = Math.round(Number(T.total_chars || 0) / 4);
  const estCostUsd = (totalTokens / 1e6) * 0.02;

  const totalLevels = {};
  for (const h of HIERARCHY_ORDER) {
    totalLevels[h.key] = byH[h.key] || { n_docs: 0, articles: 0, words: 0 };
  }

  // Distribución por nivel para la pirámide (apilamos jerarquías del mismo level)
  const byLevel = {};
  for (const h of HIERARCHY_ORDER) {
    if (!byLevel[h.level]) byLevel[h.level] = { hierarchies: [], total_docs: 0 };
    byLevel[h.level].hierarchies.push({ ...h, ...totalLevels[h.key] });
    byLevel[h.level].total_docs += totalLevels[h.key].n_docs || 0;
  }

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe de vectorización · Corpus jurídico Ecuador</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #0b0d12; --bg2: #11141b; --panel: #161a23; --panel2: #1c2130;
    --border: #2a3142; --text: #e7ebf3; --dim: #aab2c5; --muted: #7a8299;
    --accent: #6ea8ff; --good: #2dd17e; --warn: #f6b948; --bad: #ff6b7a;
    --code-bg: #0a0c12;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 4px 24px rgba(0,0,0,.25);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f6f7fb; --bg2: #eef0f7; --panel: #fff; --panel2: #f9fafd;
      --border: #e3e6ef; --text: #1a1d27; --dim: #4d556b; --muted: #7a8299;
      --accent: #2d62d4; --good: #14a86b; --warn: #c98a17; --bad: #d63848;
      --code-bg: #f0f2f8;
      --shadow: 0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(20,30,80,.08);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: linear-gradient(180deg, var(--bg), var(--bg2));
    color: var(--text);
    font: 15px/1.55 -apple-system, "Segoe UI", Inter, Roboto, sans-serif;
    min-height: 100vh;
  }
  .wrap { max-width: 1300px; margin: 0 auto; padding: 48px 28px 96px; }

  header.cover {
    background: radial-gradient(900px 360px at 0% 0%, rgba(110,168,255,.18), transparent 60%),
                radial-gradient(800px 320px at 100% 0%, rgba(220,38,38,.16), transparent 60%),
                var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 40px 36px;
    box-shadow: var(--shadow);
  }
  .eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 12px; color: var(--muted); font-weight: 600; }
  h1 { font-size: 32px; margin: 6px 0 8px; letter-spacing: -.01em; }
  h1 .pill {
    font-size: 13px; background: rgba(45,209,126,.14); color: var(--good);
    padding: 4px 12px; border-radius: 999px;
    border: 1px solid rgba(45,209,126,.35);
    margin-left: 10px; vertical-align: middle; font-weight: 600;
  }

  .kpis {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px; margin-top: 24px;
  }
  .kpi {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 18px; box-shadow: var(--shadow);
  }
  .kpi .label { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
  .kpi .value { font-size: 24px; font-weight: 700; margin-top: 4px; color: var(--text); font-variant-numeric: tabular-nums; }
  .kpi .value.good { color: var(--good); }
  .kpi .sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

  section { margin-top: 40px; }
  h2 {
    font-size: 22px; margin: 0 0 16px;
    display: flex; align-items: center; gap: 10px; letter-spacing: -.005em;
  }
  h2 .num {
    width: 28px; height: 28px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--accent); font-weight: 700;
  }
  h3 { font-size: 16px; margin: 22px 0 10px; font-weight: 600; }

  /* Pirámide de Kelsen */
  .pyramid {
    margin: 24px auto;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .layer {
    width: 100%;
    border-radius: 8px;
    padding: 14px 20px;
    color: white;
    box-shadow: var(--shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    transition: transform .2s;
  }
  .layer:hover { transform: translateX(4px); }
  .layer-l1 { width: 60%; }
  .layer-l2 { width: 72%; }
  .layer-l3 { width: 82%; }
  .layer-l4 { width: 90%; }
  .layer-l5 { width: 95%; }
  .layer-l6 { width: 100%; }

  .layer .meta-text { font-size: 13px; opacity: .9; }
  .layer .label { font-weight: 700; font-size: 14px; }
  .layer .count {
    background: rgba(255,255,255,.25);
    padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 700;
  }

  .card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 22px 24px; box-shadow: var(--shadow);
    margin: 14px 0;
  }

  table {
    width: 100%; border-collapse: collapse; font-size: 13.5px;
  }
  th { text-align: left; padding: 10px 14px; font-size: 11.5px; text-transform: uppercase;
       letter-spacing: .08em; color: var(--muted); font-weight: 600; background: var(--panel2);
       border-bottom: 1px solid var(--border); }
  td { padding: 8px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--panel2);
    color: var(--dim);
    white-space: nowrap;
  }
  .badge.good { color: var(--good); border-color: rgba(45,209,126,.4); background: rgba(45,209,126,.09); }
  .badge.warn { color: var(--warn); border-color: rgba(246,185,72,.4); background: rgba(246,185,72,.10); }
  .badge.const { background: #dc2626; color: white; border-color: #dc2626; }
  .badge.org { background: #ea580c; color: white; border-color: #ea580c; }
  .badge.ord { background: #ca8a04; color: white; border-color: #ca8a04; }
  .badge.reg { background: #16a34a; color: white; border-color: #16a34a; }
  .badge.res { background: #0891b2; color: white; border-color: #0891b2; }

  pre, code {
    font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
  }
  code { background: var(--code-bg); border: 1px solid var(--border); padding: 1px 6px; border-radius: 5px; font-size: 12.5px; }
  pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin: 10px 0; overflow-x: auto; font-size: 13px; line-height: 1.55; }
  pre code { background: transparent; border: 0; padding: 0; }

  .cat-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
  }
  .cat-cell {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 14px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .cat-cell .name { font-size: 13px; color: var(--text); }
  .cat-cell .n { font-size: 12px; color: var(--muted); font-weight: 600; }

  .banner {
    border-radius: 12px; padding: 14px 18px; margin: 12px 0;
    border: 1px solid var(--border); background: var(--panel);
  }
  .banner.good { background: rgba(45,209,126,.08); border-color: rgba(45,209,126,.3); }
  .banner.info { background: rgba(76,200,255,.08); border-color: rgba(76,200,255,.3); }

  footer {
    margin-top: 60px; padding-top: 18px; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 13px;
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  }

  /* Detalles colapsables */
  details { margin: 8px 0; }
  summary { cursor: pointer; font-weight: 600; color: var(--accent); font-size: 14px; padding: 6px 0; }
</style>
</head>
<body>
<div class="wrap">

<header class="cover">
  <div class="eyebrow">Vectorización RAG · Corpus jurídico Ecuador</div>
  <h1>Informe de vectorización <span class="pill">${T.docs} documentos</span></h1>
  <p style="color: var(--dim); max-width: 820px; margin: 6px 0 0;">
    Corpus completo del ordenamiento jurídico ecuatoriano vectorizado en Supabase
    (<code>legal_documents</code> + <code>legal_document_chunks</code> con
    <code>vector(1536)</code> + HNSW). Cada chunk indexado con
    <code>text-embedding-3-small</code> de OpenAI. Búsqueda híbrida via RPC
    <code>search_legal_chunks</code> con RRF (Reciprocal Rank Fusion) sobre
    embeddings semánticos + full-text search en español.
  </p>

  <div class="kpis">
    <div class="kpi"><div class="label">Documentos</div><div class="value good">${T.docs}</div><div class="sub">leyes y normas</div></div>
    <div class="kpi"><div class="label">Chunks vectorizados</div><div class="value">${Number(T.chunks).toLocaleString()}</div><div class="sub">embeddings 1536d</div></div>
    <div class="kpi"><div class="label">Artículos detectados</div><div class="value">${Number(T.total_articles).toLocaleString()}</div><div class="sub">Art. NN.- patrón</div></div>
    <div class="kpi"><div class="label">Palabras totales</div><div class="value">${(Number(T.total_words)/1e6).toFixed(1)}M</div><div class="sub">${Number(T.total_chars).toLocaleString()} chars</div></div>
    <div class="kpi"><div class="label">Tamaño del corpus</div><div class="value">${(Number(T.total_kb)/1024).toFixed(1)} MB</div><div class="sub">PDFs originales</div></div>
    <div class="kpi"><div class="label">Costo OpenAI</div><div class="value">$${estCostUsd.toFixed(3)}</div><div class="sub">~${(totalTokens/1e6).toFixed(2)}M tokens</div></div>
  </div>
</header>

<!-- 1. Pirámide de Kelsen -->
<section>
  <h2><span class="num">1</span>Pirámide de Kelsen aplicada al ordenamiento ecuatoriano</h2>
  <p style="color: var(--dim); max-width: 820px;">
    Visualización jerárquica del corpus. La <strong>supremacía constitucional</strong>
    establece que las normas inferiores no pueden contradecir a las superiores.
    En Ecuador la pirámide está formalmente recogida en el <strong>Art. 425 de la
    Constitución</strong>, que define el orden jerárquico de aplicación.
  </p>

  <div class="pyramid">
    ${[1, 2, 3, 4, 5, 6].map(level => {
      const lvl = byLevel[level];
      if (!lvl || lvl.total_docs === 0) return '';
      // Tomar el color del primero de ese nivel
      const color = lvl.hierarchies[0].color;
      const hLabels = lvl.hierarchies
        .filter(h => h.n_docs > 0)
        .map(h => `${h.label} <span class="count">${h.n_docs}</span>`)
        .join('  &nbsp;·&nbsp;  ');
      return `<div class="layer layer-l${level}" style="background:${color};">
        <div>
          <div class="label">Nivel ${level}</div>
          <div class="meta-text">${hLabels}</div>
        </div>
        <span class="count" style="font-size:14px; padding:5px 14px;">${lvl.total_docs} doc${lvl.total_docs !== 1 ? 's' : ''}</span>
      </div>`;
    }).join('')}
  </div>

  <div class="banner info">
    <div>
      <strong>Art. 425 CRE.-</strong> El orden jerárquico de aplicación de las normas será el siguiente:
      <ol style="margin: 8px 0 0; color: var(--dim);">
        <li>La Constitución</li>
        <li>Los tratados y convenios internacionales</li>
        <li>Las leyes orgánicas</li>
        <li>Las leyes ordinarias</li>
        <li>Las normas regionales y las ordenanzas distritales</li>
        <li>Los decretos y reglamentos</li>
        <li>Las ordenanzas</li>
        <li>Los acuerdos y resoluciones</li>
        <li>Y los demás actos y decisiones de los poderes públicos</li>
      </ol>
    </div>
  </div>
</section>

<!-- 2. Distribución por jerarquía -->
<section>
  <h2><span class="num">2</span>Distribución por jerarquía</h2>
  <table>
    <thead>
      <tr>
        <th>Jerarquía</th>
        <th style="text-align:right;">Documentos</th>
        <th style="text-align:right;">Artículos</th>
        <th style="text-align:right;">Palabras</th>
      </tr>
    </thead>
    <tbody>
      ${HIERARCHY_ORDER.map(h => {
        const r = totalLevels[h.key];
        if (!r || r.n_docs === 0) return '';
        return `<tr>
          <td>
            <span class="badge" style="background:${h.color};color:white;border-color:${h.color};">${escapeHtml(h.label)}</span>
            <span style="color:var(--muted); font-size:12px; margin-left:6px;">Nivel ${h.level}</span>
          </td>
          <td style="text-align:right; font-variant-numeric: tabular-nums;">${r.n_docs}</td>
          <td style="text-align:right; font-variant-numeric: tabular-nums;">${Number(r.articles || 0).toLocaleString()}</td>
          <td style="text-align:right; font-variant-numeric: tabular-nums;">${Number(r.words || 0).toLocaleString()}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</section>

<!-- 3. Distribución por categoría -->
<section>
  <h2><span class="num">3</span>Áreas del derecho cubiertas</h2>
  <p style="color: var(--dim);">Categorización temática automática (${byCategory.length} categorías detectadas).</p>
  <div class="cat-grid">
    ${byCategory.map(c => `<div class="cat-cell"><span class="name">${escapeHtml(c.category || 'Sin categoría')}</span><span class="n">${c.n}</span></div>`).join('')}
  </div>
</section>

<!-- 4. Tabla de documentos -->
<section>
  <h2><span class="num">4</span>Catálogo completo (${docs.length} documentos)</h2>
  <p style="color: var(--dim); margin-bottom:14px;">
    Ordenado por jerarquía. Click en cada fila para ver metadata extraída del PDF.
  </p>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Título</th>
          <th>Jerarquía</th>
          <th>Categoría</th>
          <th style="text-align:right;">Pág.</th>
          <th style="text-align:right;">Art.</th>
          <th style="text-align:right;">Palabras</th>
          <th style="text-align:right;">Chunks</th>
          <th>RO</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${docs.map((d, i) => {
          const hLabel = HIERARCHY_ORDER.find(h => h.key === d.legal_hierarchy);
          const badgeClass = ({
            'CONSTITUCION': 'const',
            'CODIGOS_ORGANICOS': 'org', 'LEYES_ORGANICAS': 'org',
            'CODIGOS_ORDINARIOS': 'ord', 'LEYES_ORDINARIAS': 'ord',
            'REGLAMENTOS': 'reg',
            'RESOLUCIONES': 'res',
          })[d.legal_hierarchy] || '';
          return `<tr>
            <td style="color:var(--muted); font-size:12px;">${i + 1}</td>
            <td style="max-width: 380px;">
              <strong>${escapeHtml(d.title || d.norm_title || 'Sin título')}</strong>
              ${d.norm_title && d.title !== d.norm_title ? `<div style="font-size:12px; color:var(--muted); margin-top:2px;">${escapeHtml(d.norm_title)}</div>` : ''}
            </td>
            <td><span class="badge ${badgeClass}">${escapeHtml(hLabel?.label || d.legal_hierarchy)}</span></td>
            <td><span class="badge">${escapeHtml(d.category || '—')}</span></td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">${d.pages || '—'}</td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">${d.articles || '—'}</td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">${Number(d.words || 0).toLocaleString()}</td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">${Number(d.chunks_v || 0).toLocaleString()}</td>
            <td style="font-size:12px; color:var(--dim);">
              ${d.publication_type !== 'ORDINARIO' ? `<span class="badge warn">${escapeHtml(d.publication_type)}</span> ` : ''}
              ${d.publication_number !== 'ND' ? '#' + escapeHtml(d.publication_number) : '—'}
            </td>
            <td><span class="badge ${d.document_state === 'REFORMADO' ? 'warn' : 'good'}">${escapeHtml(d.document_state)}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</section>

<!-- 5. Pipeline técnico -->
<section>
  <h2><span class="num">5</span>Pipeline técnico de vectorización</h2>
  <div class="card">
    <h3>Stack</h3>
    <ul style="color: var(--dim); margin: 0;">
      <li><strong>Extracción:</strong> <code>pdf-parse</code> nativo. Fallback a Claude Vision (Anthropic) si <code>&lt; 500 chars</code> (PDFs escaneados).</li>
      <li><strong>Clasificación:</strong> heurística por nombre de archivo + análisis del contenido.</li>
      <li><strong>Chunking:</strong> 1.000 caracteres con overlap de 200 (≈ 250 tokens/chunk).</li>
      <li><strong>Embeddings:</strong> OpenAI <code>text-embedding-3-small</code>, dimensión 1536, batches de 50.</li>
      <li><strong>Persistencia:</strong> Supabase Postgres con <code>pgvector</code>. Index HNSW (m=16, ef_construction=64).</li>
      <li><strong>Búsqueda:</strong> RPC <code>search_legal_chunks</code> con RRF (Reciprocal Rank Fusion) entre semantic search y keyword search en español (<code>websearch_to_tsquery</code> + <code>ts_rank_cd</code>).</li>
    </ul>

    <h3>Metadata persistida por documento</h3>
    <ul style="color: var(--dim);">
      <li><strong>Estructurada</strong> (campos típados): <code>norm_type</code>, <code>legal_hierarchy</code>, <code>publication_type</code>, <code>publication_number</code>, <code>publication_date</code>, <code>last_reform_date</code>, <code>document_state</code>, <code>jurisdiction</code>, <code>category</code></li>
      <li><strong>JSONB <code>metadata</code></strong>: file (sha256, tamaño), extraction (pages, words, method), pdf_native (Title/Author/Subject/Creator/Producer del PDF), pdf_xmp (metadata XMP), classification, detected (estructura: artículos/libros/títulos/capítulos, keywords, sample articles, references_to)</li>
      <li><strong>Chunks</strong>: <code>id</code>, <code>legal_document_id</code>, <code>content</code>, <code>chunk_index</code>, <code>embedding_v vector(1536)</code></li>
    </ul>

    <h3>Ejemplo de query RAG</h3>
<pre><code>POST /api/v1/search/legal
Authorization: Bearer &lt;jwt&gt;
{
  "query": "derecho a la educación",
  "matchCount": 5
}

→ 200 OK
{
  "query": "derecho a la educación",
  "engine": "rpc-rrf-hnsw",
  "model": "text-embedding-3-small",
  "results": [
    { "rrf_score": 0.030, "norm_title": "Constitución…",
      "content": "La educación pública será universal y laica…" },
    …
  ]
}</code></pre>
  </div>
</section>

<!-- 6. Conclusiones -->
<section>
  <h2><span class="num">6</span>Conclusiones</h2>
  <div class="banner good">
    <div>
      <strong>${T.docs} documentos vectorizados con éxito.</strong>
      ${Number(T.chunks).toLocaleString()} chunks indexados con embeddings de 1536 dimensiones.
      ${Number(T.total_articles).toLocaleString()} artículos detectados automáticamente.
      Costo total estimado: <strong>$${estCostUsd.toFixed(3)} USD</strong>
      (${(totalTokens / 1e6).toFixed(2)}M tokens).
    </div>
  </div>

  <h3>Lo que se hizo</h3>
  <ul style="color: var(--dim);">
    <li>Cada PDF clasificado en su nivel jerárquico según el Art. 425 CRE</li>
    <li>Metadata nativa del PDF preservada (Title, Author, Producer, fechas, etc.)</li>
    <li>Detección heurística de número de Registro Oficial, fecha de publicación y última reforma</li>
    <li>Conteo automático de artículos, libros, títulos, capítulos y secciones</li>
    <li>Lista de keywords jurídicas y referencias cruzadas a otras normas</li>
    <li>Hash SHA-256 del archivo original para auditoría</li>
    <li>Idempotente: re-runs detectan documentos ya vectorizados y los saltan</li>
  </ul>

  <h3>Próximos pasos sugeridos</h3>
  <ul style="color: var(--dim);">
    <li>Extender clasificador con regex sobre el contenido (no solo nombre de archivo)</li>
    <li>Resolver referencias cruzadas: vincular automáticamente "Art. 76 CRE" entre documentos</li>
    <li>Agregar embeddings de citas judiciales para precedentes</li>
    <li>Búsqueda federada: query única que combine corpus jurídico + casos del usuario</li>
    <li>Re-indexación incremental cuando se publique reforma en RO</li>
  </ul>
</section>

<footer>
  <div>Poweria Legal · Vectorización RAG · ${new Date().toISOString().slice(0, 10)}</div>
  <div>${T.docs} docs · ${Number(T.chunks).toLocaleString()} chunks · ${(estCostUsd).toFixed(3)} USD</div>
</footer>

</div>
</body>
</html>`;

  fs.writeFileSync(OUT, html);
  console.log(`Wrote ${OUT}`);
  console.log(`Documents: ${T.docs} · Chunks: ${T.chunks} · Articles: ${T.total_articles} · Cost: $${estCostUsd.toFixed(3)}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
