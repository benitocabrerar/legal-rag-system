/**
 * HTML Report Generator para legal_pdf_archive_runs.
 *
 * Genera reporte profesional descargable del proceso de archivado masivo
 * de PDFs (canonicalPdfUrl externos → Supabase Storage propio). Mismo
 * estilo y estructura que corpus-audit-report.service.ts pero adaptado
 * a los datos del archivo de PDFs.
 *
 * Es idempotente: si el archivo se pierde (filesystem ephemeral en Render),
 * se puede regenerar on-demand desde los datos persistidos en
 * legal_pdf_archive_runs.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../lib/prisma.js';

export async function generateArchiveHtmlReport(runId: string): Promise<string> {
  // 1) Cargar header del run
  const runs = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT id, started_at, completed_at, triggered_by, status,
            total_requested, total_uploaded, total_skipped, total_failed,
            total_no_source, total_bytes, total_duration_ms, error_message,
            retry_failed
       FROM public.legal_pdf_archive_runs
      WHERE id = $1::uuid`,
    runId,
  );
  if (runs.length === 0) throw new Error(`Archive run not found: ${runId}`);
  const run = runs[0];

  // 2) Cargar documentos asociados (los que tienen stored_pdf_url o que están en pending/failed)
  const docs = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT id, norm_title, legal_hierarchy::text AS legal_hierarchy,
            stored_pdf_key, stored_pdf_url, stored_pdf_size_bytes,
            pdf_stored_at, pdf_storage_status,
            metadata->>'editionPdfUrl' AS edition_pdf_url,
            metadata->>'canonicalPdfUrl' AS canonical_pdf_url
       FROM public.legal_documents
      WHERE is_active = true
        AND (pdf_stored_at >= $1::timestamp - interval '1 hour'
             OR pdf_storage_status IN ('stored','failed','pending','no_source'))
      ORDER BY pdf_stored_at DESC NULLS LAST,
               legal_hierarchy, norm_title
      LIMIT 500`,
    run.started_at,
  );

  // 3) Aggregates por jerarquía
  const aggByHier = new Map<string, { stored: number; pending: number; failed: number; no_source: number; bytes: number }>();
  for (const d of docs) {
    const k = d.legal_hierarchy || 'OTROS';
    const cur = aggByHier.get(k) || { stored: 0, pending: 0, failed: 0, no_source: 0, bytes: 0 };
    const s = d.pdf_storage_status as string;
    if (s === 'stored') {
      cur.stored++;
      cur.bytes += Number(d.stored_pdf_size_bytes || 0);
    } else if (s === 'failed') cur.failed++;
    else if (s === 'no_source') cur.no_source++;
    else cur.pending++;
    aggByHier.set(k, cur);
  }

  // 4) Stats globales actuales (todo el corpus)
  const corpusStats = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT
       COUNT(*) FILTER (WHERE is_active = true)::int AS total_active,
       COUNT(*) FILTER (WHERE pdf_storage_status = 'stored')::int AS total_stored,
       COUNT(*) FILTER (WHERE pdf_storage_status = 'pending')::int AS total_pending,
       COUNT(*) FILTER (WHERE pdf_storage_status = 'failed')::int AS total_failed,
       COUNT(*) FILTER (WHERE pdf_storage_status = 'no_source')::int AS total_no_source,
       COALESCE(SUM(stored_pdf_size_bytes), 0)::bigint AS total_bytes
     FROM public.legal_documents`,
  );
  const stats = corpusStats[0] || {};

  // 5) Render HTML
  const html = renderHtml({ run, docs, aggByHier, stats });

  // 6) Guardar a tmp dir
  const tmpDir = path.join(os.tmpdir(), 'archive-reports');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filename = `archivo-pdfs-${runId}.html`;
  const filepath = path.join(tmpDir, filename);
  fs.writeFileSync(filepath, html, 'utf-8');
  return filepath;
}

function fmtBytes(b: number | string): string {
  const n = typeof b === 'string' ? parseInt(b, 10) : b;
  if (!Number.isFinite(n) || n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
}

function statusBadge(s: string): string {
  const map: Record<string, { bg: string; label: string }> = {
    stored:    { bg: '#10b981', label: 'ARCHIVADO' },
    pending:   { bg: '#f59e0b', label: 'PENDIENTE' },
    failed:    { bg: '#ef4444', label: 'FALLÓ' },
    no_source: { bg: '#6b7280', label: 'SIN URL' },
  };
  const m = map[s] || { bg: '#94a3b8', label: s };
  return `<span style="background:${m.bg};color:#fff;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700">${m.label}</span>`;
}

function renderHtml({ run, docs, aggByHier, stats }: any): string {
  const coverage = stats.total_active > 0
    ? Math.round((stats.total_stored / stats.total_active) * 100)
    : 0;
  const runCoverage = run.total_requested > 0
    ? Math.round((run.total_uploaded / run.total_requested) * 100)
    : 0;

  // Hierarchy summary table
  const hierRows = (Array.from(aggByHier.entries()) as Array<[string, { stored: number; pending: number; failed: number; no_source: number; bytes: number }]>)
    .sort((a, b) => b[1].stored - a[1].stored)
    .map(([hier, agg]) => `
      <tr>
        <td><strong>${hier}</strong></td>
        <td style="text-align:right">${agg.stored}</td>
        <td style="text-align:right">${agg.pending}</td>
        <td style="text-align:right;color:#ef4444">${agg.failed}</td>
        <td style="text-align:right;color:#6b7280">${agg.no_source}</td>
        <td style="text-align:right">${fmtBytes(agg.bytes)}</td>
      </tr>
    `).join('');

  // Document detail rows
  const docRows = docs.map((d: any) => `
    <tr>
      <td style="max-width:300px;word-break:break-word">
        <strong>${d.norm_title || '—'}</strong>
        <div style="font-size:10px;color:#64748b">${d.legal_hierarchy || ''}</div>
      </td>
      <td>${statusBadge(d.pdf_storage_status || 'pending')}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${d.stored_pdf_size_bytes ? fmtBytes(d.stored_pdf_size_bytes) : '—'}</td>
      <td style="font-size:11px">${d.pdf_stored_at ? fmtDate(d.pdf_stored_at) : '—'}</td>
      <td style="max-width:280px;word-break:break-all;font-size:10px">
        ${d.stored_pdf_url
          ? `<a href="${d.stored_pdf_url}" target="_blank" style="color:#0ea5e9">${(d.stored_pdf_url || '').slice(0, 60)}…</a>`
          : (d.canonical_pdf_url ? `<span style="color:#94a3b8">${(d.canonical_pdf_url || '').slice(0, 60)}…</span>` : '—')}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte de Archivado de PDFs — Poweria Legal</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #0f172a; line-height: 1.5; padding: 32px; max-width: 1400px; margin: 0 auto; }
h1 { color: #0c4a6e; font-size: 28px; font-weight: 800; margin-bottom: 4px; }
h2 { color: #1e3a8a; font-size: 20px; font-weight: 700; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
.meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 24px; }
.kpi { padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
.kpi.green { background: #ecfdf5; border-color: #10b981; }
.kpi.amber { background: #fefce8; border-color: #f59e0b; }
.kpi.red { background: #fef2f2; border-color: #ef4444; }
.kpi.gray { background: #f1f5f9; border-color: #94a3b8; }
.kpi.blue { background: #eff6ff; border-color: #3b82f6; }
.kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #475569; margin-bottom: 4px; }
.kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; }
.kpi-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
.progress { height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin: 8px 0 16px; }
.progress > span { display: block; height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6); }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #1e293b; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
tr:hover { background: #f8fafc; }
.callout { padding: 14px 18px; border-radius: 8px; background: #eff6ff; border-left: 4px solid #3b82f6; font-size: 13px; color: #1e3a8a; margin: 16px 0; }
.callout.warn { background: #fefce8; border-left-color: #f59e0b; color: #713f12; }
.footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
</style>
</head>
<body>

<h1>📦 Reporte de Archivado Masivo de PDFs</h1>
<div class="meta">
  Run ID: <code>${run.id}</code> · Iniciado: ${fmtDate(run.started_at)} · Completado: ${fmtDate(run.completed_at)} · Duración: ${fmtDuration(run.total_duration_ms || (run.completed_at ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime() : 0))}
</div>

<div class="callout">
  Este reporte documenta el proceso de copia inmutable de los PDFs originales de cada norma del corpus
  hacia Supabase Storage propio (bucket <code>legal-pdfs</code>). Esto garantiza disponibilidad
  estable independiente de los sitios externos (.gob.ec, .oas.org, etc.) que pueden cambiar URLs
  o caer.
</div>

<h2>Resumen del Run</h2>
<div class="kpis">
  <div class="kpi blue">
    <div class="kpi-label">Solicitados</div>
    <div class="kpi-value">${run.total_requested}</div>
    <div class="kpi-sub">Total intentados</div>
  </div>
  <div class="kpi green">
    <div class="kpi-label">Subidos exitosos</div>
    <div class="kpi-value">${run.total_uploaded}</div>
    <div class="kpi-sub">${runCoverage}% del total</div>
  </div>
  <div class="kpi gray">
    <div class="kpi-label">Sin URL fuente</div>
    <div class="kpi-value">${run.total_no_source}</div>
    <div class="kpi-sub">Sin canonicalPdfUrl/editionPdfUrl</div>
  </div>
  <div class="kpi red">
    <div class="kpi-label">Fallados</div>
    <div class="kpi-value">${run.total_failed}</div>
    <div class="kpi-sub">Errores de descarga/upload</div>
  </div>
</div>

<div style="display:flex;align-items:center;gap:12px;margin:8px 0 24px">
  <span style="font-size:12px;color:#64748b;font-weight:600;min-width:90px">Progreso run</span>
  <div class="progress" style="flex:1"><span style="width:${runCoverage}%"></span></div>
  <span style="font-weight:700;color:#1e293b">${runCoverage}%</span>
</div>

<div class="kpis" style="grid-template-columns: repeat(3, 1fr);">
  <div class="kpi green">
    <div class="kpi-label">Bytes transferidos (run)</div>
    <div class="kpi-value">${fmtBytes(Number(run.total_bytes || 0))}</div>
  </div>
  <div class="kpi blue">
    <div class="kpi-label">Triggered by</div>
    <div class="kpi-value" style="font-size:14px;word-break:break-all">${run.triggered_by || 'system'}</div>
  </div>
  <div class="kpi amber">
    <div class="kpi-label">Retry failed</div>
    <div class="kpi-value" style="font-size:14px">${run.retry_failed ? 'Sí' : 'No'}</div>
  </div>
</div>

${run.error_message ? `<div class="callout warn"><strong>Error del run:</strong> ${run.error_message}</div>` : ''}

<h2>Estado Global del Corpus</h2>
<div class="kpis">
  <div class="kpi blue">
    <div class="kpi-label">Documentos activos</div>
    <div class="kpi-value">${stats.total_active}</div>
  </div>
  <div class="kpi green">
    <div class="kpi-label">Archivados</div>
    <div class="kpi-value">${stats.total_stored}</div>
    <div class="kpi-sub">${coverage}% cobertura</div>
  </div>
  <div class="kpi amber">
    <div class="kpi-label">Pendientes</div>
    <div class="kpi-value">${stats.total_pending}</div>
  </div>
  <div class="kpi gray">
    <div class="kpi-label">Sin URL fuente</div>
    <div class="kpi-value">${stats.total_no_source}</div>
  </div>
</div>

<div style="display:flex;align-items:center;gap:12px;margin:8px 0 24px">
  <span style="font-size:12px;color:#64748b;font-weight:600;min-width:120px">Cobertura corpus</span>
  <div class="progress" style="flex:1"><span style="width:${coverage}%"></span></div>
  <span style="font-weight:700;color:#1e293b">${coverage}%</span>
</div>

<div class="callout">
  Total bytes en Storage: <strong>${fmtBytes(Number(stats.total_bytes || 0))}</strong> ·
  Costo aprox: <strong>~$${((Number(stats.total_bytes || 0)) / 1024 / 1024 / 1024 * 0.021).toFixed(4)}/mes</strong>
  (Supabase Storage $0.021/GB/mes).
</div>

<h2>Desglose por Jerarquía Legal</h2>
<table>
  <thead>
    <tr>
      <th>Jerarquía</th>
      <th style="text-align:right">Archivados</th>
      <th style="text-align:right">Pendientes</th>
      <th style="text-align:right">Fallidos</th>
      <th style="text-align:right">Sin fuente</th>
      <th style="text-align:right">Bytes</th>
    </tr>
  </thead>
  <tbody>${hierRows}</tbody>
</table>

<h2>Detalle por Documento (${docs.length})</h2>
<table>
  <thead>
    <tr>
      <th>Norma</th>
      <th>Estado</th>
      <th style="text-align:right">Tamaño</th>
      <th>Archivado en</th>
      <th>URL Stored / Source</th>
    </tr>
  </thead>
  <tbody>${docRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">Sin documentos en este run.</td></tr>`}</tbody>
</table>

<div class="footer">
  Generado por Poweria Legal · ${fmtDate(new Date())} ·
  Service: legal-pdf-archive-report.service.ts
</div>

</body></html>`;
}
