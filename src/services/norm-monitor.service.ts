/**
 * Monitor de normas — cross-referencia el corpus interno (legal_documents +
 * registry_publications) contra el sitio oficial del Registro Oficial Ecuador,
 * y genera alertas tipadas cuando detecta:
 *
 *   - new_edition       : edición publicada en el RSS oficial que NO está scrapeada localmente
 *   - potential_reform  : edición/publicación que parece reformar una norma existente en el corpus
 *   - new_law           : publicación scrapeada y analizada (registry_publications) sin match en legal_documents
 *   - outdated_doc      : documento del corpus con fecha más antigua que la última edición remota detectada
 *
 * Fuente primaria de verdad: RSS oficial https://www.registroficial.gob.ec/feed/
 *   - WordPress nativo, actualización horaria, 23 items más recientes
 *   - Items con <title> <link> <pubDate> <category> <description>
 *
 * Fuente secundaria (on-demand): buscador WordPress /?s=<query>
 *   - HTML, selectors .search-result h4 / .search-result p / .search-result a
 *   - Solo para verificación manual desde UI, no para batch
 */
import { prisma } from '../lib/prisma.js';

const RO_BASE = 'https://www.registroficial.gob.ec';
const RO_RSS  = `${RO_BASE}/feed/`;
const USER_AGENT = 'Mozilla/5.0 (compatible; PoweriaLegalMonitor/1.0; +https://poweria.cognitex.app/contact)';
const REQUEST_TIMEOUT_MS = 25000;

// Umbral de similitud (jaccard sobre tokens normalizados) para considerar
// que dos títulos refieren a la misma norma.
const TITLE_SIMILARITY_THRESHOLD = 0.45;

export type MonitorProgressCallback = (event: string, data: any) => void;

export interface MonitorResult {
  alertsCreated: number;
  feedItemsProcessed: number;
  newEditionsDetected: number;
  potentialReformsDetected: number;
  newLawsDetected: number;
  outdatedDocsDetected: number;
  durationMs: number;
  errors: string[];
}

interface RssItem {
  guid: string;
  title: string;
  link: string;
  pubDate: Date;
  category: string | null;
  excerpt: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Entrypoint principal — corre todos los checks y genera alertas.
 */
export async function runMonitor(opts: {
  triggeredBy?: string;
  onProgress?: MonitorProgressCallback;
} = {}): Promise<MonitorResult> {
  const emit: MonitorProgressCallback = opts.onProgress || (() => {});
  const startedAt = Date.now();
  const errors: string[] = [];
  let alertsCreated = 0;
  let newEditions = 0;
  let potentialReforms = 0;
  let newLaws = 0;
  let outdatedDocs = 0;
  let feedItemsProcessed = 0;

  try {
    emit('phase', { phase: 'starting', label: 'Iniciando monitor del Registro Oficial…', pct: 5 });

    // 1) RSS feed live (fuente más fresca)
    emit('phase', { phase: 'rss-fetch', label: 'Consultando RSS oficial /feed/…', pct: 15 });
    let rssItems: RssItem[] = [];
    try {
      rssItems = await fetchRoRss();
      emit('phase', { phase: 'rss-fetched', label: `${rssItems.length} items en el RSS oficial`, pct: 30 });
    } catch (e: any) {
      errors.push(`RSS fetch failed: ${e?.message || 'unknown'}`);
      emit('phase', { phase: 'rss-error', label: 'RSS no accesible — continuando con datos locales', pct: 30 });
    }

    // 2) Snapshot del RSS en DB (para idempotencia entre corridas)
    if (rssItems.length > 0) {
      emit('phase', { phase: 'rss-snapshot', label: 'Guardando snapshot del feed…', pct: 35 });
      await snapshotFeed(rssItems);
    }

    // 3) Cargar el corpus monitorable (constitución, códigos, leyes)
    emit('phase', { phase: 'corpus-load', label: 'Cargando corpus monitorable…', pct: 40 });
    const corpus = await loadMonitorableCorpus();
    feedItemsProcessed = rssItems.length;

    // 4) Check: ediciones del RSS no scrapeadas localmente
    emit('phase', { phase: 'check-new-editions', label: 'Detectando ediciones nuevas en el RSS…', pct: 50 });
    if (rssItems.length > 0) {
      const r = await checkNewEditionsFromFeed(rssItems);
      newEditions = r.alertsCreated;
      alertsCreated += newEditions;
    }

    // 5) Check: items del RSS que parecen reformar normas del corpus
    emit('phase', { phase: 'check-reforms', label: 'Cruzando feed con corpus para detectar reformas…', pct: 65 });
    if (rssItems.length > 0 && corpus.length > 0) {
      const r = await checkPotentialReformsFromFeed(rssItems, corpus);
      potentialReforms = r.alertsCreated;
      alertsCreated += potentialReforms;
    }

    // 6) Check: publicaciones internas analyzed sin match en corpus
    emit('phase', { phase: 'check-new-laws', label: 'Buscando leyes nuevas en publicaciones internas…', pct: 80 });
    const newLawsRes = await checkNewLawsFromInternal(corpus);
    newLaws = newLawsRes.alertsCreated;
    alertsCreated += newLaws;

    // 7) Check: docs del corpus desactualizados según registry_publications
    emit('phase', { phase: 'check-outdated', label: 'Detectando documentos desactualizados…', pct: 90 });
    const outdatedRes = await checkOutdatedDocsFromInternal(corpus);
    outdatedDocs = outdatedRes.alertsCreated;
    alertsCreated += outdatedDocs;

    emit('phase', {
      phase: 'done',
      label: `${alertsCreated} alertas generadas`,
      pct: 100,
    });
  } catch (e: any) {
    errors.push(e?.message || 'Unknown error');
  }

  return {
    alertsCreated,
    feedItemsProcessed,
    newEditionsDetected: newEditions,
    potentialReformsDetected: potentialReforms,
    newLawsDetected: newLaws,
    outdatedDocsDetected: outdatedDocs,
    durationMs: Date.now() - startedAt,
    errors,
  };
}

/**
 * Búsqueda live por título en el sitio oficial del RO.
 * Usa el buscador nativo WordPress (/?s=<query>) y parsea los resultados.
 */
export async function searchRoLive(query: string, limit = 10): Promise<Array<{
  title: string;
  url: string;
  excerpt: string | null;
  pdfUrl: string | null;
  pubDate: Date | null;
}>> {
  const q = (query || '').trim();
  if (!q) return [];

  const url = `${RO_BASE}/?s=${encodeURIComponent(q)}`;
  const html = await fetchText(url);
  if (!html) return [];

  // Parser HTML simple basado en regex — selectors .search-result h4 / p / a
  // El sitio WP renderiza cada resultado dentro de <article class="search-result">…</article>
  const results: Array<{ title: string; url: string; excerpt: string | null; pdfUrl: string | null; pubDate: Date | null }> = [];
  const blockRegex = /<article[^>]*class="[^"]*search-result[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;

  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null && results.length < limit) {
    const block = m[1];

    const titleMatch = block.match(/<h4[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h4>/i) ||
                       block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
    if (!titleMatch) continue;

    const url   = titleMatch.length === 3 ? titleMatch[1] : '';
    const title = stripHtml(titleMatch.length === 3 ? titleMatch[2] : titleMatch[1]).trim();
    if (!title) continue;

    const excerptMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const excerpt = excerptMatch ? stripHtml(excerptMatch[1]).trim().slice(0, 320) : null;

    const pdfMatch = block.match(/href="([^"]+\.pdf|[^"]*\/storage\/api\/v1\/10_DWL_FL\/[^"]+)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    // El RO no siempre incluye fecha en el snippet de búsqueda; intentamos detectar
    const pubDate = extractDateFromText(block);

    results.push({ title, url, excerpt, pdfUrl, pubDate });
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// FEED RSS
// ────────────────────────────────────────────────────────────────────────────

async function fetchRoRss(): Promise<RssItem[]> {
  const xml = await fetchText(RO_RSS);
  if (!xml) return [];

  const items: RssItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title    = extractXmlTag(block, 'title');
    const link     = extractXmlTag(block, 'link');
    const guidRaw  = extractXmlTag(block, 'guid') || link;
    const pubRaw   = extractXmlTag(block, 'pubDate');
    const category = extractXmlTag(block, 'category');
    const descRaw  = extractXmlTag(block, 'description');

    if (!title || !link || !pubRaw) continue;
    const pubDate = new Date(pubRaw);
    if (Number.isNaN(pubDate.getTime())) continue;

    items.push({
      guid:    guidRaw || link,
      title:   stripHtml(title).trim(),
      link:    stripHtml(link).trim(),
      pubDate,
      category: category ? stripHtml(category).trim() : null,
      excerpt:  descRaw ? stripHtml(descRaw).trim().slice(0, 320) : null,
    });
  }

  return items;
}

async function snapshotFeed(items: RssItem[]): Promise<void> {
  for (const it of items) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.ro_feed_snapshot (guid, title, link, pub_date, category, raw_excerpt)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (guid) DO UPDATE
         SET last_seen_at = now(),
             title    = EXCLUDED.title,
             pub_date = EXCLUDED.pub_date`,
      it.guid, it.title, it.link, it.pubDate, it.category, it.excerpt,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CHECKS
// ────────────────────────────────────────────────────────────────────────────

interface MonitorableDoc {
  id: string;
  title: string;
  norm_title: string | null;
  legal_hierarchy: string | null;
  publication_date: Date | null;
  last_reform_date: Date | null;
}

async function loadMonitorableCorpus(): Promise<MonitorableDoc[]> {
  const rows = await prisma.$queryRawUnsafe<MonitorableDoc[]>(
    `SELECT id, title, norm_title,
            legal_hierarchy::text AS legal_hierarchy,
            publication_date, last_reform_date
       FROM public.legal_documents
      WHERE is_active = true
        AND legal_hierarchy::text IN (
              'CONSTITUCION','CODIGOS_ORGANICOS','LEYES_ORGANICAS',
              'LEYES_ORDINARIAS','CODIGOS_ORDINARIOS'
            )`,
  );
  return rows;
}

/**
 * Para cada item del RSS, si su edition_number no está en registry_publications
 * (extraído del título tipo "Registro Oficial No. 257" / "Suplemento No. 392"),
 * crear alerta new_edition.
 */
async function checkNewEditionsFromFeed(items: RssItem[]): Promise<{ alertsCreated: number }> {
  // Obtenemos todos los edition_number ya scrapeados
  const known = await prisma.$queryRawUnsafe<Array<{ edition_number: string }>>(
    `SELECT DISTINCT edition_number FROM public.registry_publications
      WHERE edition_number IS NOT NULL AND source = 'registro_oficial_ec'`,
  );
  const knownSet = new Set(known.map((k) => k.edition_number));

  let created = 0;
  for (const it of items) {
    const edNum = extractEditionNumber(it.title);
    if (!edNum) continue;
    if (knownSet.has(edNum)) continue;

    // Intentar inserción idempotente (uniq index sobre alert_type + dedup keys)
    const insertedRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO public.norm_alerts (
         alert_type, severity, status, title, description,
         remote_publication_date, remote_source_url, remote_edition_number,
         diff_data
       )
       VALUES ('new_edition', $1, 'open', $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (alert_type, COALESCE(legal_doc_id,''), COALESCE(remote_edition_number,''), lower(title))
         WHERE status = 'open'
         DO NOTHING
       RETURNING id`,
      it.category === 'Suplemento' || it.category === 'Edición Especial' ? 'high' : 'medium',
      `Nueva edición publicada: ${it.title}`,
      `El RSS oficial del Registro Oficial reporta esta edición publicada el ${it.pubDate.toISOString().slice(0,10)} pero aún no está procesada por el scraper interno. Dispara un scan manual para incorporarla al corpus.`,
      it.pubDate, it.link, edNum,
      JSON.stringify({ rssCategory: it.category, rssGuid: it.guid }),
    );
    if (insertedRows.length > 0) created++;
  }
  return { alertsCreated: created };
}

/**
 * Detecta items del RSS cuyo título matchea alguna norma del corpus por fuzzy
 * similarity y cuya pubDate es más reciente que last_reform_date del doc local.
 * Esto detecta REFORMAS publicadas que probablemente actualizan una norma vigente.
 */
async function checkPotentialReformsFromFeed(
  items: RssItem[],
  corpus: MonitorableDoc[],
): Promise<{ alertsCreated: number }> {
  let created = 0;
  for (const it of items) {
    for (const doc of corpus) {
      const docTitle = (doc.norm_title || doc.title || '').trim();
      if (!docTitle) continue;
      const score = titleSimilarity(it.title, docTitle);
      if (score < TITLE_SIMILARITY_THRESHOLD) continue;

      const localDate  = doc.last_reform_date || doc.publication_date;
      const remoteDate = it.pubDate;
      if (localDate && remoteDate <= localDate) continue;

      const insertedRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO public.norm_alerts (
           alert_type, severity, status, legal_doc_id,
           title, description,
           local_publication_date, remote_publication_date,
           remote_source_url, remote_edition_number,
           diff_data
         )
         VALUES ('potential_reform', $1, 'open', $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT (alert_type, COALESCE(legal_doc_id,''), COALESCE(remote_edition_number,''), lower(title))
           WHERE status = 'open'
           DO NOTHING
         RETURNING id`,
        score >= 0.7 ? 'high' : 'medium',
        doc.id,
        `Posible reforma: ${docTitle}`,
        `Detectamos en el Registro Oficial oficial una publicación reciente cuyo título coincide con esta norma de tu corpus (similitud ${(score*100).toFixed(0)}%). Verifica si efectivamente reforma este documento.`,
        localDate, remoteDate,
        it.link, extractEditionNumber(it.title),
        JSON.stringify({
          rssTitle: it.title,
          rssCategory: it.category,
          rssExcerpt: it.excerpt,
          similarityScore: score,
        }),
      );
      if (insertedRows.length > 0) created++;
    }
  }
  return { alertsCreated: created };
}

/**
 * Para publicaciones internas analyzed/approved que NO matchean ninguna norma
 * del corpus → candidatas a "nueva ley" para ingestar.
 */
async function checkNewLawsFromInternal(corpus: MonitorableDoc[]): Promise<{ alertsCreated: number }> {
  const candidates = await prisma.$queryRawUnsafe<Array<{
    id: string; title: string; publication_type: string | null;
    edition_number: string | null; edition_date: Date | null;
    edition_pdf_url: string | null;
    ai_classification: string | null; ai_relevance_score: number | null;
  }>>(
    `SELECT id, title, publication_type, edition_number, edition_date,
            edition_pdf_url, ai_classification, ai_relevance_score
       FROM public.registry_publications
      WHERE status IN ('analyzed','approved')
        AND publication_type IN ('ley_organica','ley_ordinaria','reglamento')
        AND ingested_legal_doc_id IS NULL`,
  );

  let created = 0;
  for (const pub of candidates) {
    // ¿Ya está alguna norma del corpus que se le parezca?
    let bestScore = 0;
    for (const doc of corpus) {
      const docTitle = (doc.norm_title || doc.title || '').trim();
      const s = titleSimilarity(pub.title, docTitle);
      if (s > bestScore) bestScore = s;
    }
    if (bestScore >= TITLE_SIMILARITY_THRESHOLD) continue; // ya existe algo parecido → no es ley NUEVA

    const sev = (pub.ai_relevance_score || 0) >= 0.7 ? 'high' : 'medium';
    const insertedRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO public.norm_alerts (
         alert_type, severity, status, publication_id,
         title, description,
         remote_publication_date, remote_source_url, remote_edition_number, remote_pdf_url,
         diff_data
       )
       VALUES ('new_law', $1, 'open', $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (alert_type, COALESCE(legal_doc_id,''), COALESCE(remote_edition_number,''), lower(title))
         WHERE status = 'open'
         DO NOTHING
       RETURNING id`,
      sev, pub.id,
      `Nueva ley/reglamento sin ingestar: ${pub.title}`,
      `Esta publicación fue detectada por el scraper diario, analizada por IA (${pub.ai_classification || 'sin clasif.'}), y NO matchea ninguna norma del corpus. Candidato a ingesta.`,
      pub.edition_date, null, pub.edition_number, pub.edition_pdf_url,
      JSON.stringify({
        publicationType: pub.publication_type,
        aiClassification: pub.ai_classification,
        aiRelevanceScore: pub.ai_relevance_score,
        bestCorpusSimilarity: bestScore,
      }),
    );
    if (insertedRows.length > 0) created++;
  }
  return { alertsCreated: created };
}

/**
 * Para cada doc del corpus, busca en registry_publications publicaciones que
 * matcheen su título Y tengan edition_date más reciente que last_reform_date.
 * Esto cubre el caso "el scraper ya trajo la reforma pero el doc local no se
 * actualizó".
 */
async function checkOutdatedDocsFromInternal(corpus: MonitorableDoc[]): Promise<{ alertsCreated: number }> {
  let created = 0;
  for (const doc of corpus) {
    const docTitle = (doc.norm_title || doc.title || '').trim();
    if (!docTitle) continue;

    // Buscar candidatos en registry_publications usando ILIKE token primario
    const primaryToken = pickPrimaryToken(docTitle);
    if (!primaryToken || primaryToken.length < 5) continue;

    const candidates = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; edition_number: string | null;
      edition_date: Date | null; edition_pdf_url: string | null;
    }>>(
      `SELECT id, title, edition_number, edition_date, edition_pdf_url
         FROM public.registry_publications
        WHERE title ILIKE $1
          AND edition_date IS NOT NULL
        ORDER BY edition_date DESC
        LIMIT 5`,
      `%${primaryToken}%`,
    );

    const localDate = doc.last_reform_date || doc.publication_date;
    for (const pub of candidates) {
      const score = titleSimilarity(pub.title, docTitle);
      if (score < TITLE_SIMILARITY_THRESHOLD) continue;
      if (!pub.edition_date) continue;
      if (localDate && pub.edition_date <= localDate) continue;

      const insertedRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO public.norm_alerts (
           alert_type, severity, status, legal_doc_id, publication_id,
           title, description,
           local_publication_date, remote_publication_date,
           remote_source_url, remote_edition_number, remote_pdf_url,
           diff_data
         )
         VALUES ('outdated_doc', $1, 'open', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
         ON CONFLICT (alert_type, COALESCE(legal_doc_id,''), COALESCE(remote_edition_number,''), lower(title))
           WHERE status = 'open'
           DO NOTHING
         RETURNING id`,
        score >= 0.7 ? 'high' : 'medium',
        doc.id, pub.id,
        `Documento desactualizado: ${docTitle}`,
        `La fecha local de esta norma (${localDate ? localDate.toISOString().slice(0,10) : 'desconocida'}) es anterior a una publicación scrapeada en el Registro Oficial (${pub.edition_date.toISOString().slice(0,10)}, RO ${pub.edition_number || 'N/D'}) que coincide con su título (similitud ${(score*100).toFixed(0)}%). Aplica la actualización.`,
        localDate, pub.edition_date,
        null, pub.edition_number, pub.edition_pdf_url,
        JSON.stringify({ matchedPublicationTitle: pub.title, similarityScore: score }),
      );
      if (insertedRows.length > 0) created++;
      // Solo creamos UNA alerta por doc (la más reciente)
      break;
    }
  }
  return { alertsCreated: created };
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      signal: ac.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function extractXmlTag(block: string, tag: string): string | null {
  // CDATA-aware
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(cdata) || block.match(plain);
  return m ? m[1] : null;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
}

function extractDateFromText(s: string): Date | null {
  // Patrones comunes: dd/mm/yyyy, dd de Mes de yyyy, yyyy-mm-dd
  const slashed = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (slashed) {
    const d = new Date(`${slashed[3]}-${slashed[2].padStart(2,'0')}-${slashed[1].padStart(2,'0')}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const spanish = s.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (spanish) {
    const months: Record<string, number> = {
      enero:0, febrero:1, marzo:2, abril:3, mayo:4, junio:5, julio:6, agosto:7,
      septiembre:8, octubre:9, noviembre:10, diciembre:11,
    };
    const mIdx = months[spanish[2].toLowerCase()];
    if (mIdx !== undefined) {
      const d = new Date(Number(spanish[3]), mIdx, Number(spanish[1]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function extractEditionNumber(title: string): string | null {
  // "Suplemento al Registro Oficial No. 392" / "Registro Oficial No. 257"
  // / "Segundo Suplemento No. 276"
  const m = title.match(/(?:Registro\s+Oficial|Suplemento|Edici[oó]n[^N]*)\s*N[ºo°\.]*\s*(\d+)/i) ||
            title.match(/N[ºo°\.]*\s*(\d+)/);
  return m ? m[1] : null;
}

// ─── Fuzzy matching de títulos ────────────────────────────────────────────

const STOPWORDS = new Set([
  'de','la','el','los','las','del','y','a','que','en','para','por','con',
  'al','un','una','no','o','su','sus','se','sobre','ley','reforma','reformatoria',
  'codigo','código','registro','oficial','suplemento','edicion','edición',
  'no','nro','numero','número','articulo','artículo','arts','art',
]);

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): string[] {
  return normalizeTitle(s)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function titleSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  ta.forEach((t) => { if (tb.has(t)) intersection++; });
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function pickPrimaryToken(s: string): string | null {
  const tokens = tokenize(s);
  if (tokens.length === 0) return null;
  // El token más largo suele ser el más distintivo (ej: "tributario" > "codigo")
  return tokens.sort((a, b) => b.length - a.length)[0];
}
