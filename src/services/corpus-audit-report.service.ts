/**
 * Corpus Audit Report Generator
 *
 * Genera un informe HTML profesional (standalone, fondo blanco) con
 * los resultados de un corpus_audit_run. El archivo se guarda en
 * tmp/audit-reports/ y se sirve via GET /admin/corpus/audit-report/:runId.
 *
 * Diseño: hero KPI cards, tabla por categoría con barras de progreso,
 * tabla detallada de cada norma con su status, gráficos inline en SVG.
 * Tipografía system-ui, sin dependencias externas (CDN-free).
 */
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.js';

const REPORTS_DIR = path.resolve(process.cwd(), 'tmp', 'audit-reports');

export async function generateAuditHtmlReport(runId: string): Promise<string> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  // 1) Cargar run + items
  const runRows = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM public.corpus_audit_runs WHERE id = $1::uuid`,
    runId,
  );
  if (runRows.length === 0) throw new Error('Audit run no encontrado');
  const run = runRows[0];

  const items = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM public.corpus_audit_items
      WHERE run_id = $1::uuid
      ORDER BY
        CASE legal_hierarchy
          WHEN 'CONSTITUCION'       THEN 0
          WHEN 'CODIGOS_ORGANICOS'  THEN 1
          WHEN 'LEYES_ORGANICAS'    THEN 2
          WHEN 'CODIGOS_ORDINARIOS' THEN 3
          WHEN 'LEYES_ORDINARIOS'   THEN 4
          WHEN 'TRATADOS_INTERNACIONALES_DDHH' THEN 5
          ELSE 6
        END,
        category, canonical_name`,
    runId,
  );

  // 2) Agrupar por status + por categoría para cards
  const byStatus = countBy(items, (i) => i.status);
  const byCategory: Record<string, { present: number; missing: number; ingested: number; failed: number; total: number }> = {};
  for (const it of items) {
    const c = it.category || 'Sin categoría';
    if (!byCategory[c]) byCategory[c] = { present: 0, missing: 0, ingested: 0, failed: 0, total: 0 };
    byCategory[c].total++;
    if (it.status === 'present') byCategory[c].present++;
    else if (it.status === 'ingested_ok' || it.status === 'ingested_partial') byCategory[c].ingested++;
    else if (it.status === 'ingested_fail' || it.status === 'unreachable') byCategory[c].failed++;
    else byCategory[c].missing++;
  }
  const byHierarchy = countBy(items, (i) => i.legal_hierarchy || 'OTROS');

  // 3) Generar archivo
  const startedAt = new Date(run.started_at);
  const completedAt = run.completed_at ? new Date(run.completed_at) : new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const dateSlug = formatLocalDateSlug(completedAt);
  const filename = `auditoria-corpus_${dateSlug}.html`;
  const filepath = path.join(REPORTS_DIR, filename);

  const html = renderHtml({
    run,
    items,
    byStatus,
    byCategory,
    byHierarchy,
    durationMs,
    completedAt,
  });

  await fs.writeFile(filepath, html, 'utf-8');
  return filepath;
}

// ────────────────────────────────────────────────────────────────────────────
// HTML RENDERING
// ────────────────────────────────────────────────────────────────────────────

interface RenderCtx {
  run: any;
  items: any[];
  byStatus: Record<string, number>;
  byCategory: Record<string, { present: number; missing: number; ingested: number; failed: number; total: number }>;
  byHierarchy: Record<string, number>;
  durationMs: number;
  completedAt: Date;
}

function renderHtml(ctx: RenderCtx): string {
  const { run, items, byStatus, byCategory, durationMs, completedAt } = ctx;

  const totalExpected = Number(run.total_expected || 0);
  const totalPresent = Number(run.total_present || 0);
  const totalMissing = Number(run.total_missing || 0);
  const totalIngestedOk = Number(run.total_ingested_ok || 0);
  const totalIngestedFail = Number(run.total_ingested_fail || 0);
  const totalChunksAdded = Number(run.total_chunks_added || 0);

  const coveragePct = totalExpected > 0
    ? Math.round(((totalPresent + totalIngestedOk) / totalExpected) * 100)
    : 0;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Auditoría de Corpus Normativo · Poweria Legal · ${formatHuman(completedAt)}</title>
<style>${BASE_CSS}</style>
</head>
<body>

<!-- ═══════════ HERO ═══════════ -->
<header class="hero">
  <div class="hero-inner">
    <div class="brand">
      <div class="brand-mark">PL</div>
      <div>
        <div class="brand-name">Poweria Legal · COGNITEX</div>
        <div class="brand-sub">Auditoría de Corpus Normativo Nacional · Ecuador</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Run ID:</strong> <code>${run.id}</code></div>
      <div><strong>Catálogo:</strong> ${escape(run.catalog_version || 'desconocido')}</div>
      <div><strong>Disparado por:</strong> ${escape(run.triggered_by)}</div>
      <div><strong>Generado:</strong> ${formatHuman(completedAt)} (UTC-5 Ecuador)</div>
      <div><strong>Duración:</strong> ${formatDuration(durationMs)}</div>
    </div>
  </div>
</header>

<main class="container">

  <!-- ═══════════ RESUMEN EJECUTIVO ═══════════ -->
  <section class="summary">
    <h1>Resumen Ejecutivo</h1>
    <p class="lead">
      Auditoría cruzada del corpus interno de Poweria Legal contra el
      catálogo curado de <strong>${totalExpected} normas de aplicación nacional</strong> vigentes
      del Ecuador (Constitución, Códigos Orgánicos, Leyes Orgánicas, Códigos
      Ordinarios, Leyes Ordinarias y Tratados Internacionales de DDHH).
    </p>

    <div class="kpis">
      <div class="kpi kpi-violet">
        <div class="kpi-num">${coveragePct}<span class="kpi-pct">%</span></div>
        <div class="kpi-label">Cobertura total<br>del corpus</div>
      </div>
      <div class="kpi kpi-emerald">
        <div class="kpi-num">${totalPresent}</div>
        <div class="kpi-label">Normas presentes<br>antes del run</div>
      </div>
      <div class="kpi kpi-amber">
        <div class="kpi-num">${totalIngestedOk}</div>
        <div class="kpi-label">Ingestadas<br>en este run</div>
      </div>
      <div class="kpi kpi-rose">
        <div class="kpi-num">${totalMissing - totalIngestedOk - totalIngestedFail}</div>
        <div class="kpi-label">Aún faltantes<br>(no encontradas)</div>
      </div>
      <div class="kpi kpi-slate">
        <div class="kpi-num">${totalChunksAdded.toLocaleString('es-EC')}</div>
        <div class="kpi-label">Chunks vectoriales<br>agregados</div>
      </div>
    </div>

    <div class="bar-row">
      <div class="bar-row-label">Cobertura del corpus</div>
      <div class="bar-track">
        <div class="bar-fill bar-emerald" style="width:${Math.round(totalPresent / Math.max(totalExpected, 1) * 100)}%" title="Presentes antes: ${totalPresent}"></div>
        <div class="bar-fill bar-amber" style="width:${Math.round(totalIngestedOk / Math.max(totalExpected, 1) * 100)}%" title="Ingestadas en este run: ${totalIngestedOk}"></div>
        <div class="bar-fill bar-rose" style="width:${Math.round((totalIngestedFail + Math.max(0, totalMissing - totalIngestedOk - totalIngestedFail)) / Math.max(totalExpected, 1) * 100)}%" title="No incorporables: ${totalIngestedFail + Math.max(0, totalMissing - totalIngestedOk - totalIngestedFail)}"></div>
      </div>
      <div class="bar-row-pct">${coveragePct}%</div>
    </div>

    <div class="legend">
      <span><span class="dot bar-emerald"></span> Ya en corpus</span>
      <span><span class="dot bar-amber"></span> Ingestadas ahora</span>
      <span><span class="dot bar-rose"></span> No localizables en el RO</span>
    </div>
  </section>

  <!-- ═══════════ COBERTURA POR CATEGORÍA ═══════════ -->
  <section>
    <h2>Cobertura por Área del Derecho</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Categoría</th>
          <th class="num">Total</th>
          <th class="num">Presentes</th>
          <th class="num">Ingestadas</th>
          <th class="num">Faltantes</th>
          <th>Cobertura</th>
          <th class="num">%</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(byCategory)
          .sort((a, b) => b[1].total - a[1].total)
          .map(([cat, c]) => {
            const cov = c.total > 0 ? ((c.present + c.ingested) / c.total) * 100 : 0;
            return `
        <tr>
          <td><strong>${escape(cat)}</strong></td>
          <td class="num">${c.total}</td>
          <td class="num text-emerald">${c.present}</td>
          <td class="num text-amber">${c.ingested}</td>
          <td class="num text-rose">${c.missing + c.failed}</td>
          <td><div class="mini-bar"><div class="mini-bar-fill" style="width:${cov.toFixed(1)}%"></div></div></td>
          <td class="num"><strong>${cov.toFixed(0)}%</strong></td>
        </tr>`;
          }).join('')}
      </tbody>
    </table>
  </section>

  <!-- ═══════════ DESGLOSE POR JERARQUÍA ═══════════ -->
  <section>
    <h2>Desglose por Jerarquía Normativa</h2>
    <div class="hier-grid">
      ${renderHierCard('CONSTITUCION', '🏛️', 'Constitución', items)}
      ${renderHierCard('CODIGOS_ORGANICOS', '⚖️', 'Códigos Orgánicos', items)}
      ${renderHierCard('LEYES_ORGANICAS', '📜', 'Leyes Orgánicas', items)}
      ${renderHierCard('CODIGOS_ORDINARIOS', '📕', 'Códigos Ordinarios', items)}
      ${renderHierCard('LEYES_ORDINARIAS', '📄', 'Leyes Ordinarias', items)}
      ${renderHierCard('TRATADOS_INTERNACIONALES_DDHH', '🌐', 'Tratados Internacionales', items)}
    </div>
  </section>

  <!-- ═══════════ TABLA DETALLADA ═══════════ -->
  <section>
    <h2>Detalle de Normas Auditadas</h2>
    <p class="muted">${items.length} normas evaluadas. Click en el nombre para ver detalle técnico.</p>
    <table class="data-table data-table-norms">
      <thead>
        <tr>
          <th>#</th>
          <th>Norma</th>
          <th>Sigla</th>
          <th>Categoría</th>
          <th>Jerarquía</th>
          <th>Estado</th>
          <th class="num">Chunks</th>
          <th class="num">Match %</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, i) => renderItemRow(it, i + 1)).join('')}
      </tbody>
    </table>
  </section>

  <!-- ═══════════ STATS TÉCNICOS ═══════════ -->
  <section>
    <h2>Estadísticas Técnicas</h2>
    <table class="data-table">
      <tbody>
        <tr><td><strong>Items procesados</strong></td><td class="num">${items.length}</td></tr>
        <tr><td><strong>Coincidencias exactas de título</strong></td><td class="num">${items.filter((i) => i.match_method === 'exact_title').length}</td></tr>
        <tr><td><strong>Coincidencias por sigla</strong></td><td class="num">${items.filter((i) => i.match_method === 'shortname').length}</td></tr>
        <tr><td><strong>Coincidencias fuzzy</strong></td><td class="num">${items.filter((i) => i.match_method === 'fuzzy_title').length}</td></tr>
        <tr><td><strong>Coincidencias por keywords</strong></td><td class="num">${items.filter((i) => i.match_method === 'keywords').length}</td></tr>
        <tr><td><strong>Búsquedas en RO oficial</strong></td><td class="num">${items.filter((i) => i.remote_search_url).length}</td></tr>
        <tr><td><strong>PDFs descargados</strong></td><td class="num">${items.filter((i) => i.remote_pdf_url && (i.status === 'ingested_ok' || i.status === 'ingested_partial')).length}</td></tr>
        <tr><td><strong>Embeddings generados</strong></td><td class="num">${items.reduce((s, i) => s + Number(i.embeddings_generated || 0), 0).toLocaleString('es-EC')}</td></tr>
        <tr><td><strong>Embeddings vectorizados (pgvector)</strong></td><td class="num">${items.reduce((s, i) => s + Number(i.embeddings_vectorized || 0), 0).toLocaleString('es-EC')}</td></tr>
        <tr><td><strong>Tiempo total de ingesta acumulado</strong></td><td class="num">${formatDuration(items.reduce((s, i) => s + Number(i.ingestion_duration_ms || 0), 0))}</td></tr>
      </tbody>
    </table>
  </section>

  <!-- ═══════════ ERRORES (si hay) ═══════════ -->
  ${byStatus.ingested_fail || byStatus.unreachable ? `
  <section>
    <h2>Errores Encontrados</h2>
    <p class="muted">Normas que no pudieron incorporarse al corpus en este run.</p>
    <table class="data-table">
      <thead><tr><th>Norma</th><th>Estado</th><th>Detalle</th></tr></thead>
      <tbody>
        ${items.filter((i) => i.status === 'ingested_fail' || i.status === 'unreachable').slice(0, 30).map((it) => `
        <tr>
          <td><strong>${escape(it.canonical_name)}</strong></td>
          <td><span class="status status-fail">${statusLabel(it.status)}</span></td>
          <td class="error-cell">${escape(it.error_message || '—')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
  ` : ''}

  <!-- ═══════════ FOOTER ═══════════ -->
  <footer class="footer">
    <div>
      <strong>Poweria Legal</strong> · COGNITEX · Sistema de Auditoría de Corpus Normativo<br>
      Reporte autogenerado el ${formatHuman(completedAt)} · Catálogo versión <code>${escape(run.catalog_version)}</code>
    </div>
    <div class="footer-muted">
      Las normas marcadas como "no localizables" pueden ser ingestadas manualmente por un administrador
      desde el panel <code>/admin/registro-oficial</code>.
    </div>
  </footer>

</main>

</body>
</html>`;
}

function renderHierCard(hier: string, icon: string, label: string, items: any[]): string {
  const subset = items.filter((i) => i.legal_hierarchy === hier);
  const total = subset.length;
  if (total === 0) return '';
  const present = subset.filter((i) => i.status === 'present').length;
  const ingested = subset.filter((i) => i.status === 'ingested_ok').length;
  const cov = ((present + ingested) / total) * 100;
  return `
    <div class="hier-card">
      <div class="hier-card-head">
        <span class="hier-icon">${icon}</span>
        <span class="hier-label">${label}</span>
      </div>
      <div class="hier-num">${total}</div>
      <div class="hier-sub">normas en el catálogo</div>
      <div class="mini-bar"><div class="mini-bar-fill" style="width:${cov.toFixed(1)}%"></div></div>
      <div class="hier-bottom">
        <span class="text-emerald">${present} presentes</span>
        <span class="text-amber">${ingested} agregadas</span>
        <span class="text-rose">${total - present - ingested} pdtes</span>
      </div>
    </div>
  `;
}

function renderItemRow(it: any, idx: number): string {
  const status = it.status;
  const statusClass =
    status === 'present' || status === 'ingested_ok' ? 'status-ok' :
    status === 'ingested_fail' || status === 'unreachable' ? 'status-fail' :
    status === 'ingested_partial' ? 'status-warn' :
    'status-pending';
  return `
    <tr>
      <td class="num idx">${idx}</td>
      <td><strong>${escape(it.canonical_name)}</strong></td>
      <td><code>${escape(it.short_name || '—')}</code></td>
      <td>${escape(it.category || '—')}</td>
      <td><span class="hier-pill">${escape((it.legal_hierarchy || '').replace(/_/g, ' '))}</span></td>
      <td><span class="status ${statusClass}">${statusLabel(status)}</span></td>
      <td class="num">${it.chunks_created != null ? it.chunks_created : (status === 'present' ? '✓' : '—')}</td>
      <td class="num">${it.match_similarity ? (Number(it.match_similarity) * 100).toFixed(0) + '%' : '—'}</td>
    </tr>
  `;
}

function statusLabel(s: string): string {
  switch (s) {
    case 'present':           return '✓ En corpus';
    case 'ingested_ok':       return '✓ Ingestada';
    case 'ingested_partial':  return '~ Parcial';
    case 'ingested_fail':     return '✗ Falló ingesta';
    case 'missing':           return '— Faltante';
    case 'searching':         return '⟳ Buscando';
    case 'found_remote':      return '? Encontrada (sin PDF)';
    case 'unreachable':       return '⛔ No encontrada';
    default:                  return s;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CSS embedded (sin CDN para ser portable)
// ────────────────────────────────────────────────────────────────────────────

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; color: #1e293b; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif; font-size: 14px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
code { font-family: 'SF Mono', Menlo, monospace; font-size: 0.9em; background: #f1f5f9; padding: 0.1em 0.4em; border-radius: 3px; color: #475569; }

.hero { background: linear-gradient(135deg, #0f172a 0%, #4338ca 50%, #6d28d9 100%); color: #f8fafc; padding: 32px 24px; border-bottom: 4px solid #6d28d9; }
.hero-inner { max-width: 1240px; margin: 0 auto; display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 16px; }
.brand-mark { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #fff, #ddd6fe); color: #4338ca; display: grid; place-items: center; font-weight: 900; font-size: 22px; box-shadow: 0 8px 24px rgba(99,102,241,.3); }
.brand-name { font-weight: 800; font-size: 18px; letter-spacing: -0.01em; }
.brand-sub { font-size: 13px; opacity: 0.85; margin-top: 2px; }
.meta { font-size: 12px; line-height: 1.7; opacity: 0.9; min-width: 280px; }
.meta strong { font-weight: 600; opacity: 0.7; }
.meta code { background: rgba(255,255,255,0.1); color: #f8fafc; }

.container { max-width: 1240px; margin: 0 auto; padding: 32px 24px 64px; }
section { margin-bottom: 40px; }

h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; margin-bottom: 8px; }
h2 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }

.lead { font-size: 15px; color: #475569; max-width: 880px; margin-bottom: 24px; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
.kpi { background: linear-gradient(135deg, #f8fafc, #fff); border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px 16px; }
.kpi-num { font-size: 36px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
.kpi-pct { font-size: 18px; font-weight: 700; opacity: 0.5; margin-left: 2px; }
.kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-top: 10px; line-height: 1.35; }
.kpi-violet { background: linear-gradient(135deg, #ede9fe, #fff); border-color: #c4b5fd; }
.kpi-violet .kpi-num { color: #5b21b6; }
.kpi-emerald { background: linear-gradient(135deg, #d1fae5, #fff); border-color: #6ee7b7; }
.kpi-emerald .kpi-num { color: #047857; }
.kpi-amber { background: linear-gradient(135deg, #fef3c7, #fff); border-color: #fcd34d; }
.kpi-amber .kpi-num { color: #b45309; }
.kpi-rose { background: linear-gradient(135deg, #ffe4e6, #fff); border-color: #fda4af; }
.kpi-rose .kpi-num { color: #be123c; }
.kpi-slate { background: linear-gradient(135deg, #f1f5f9, #fff); border-color: #cbd5e1; }
.kpi-slate .kpi-num { color: #334155; }

.bar-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.bar-row-label { font-size: 12px; font-weight: 700; color: #475569; min-width: 160px; }
.bar-row-pct { font-size: 18px; font-weight: 900; color: #0f172a; min-width: 60px; text-align: right; }
.bar-track { flex: 1; height: 14px; background: #e2e8f0; border-radius: 7px; overflow: hidden; display: flex; }
.bar-fill { height: 100%; }
.bar-emerald { background: linear-gradient(180deg, #10b981, #059669); }
.bar-amber { background: linear-gradient(180deg, #f59e0b, #d97706); }
.bar-rose { background: linear-gradient(180deg, #f43f5e, #e11d48); }

.legend { display: flex; gap: 16px; font-size: 11px; color: #64748b; margin-top: 8px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

.data-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
.data-table th { background: #f8fafc; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
.data-table tbody tr:hover { background: #f8fafc; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.idx { color: #94a3b8; font-weight: 700; }
.data-table-norms td:nth-child(2) { max-width: 380px; }
.error-cell { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: #be123c; }

.text-emerald { color: #047857; font-weight: 600; }
.text-amber { color: #b45309; font-weight: 600; }
.text-rose { color: #be123c; font-weight: 600; }

.mini-bar { display: inline-block; width: 120px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; vertical-align: middle; }
.mini-bar-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); }

.status { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap; }
.status-ok { background: #d1fae5; color: #047857; }
.status-fail { background: #ffe4e6; color: #be123c; }
.status-warn { background: #fef3c7; color: #b45309; }
.status-pending { background: #e0e7ff; color: #4338ca; }

.hier-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; text-transform: capitalize; }

.hier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.hier-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
.hier-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.hier-icon { font-size: 20px; }
.hier-label { font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.02em; }
.hier-num { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
.hier-sub { font-size: 11px; color: #94a3b8; margin-bottom: 12px; }
.hier-bottom { display: flex; justify-content: space-between; font-size: 10px; margin-top: 8px; }

.muted { color: #94a3b8; font-size: 12px; margin-bottom: 12px; }

.footer { border-top: 2px solid #e2e8f0; margin-top: 48px; padding-top: 24px; font-size: 12px; color: #64748b; line-height: 1.7; }
.footer-muted { color: #94a3b8; margin-top: 8px; }

@media print {
  .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  section { page-break-inside: avoid; }
}
@media (max-width: 768px) {
  .meta { font-size: 11px; }
  .kpi-num { font-size: 28px; }
  .data-table { font-size: 11px; }
}
`;

// ────────────────────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────────────────────

function escape(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function countBy<T>(arr: T[], fn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = fn(x);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function formatLocalDateSlug(d: Date): string {
  // YYYY-MM-DD_HH-mm Ecuador (UTC-5)
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
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
