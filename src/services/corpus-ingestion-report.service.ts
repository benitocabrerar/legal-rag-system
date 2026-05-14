/**
 * Corpus Ingestion Report Generator
 *
 * Genera un informe HTML profesional standalone (fondo blanco) con los
 * resultados de un corpus_ingestion_run. Diseñado para entregar a clientes
 * como evidencia de las normas incorporadas al corpus en un periodo.
 *
 * Guardado en tmp/ingestion-reports/ con nombre que incluye fecha+hora.
 */
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.js';

const REPORTS_DIR = path.resolve(process.cwd(), 'tmp', 'ingestion-reports');

export async function generateIngestionHtmlReport(runId: string): Promise<string> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const runRows = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM public.corpus_ingestion_runs WHERE id = $1::uuid`,
    runId,
  );
  if (runRows.length === 0) throw new Error('Run no encontrado');
  const run = runRows[0];

  const items = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT i.*, p.edition_date, ld.norm_title
       FROM public.corpus_ingestion_items i
       LEFT JOIN public.registry_publications p ON p.id = i.publication_id
       LEFT JOIN public.legal_documents ld ON ld.id = i.legal_doc_id
      WHERE i.run_id = $1::uuid
      ORDER BY i.sequence_index ASC`,
    runId,
  );

  const completedAt = run.completed_at ? new Date(run.completed_at) : new Date();
  const startedAt = new Date(run.started_at);
  const dateSlug = formatLocalDateSlug(completedAt);
  const filename = `informe-ingesta-corpus_${dateSlug}.html`;
  const filepath = path.join(REPORTS_DIR, filename);

  const html = renderHtml({ run, items, startedAt, completedAt });
  await fs.writeFile(filepath, html, 'utf-8');
  return filepath;
}

function renderHtml(ctx: { run: any; items: any[]; startedAt: Date; completedAt: Date }): string {
  const { run, items, startedAt, completedAt } = ctx;

  const durationMs = completedAt.getTime() - startedAt.getTime();
  const totalReq = Number(run.total_requested || 0);
  const totalOk = Number(run.total_succeeded || 0);
  const totalFail = Number(run.total_failed || 0);
  const totalChunks = Number(run.total_chunks || 0);
  const totalEmb = Number(run.total_embeddings || 0);
  const totalVec = Number(run.total_vectorized || 0);
  const totalNotif = Number(run.total_notified_users || 0);
  const successRate = totalReq > 0 ? Math.round((totalOk / totalReq) * 100) : 0;

  // Agrupar items por jerarquía/tipo para análisis
  const byHier: Record<string, any[]> = {};
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const it of items) {
    const h = it.legal_hierarchy || 'OTROS';
    if (!byHier[h]) byHier[h] = [];
    byHier[h].push(it);
    if (it.category) byCategory[it.category] = (byCategory[it.category] || 0) + 1;
    if (it.publication_type) byType[it.publication_type] = (byType[it.publication_type] || 0) + 1;
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe de Ingesta al Corpus · Poweria Legal · ${formatHuman(completedAt)}</title>
<style>${BASE_CSS}</style>
</head>
<body>

<header class="hero">
  <div class="hero-inner">
    <div class="brand">
      <div class="brand-mark">PL</div>
      <div>
        <div class="brand-name">Poweria Legal · COGNITEX</div>
        <div class="brand-sub">Informe de Ingesta al Corpus Normativo</div>
      </div>
    </div>
    <h1 class="hero-title">Reporte de procesamiento de <em>${totalReq}</em> normas legales</h1>
    <p class="hero-lead">
      Detalla cada paso del pipeline de ingesta al corpus vectorial: chunking,
      generación de embeddings, vectorización pgvector, registro en base de datos
      y notificación a usuarios activos.
    </p>
    <div class="meta">
      <div><strong>Run ID</strong><span><code>${run.id}</code></span></div>
      <div><strong>Origen</strong><span>${escape(run.source)}</span></div>
      <div><strong>Disparado por</strong><span>${escape(run.triggered_by)}</span></div>
      <div><strong>Iniciado</strong><span>${formatHuman(startedAt)}</span></div>
      <div><strong>Finalizado</strong><span>${formatHuman(completedAt)}</span></div>
      <div><strong>Duración total</strong><span>${formatDuration(durationMs)}</span></div>
    </div>
  </div>
</header>

<main class="container">

  <section>
    <h2>Resumen Ejecutivo</h2>
    <div class="kpis">
      <div class="kpi kpi-violet">
        <div class="kpi-num">${totalReq}</div>
        <div class="kpi-label">Normas procesadas</div>
      </div>
      <div class="kpi kpi-emerald">
        <div class="kpi-num">${totalOk}<span class="kpi-pct">/${totalReq}</span></div>
        <div class="kpi-label">Ingestadas con éxito</div>
      </div>
      <div class="kpi kpi-amber">
        <div class="kpi-num">${successRate}<span class="kpi-pct">%</span></div>
        <div class="kpi-label">Tasa de éxito</div>
      </div>
      <div class="kpi kpi-sky">
        <div class="kpi-num">${totalChunks.toLocaleString('es-EC')}</div>
        <div class="kpi-label">Chunks creados</div>
      </div>
      <div class="kpi kpi-sky">
        <div class="kpi-num">${totalVec.toLocaleString('es-EC')}</div>
        <div class="kpi-label">Embeddings vectorizados</div>
      </div>
      <div class="kpi kpi-rose">
        <div class="kpi-num">${totalNotif}</div>
        <div class="kpi-label">Usuarios notificados</div>
      </div>
      ${totalFail > 0 ? `
      <div class="kpi kpi-rose">
        <div class="kpi-num">${totalFail}</div>
        <div class="kpi-label">Fallos</div>
      </div>` : ''}
    </div>

    <div class="bar-row">
      <div class="bar-row-label">Avance del run</div>
      <div class="bar-track">
        <div class="bar-fill bar-emerald" style="width:${(totalOk / Math.max(totalReq,1) * 100).toFixed(1)}%" title="${totalOk} ok"></div>
        <div class="bar-fill bar-rose" style="width:${(totalFail / Math.max(totalReq,1) * 100).toFixed(1)}%" title="${totalFail} failed"></div>
      </div>
      <div class="bar-row-pct">${successRate}%</div>
    </div>
  </section>

  <section>
    <h2>Distribución por Jerarquía Normativa</h2>
    <div class="hier-grid">
      ${renderHierCard('CONSTITUCION', '🏛️', 'Constitución', Number(run.count_constitucion || 0))}
      ${renderHierCard('CODIGOS_ORGANICOS', '⚖️', 'Códigos Orgánicos', Number(run.count_codigos_organicos || 0))}
      ${renderHierCard('LEYES_ORGANICAS', '📜', 'Leyes Orgánicas', Number(run.count_leyes_organicas || 0))}
      ${renderHierCard('CODIGOS_ORDINARIOS', '📕', 'Códigos Ordinarios', Number(run.count_codigos_ordinarios || 0))}
      ${renderHierCard('LEYES_ORDINARIAS', '📄', 'Leyes Ordinarias', Number(run.count_leyes_ordinarias || 0))}
      ${renderHierCard('REGLAMENTOS', '⚙️', 'Reglamentos', Number(run.count_reglamentos || 0))}
      ${renderHierCard('OTROS', '📋', 'Otros / No clasificado', Number(run.count_otros || 0))}
    </div>
  </section>

  ${Object.keys(byCategory).length > 0 ? `
  <section>
    <h2>Distribución por Área del Derecho</h2>
    <table class="tbl">
      <thead><tr><th>Área</th><th class="num">Cantidad</th><th>Distribución</th></tr></thead>
      <tbody>
        ${Object.entries(byCategory).sort((a,b) => b[1] - a[1]).map(([cat, n]) => {
          const pct = (n / totalOk * 100);
          return `<tr>
            <td><strong>${escape(cat)}</strong></td>
            <td class="num">${n}</td>
            <td><div class="mini-bar"><div class="mini-bar-fill" style="width:${pct.toFixed(1)}%"></div></div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </section>
  ` : ''}

  <section>
    <h2>Detalle por Norma Procesada</h2>
    <p class="muted">${items.length} normas en este run. Procesadas en el orden secuencial mostrado.</p>
    <table class="tbl tbl-detail">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Norma</th>
          <th>Tipo</th>
          <th>Edición RO</th>
          <th class="num">Chunks</th>
          <th class="num">Embeddings</th>
          <th class="num">Vectorizados</th>
          <th class="num">Duración</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(renderItemRow).join('')}
      </tbody>
    </table>
  </section>

  ${totalFail > 0 ? `
  <section>
    <h2>Detalles de Errores</h2>
    <table class="tbl">
      <thead><tr><th>Norma</th><th>Error</th></tr></thead>
      <tbody>
        ${items.filter(i => i.status === 'failed').map(it => `
          <tr>
            <td><strong>${escape(it.canonical_title)}</strong></td>
            <td class="error-cell">${escape(it.error_message || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
  ` : ''}

  <section>
    <h2>Datos Técnicos</h2>
    <table class="tbl">
      <tbody>
        <tr><td><strong>Modelo de embedding</strong></td><td><code>text-embedding-3-small</code> · 1536 dimensiones</td></tr>
        <tr><td><strong>Tamaño de chunk</strong></td><td>1000 caracteres con overlap de 150 caracteres (15%)</td></tr>
        <tr><td><strong>Índice vectorial</strong></td><td>pgvector HNSW · cosine_ops</td></tr>
        <tr><td><strong>Total tokens estimados</strong></td><td>~${(totalEmb * 700).toLocaleString('es-EC')}</td></tr>
        <tr><td><strong>Costo aproximado OpenAI</strong></td><td>~$${((totalEmb * 700 / 1_000_000) * 0.02).toFixed(4)}</td></tr>
        <tr><td><strong>Tiempo promedio por norma</strong></td><td>${totalOk > 0 ? formatDuration(durationMs / totalOk) : '—'}</td></tr>
        <tr><td><strong>Catalog/source</strong></td><td>${escape(run.source)}</td></tr>
      </tbody>
    </table>
  </section>

</main>

<footer class="footer">
  <div class="container">
    <div class="footer-brand">
      <strong>Poweria Legal · COGNITEX</strong>
      Sistema integral de asistencia legal con IA · Corpus normativo nacional Ecuador
    </div>
    <div class="footer-bottom">
      <span>Reporte generado el ${formatHuman(completedAt)} (UTC-5 Ecuador) · Asistido por Claude Opus 4.7</span>
      <span>Run <code>${run.id.slice(0, 8)}</code></span>
    </div>
  </div>
</footer>

</body>
</html>`;
}

function renderHierCard(hier: string, icon: string, label: string, count: number): string {
  if (count === 0 && hier !== 'OTROS') return '';
  return `
    <div class="hier-card">
      <div class="hier-card-head">
        <span class="hier-icon">${icon}</span>
        <span class="hier-label">${label}</span>
      </div>
      <div class="hier-num">${count}</div>
      <div class="hier-sub">${count === 1 ? 'norma incorporada' : 'normas incorporadas'}</div>
    </div>
  `;
}

function renderItemRow(it: any): string {
  const status = it.status;
  const statusClass =
    status === 'completed' ? 'status-ok' :
    status === 'failed' ? 'status-fail' :
    'status-pending';
  const statusLabel =
    status === 'completed' ? '✓ Completado' :
    status === 'failed' ? '✗ Falló' :
    status === 'processing' ? '⟳ Procesando' :
    status;
  const editionLabel = it.edition_date
    ? `${it.edition_number || '—'} · ${new Date(it.edition_date).toISOString().slice(0,10)}`
    : (it.edition_number || '—');

  return `
    <tr>
      <td class="num idx">${it.sequence_index}</td>
      <td><strong>${escape(it.norm_title || it.canonical_title)}</strong></td>
      <td><span class="type-tag">${escape((it.publication_type || '—').replace(/_/g, ' '))}</span></td>
      <td>${escape(editionLabel)}</td>
      <td class="num">${it.chunks_created || 0}</td>
      <td class="num">${it.embeddings_generated || 0}</td>
      <td class="num">${it.embeddings_vectorized || 0}</td>
      <td class="num">${it.duration_ms ? formatDuration(Number(it.duration_ms)) : '—'}</td>
      <td><span class="status ${statusClass}">${statusLabel}</span></td>
    </tr>
  `;
}

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; color: #0f172a; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif; font-size: 14px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
code { font-family: 'SF Mono', Menlo, monospace; font-size: 0.88em; background: #f1f5f9; padding: 0.1em 0.4em; border-radius: 3px; color: #475569; }

.hero { background: linear-gradient(135deg, #0f172a 0%, #312e81 40%, #6d28d9 80%, #a21caf 100%); color: #f8fafc; padding: 40px 32px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 800px 500px at top right, rgba(139,92,246,0.4) 0%, transparent 60%); }
.hero-inner { max-width: 1240px; margin: 0 auto; position: relative; z-index: 1; }
.brand { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.brand-mark { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #fff, #ddd6fe); color: #5b21b6; display: grid; place-items: center; font-weight: 900; font-size: 22px; box-shadow: 0 12px 32px rgba(99,102,241,.4); letter-spacing: -.02em; }
.brand-name { font-weight: 800; font-size: 19px; letter-spacing: -.02em; }
.brand-sub { font-size: 13px; opacity: 0.85; margin-top: 3px; }
.hero-title { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 14px; max-width: 880px; }
.hero-title em { font-style: normal; background: linear-gradient(135deg, #fbbf24, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-lead { font-size: 15px; line-height: 1.55; opacity: 0.85; max-width: 700px; margin-bottom: 24px; }
.meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 20px; backdrop-filter: blur(8px); max-width: 1000px; }
.meta div { font-size: 12px; }
.meta strong { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin-bottom: 4px; }
.meta span { font-weight: 600; font-size: 12px; }
.meta code { background: rgba(255,255,255,0.1); color: #f8fafc; }

.container { max-width: 1240px; margin: 0 auto; padding: 40px 32px 64px; }
section { margin-bottom: 44px; }
h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 6px; }
h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 3px solid #6d28d9; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0 20px; }
.kpi { background: linear-gradient(135deg, #f8fafc, #fff); border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px 16px; }
.kpi-num { font-size: 36px; font-weight: 900; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.kpi-pct { font-size: 16px; font-weight: 700; opacity: 0.5; margin-left: 2px; }
.kpi-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-top: 8px; line-height: 1.35; }
.kpi.kpi-violet { background: linear-gradient(135deg, #ede9fe, #faf5ff); border-color: #c4b5fd; } .kpi.kpi-violet .kpi-num { color: #5b21b6; }
.kpi.kpi-emerald { background: linear-gradient(135deg, #d1fae5, #ecfdf5); border-color: #6ee7b7; } .kpi.kpi-emerald .kpi-num { color: #065f46; }
.kpi.kpi-amber { background: linear-gradient(135deg, #fef3c7, #fffbeb); border-color: #fcd34d; } .kpi.kpi-amber .kpi-num { color: #92400e; }
.kpi.kpi-rose { background: linear-gradient(135deg, #ffe4e6, #fff1f2); border-color: #fda4af; } .kpi.kpi-rose .kpi-num { color: #9f1239; }
.kpi.kpi-sky { background: linear-gradient(135deg, #e0f2fe, #f0f9ff); border-color: #7dd3fc; } .kpi.kpi-sky .kpi-num { color: #075985; }

.bar-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.bar-row-label { font-size: 12px; font-weight: 700; color: #475569; min-width: 140px; }
.bar-row-pct { font-size: 18px; font-weight: 900; min-width: 56px; text-align: right; }
.bar-track { flex: 1; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; }
.bar-fill { height: 100%; }
.bar-emerald { background: linear-gradient(180deg, #10b981, #059669); }
.bar-rose { background: linear-gradient(180deg, #f43f5e, #e11d48); }

.tbl { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.tbl th, .tbl td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
.tbl th { background: #f8fafc; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
.tbl tbody tr:hover { background: #fafbff; }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.tbl .idx { color: #94a3b8; font-weight: 700; }
.tbl-detail td:nth-child(2) { max-width: 360px; }
.error-cell { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: #be123c; }

.type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #ede9fe; color: #5b21b6; font-size: 10px; font-weight: 700; text-transform: capitalize; }
.status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap; }
.status-ok { background: #d1fae5; color: #047857; }
.status-fail { background: #ffe4e6; color: #be123c; }
.status-pending { background: #e0e7ff; color: #4338ca; }

.mini-bar { display: inline-block; width: 120px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; vertical-align: middle; }
.mini-bar-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); }

.hier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.hier-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
.hier-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.hier-icon { font-size: 20px; }
.hier-label { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.02em; }
.hier-num { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color: #0f172a; }
.hier-sub { font-size: 11px; color: #94a3b8; }

.muted { color: #94a3b8; font-size: 12px; margin-bottom: 12px; }

.footer { border-top: 2px solid #e2e8f0; margin-top: 48px; padding-top: 24px; }
.footer-brand { font-size: 13px; color: #64748b; }
.footer-brand strong { display: block; color: #0f172a; font-size: 14px; margin-bottom: 4px; }
.footer-bottom { padding-top: 18px; border-top: 1px solid #e2e8f0; margin-top: 18px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }

@media print {
  .hero, .kpi, .hier-card { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  section { page-break-inside: avoid; }
}
`;

function escape(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatLocalDateSlug(d: Date): string {
  const utc = d.getTime();
  const ecuador = new Date(utc - 5 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ecuador.getUTCFullYear()}-${pad(ecuador.getUTCMonth() + 1)}-${pad(ecuador.getUTCDate())}_${pad(ecuador.getUTCHours())}-${pad(ecuador.getUTCMinutes())}`;
}

function formatHuman(d: Date): string {
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
