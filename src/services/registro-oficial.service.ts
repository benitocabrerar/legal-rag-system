/**
 * Servicio scraper del Registro Oficial del Ecuador.
 *
 * Estrategia:
 *  1) Descarga el listado HTML del año actual desde registroficial.gob.ec
 *  2) Extrae ediciones nuevas (compara contra registry_publications.edition_number)
 *  3) Para cada edición nueva: descarga el PDF, extrae texto con pdf-parse
 *  4) Parsea el TOC (índice) del PDF para identificar instrumentos individuales
 *  5) Para cada instrumento: clasifica con IA (tipo, materia legal, relevancia)
 *  6) Persiste en registry_publications con status 'analyzed'
 *  7) El admin revisa, aprueba/rechaza, y los aprobados se ingestan al corpus legal
 *
 * Tiempo total por edición: ~30-90s dependiendo del tamaño del PDF.
 * El cron diario procesa máx 5 ediciones nuevas por corrida para no saturar IA.
 */
import { prisma } from '../lib/prisma.js';
import { getAiClient } from '../lib/ai-client.js';

// NOTA: pdf-parse@1.1.1 tiene un bug conocido — su index.js abre un archivo
// de test (`./test/data/05-versions-space.pdf`) al importarse, que NO existe
// en el paquete npm. Si lo importamos top-level, crashea el server con
// ENOENT en cold start. Lo importamos dinámicamente dentro del handler que
// realmente lo usa (downloadAndExtractPdf). Issue: github.com/modesty/pdf-parse#18

const RO_BASE = 'https://www.registroficial.gob.ec';
const USER_AGENT = 'Mozilla/5.0 (compatible; PoweriaLegalBot/1.0; +https://poweria.cognitex.app/contact)';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_EDITIONS_PER_RUN = 5;
const MAX_PUBLICATIONS_PER_EDITION = 30;

interface ScrapedEdition {
  number: string;
  date: Date | null;
  pageUrl: string;
  pdfUrl: string | null;
}

interface ParsedPublication {
  type: string;
  number: string | null;
  title: string;
  issuingEntity: string | null;
  textExcerpt: string;
}

export type ScanProgressCallback = (event: string, data: any) => void;

/**
 * Entrypoint principal. Crea un scan, scrapea, persiste publicaciones,
 * y cierra el scan. Llamado por el cron diario o manualmente desde admin.
 *
 * Si se pasa `onProgress`, el servicio emite eventos en cada fase:
 *   phase  { phase, label, pct }
 *   edition { number, title }
 *   publication { type, title, classification }
 *   summary { editionsFound, publicationsFound, errors }
 */
export async function runScan(opts: {
  triggeredBy?: string;
  year?: number;
  onProgress?: ScanProgressCallback;
} = {}): Promise<{
  scanId: string;
  editionsFound: number;
  publicationsFound: number;
  errors: string[];
}> {
  const triggeredBy = opts.triggeredBy ?? 'cron';
  const year = opts.year ?? new Date().getFullYear();
  const emit: ScanProgressCallback = opts.onProgress || (() => {});

  // Crear scan record
  const scan = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.registry_scans (country_code, source, status, triggered_by, metadata)
     VALUES ($1, $2, 'running', $3, $4::jsonb)
     RETURNING id`,
    'EC', 'registro_oficial_ec', triggeredBy, JSON.stringify({ year }),
  );
  const scanId = scan[0].id;
  const errors: string[] = [];
  let editionsFound = 0;
  let publicationsFound = 0;

  try {
    emit('phase', { phase: 'starting', label: 'Conectando con Registro Oficial Ecuador…', pct: 3 });

    // 1) Listar ediciones del año
    emit('phase', { phase: 'listing', label: `Buscando ediciones publicadas en ${year}…`, pct: 8 });
    const editions = await listEditionsForYear(year);
    editionsFound = editions.length;
    emit('phase', { phase: 'listing-done', label: `${editionsFound} ediciones del año detectadas`, pct: 18 });

    // 2) Filtrar las que NO existen ya en registry_publications
    emit('phase', { phase: 'diff', label: 'Comparando con base local — detectando ediciones nuevas…', pct: 22 });
    const existing = await prisma.$queryRawUnsafe<Array<{ edition_number: string }>>(
      `SELECT DISTINCT edition_number FROM public.registry_publications
        WHERE source = 'registro_oficial_ec' AND edition_number IS NOT NULL`,
    );
    const knownEditions = new Set(existing.map((r) => r.edition_number));
    const newEditions = editions.filter((e) => !knownEditions.has(e.number)).slice(0, MAX_EDITIONS_PER_RUN);
    emit('phase', {
      phase: 'diff-done',
      label: newEditions.length === 0
        ? `Todas las ${editionsFound} ediciones ya están procesadas — no hay nada nuevo`
        : `${newEditions.length} ediciones NUEVAS — empezando descarga`,
      pct: 28,
      total: newEditions.length,
    });

    if (newEditions.length === 0) {
      emit('phase', { phase: 'no-new', label: 'Sin ediciones nuevas que procesar', pct: 95 });
    }

    // 3) Procesar cada edición nueva
    const totalEditions = newEditions.length || 1;
    let editionIndex = 0;
    for (const ed of newEditions) {
      editionIndex++;
      // Rango de pct para esta edición: 28% → 92% repartido proporcional
      const baseProg = 28 + ((editionIndex - 1) / totalEditions) * 64;
      const nextProg = 28 + (editionIndex / totalEditions) * 64;

      try {
        const edExt = ed as any as { rssContent?: string | null; titleHint?: string };
        emit('phase', {
          phase: 'downloading',
          label: ed.pdfUrl
            ? `Descargando RO ${ed.number} (${editionIndex}/${totalEditions})…`
            : `Sin PDF — usando contenido RSS de RO ${ed.number} (${editionIndex}/${totalEditions})…`,
          pct: Math.round(baseProg),
          edition: ed.number,
        });
        emit('edition', {
          number: ed.number,
          title: edExt.titleHint || `Registro Oficial ${ed.number}`,
          status: ed.pdfUrl ? 'downloading' : 'rss-fallback',
        });

        // 1) intentar PDF; 2) fallback al contenido del RSS si el PDF falla
        let text: string | null = null;
        if (ed.pdfUrl) {
          text = await downloadAndExtractPdf(ed.pdfUrl);
        }
        if (!text || text.length < 500) {
          // Fallback: HTML del RSS como texto plano. Es corto pero útil
          // para crear al menos UNA publicación con título + resumen.
          if (edExt.rssContent && edExt.rssContent.length > 50) {
            text = edExt.rssContent
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/\s+/g, ' ')
              .trim();
          }
        }
        if (!text || text.length < 50) {
          errors.push(`Edición ${ed.number}: sin PDF ni contenido RSS utilizable`);
          continue;
        }

        emit('phase', {
          phase: 'parsing',
          label: `Parseando texto (${(text.length / 1024).toFixed(0)} KB)…`,
          pct: Math.round(baseProg + (nextProg - baseProg) * 0.3),
          edition: ed.number,
        });

        let publications = parsePublicationsFromText(text).slice(0, MAX_PUBLICATIONS_PER_EDITION);

        // Si el parser no encontró headers reconocibles (caso típico cuando
        // venimos del fallback RSS — formato distinto al PDF oficial),
        // creamos UNA entrada con tipo inferido del texto (más útil que
        // un genérico 'general' que el auto-ingest filtraría).
        if (publications.length === 0) {
          // Inferencia rápida desde el contenido. El RSS content usa headers
          // como "FUNCIÓN EJECUTIVA / ACUERDO: / MINISTERIO DE..." que dan
          // pistas claras del tipo de instrumento legal.
          const upperText = text.toUpperCase();
          let inferredType = 'general';
          if (/LEY\s+ORG[ÁA]NICA/.test(upperText))            inferredType = 'ley_organica';
          else if (/DECRETO\s+EJECUTIVO/.test(upperText))     inferredType = 'decreto_ejecutivo';
          else if (/ACUERDO\s+MINISTERIAL/.test(upperText) || /ACUERDO:/.test(upperText)) inferredType = 'acuerdo_ministerial';
          else if (/RESOLUCI[ÓO]N:/.test(upperText) || /RESOLUCI[ÓO]N\s+N[ºO\.]/.test(upperText)) inferredType = 'resolucion';
          else if (/REGLAMENTO\s+(GENERAL|DE|PARA|A\s)/.test(upperText)) inferredType = 'reglamento';
          else if (/ORDENANZA\s+(MUNICIPAL|METROPOLITANA|N[ºO\.])/.test(upperText)) inferredType = 'ordenanza';
          else if (/^\s*LEY\s+/m.test(upperText))             inferredType = 'ley_ordinaria';

          publications = [{
            type: inferredType,
            number: null,
            title: edExt.titleHint || `Registro Oficial No. ${ed.number}`,
            issuingEntity: null,
            textExcerpt: text.slice(0, 3000),
          }];
          emit('phase', {
            phase: 'fallback-typed',
            label: `Tipo inferido: ${inferredType} (sin headers detallados)`,
            pct: Math.round(baseProg + (nextProg - baseProg) * 0.4),
            edition: ed.number,
          });
        }

        emit('phase', {
          phase: 'analyzing',
          label: `Analizando ${publications.length} instrumentos legales con IA…`,
          pct: Math.round(baseProg + (nextProg - baseProg) * 0.5),
          edition: ed.number,
          publications: publications.length,
        });

        let pubIdx = 0;
        for (const pub of publications) {
          pubIdx++;
          try {
            // Insertar publicación detectada (UPSERT por UNIQUE constraint)
            const aiAnalysis = await analyzePublicationWithAI(pub);
            await prisma.$executeRawUnsafe(
              `INSERT INTO public.registry_publications (
                scan_id, country_code, source, edition_number, edition_date,
                edition_url, edition_pdf_url, publication_type, publication_number,
                title, issuing_entity, coverage_scope, raw_text_excerpt, raw_text_length,
                ai_summary, ai_classification, ai_relevance_score, ai_keywords,
                ai_analysis_meta, status
              ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::text[], $19::jsonb, 'analyzed')
              ON CONFLICT (source, edition_number, publication_number, title) DO NOTHING`,
              scanId, 'EC', 'registro_oficial_ec',
              ed.number, ed.date, ed.pageUrl, ed.pdfUrl,
              pub.type, pub.number, pub.title, pub.issuingEntity, 'national',
              pub.textExcerpt.slice(0, 8000), pub.textExcerpt.length,
              aiAnalysis.summary, aiAnalysis.classification, aiAnalysis.relevanceScore,
              aiAnalysis.keywords,
              JSON.stringify(aiAnalysis.meta),
            );
            publicationsFound++;
            emit('publication', {
              type: pub.type,
              title: pub.title.slice(0, 100),
              classification: aiAnalysis.classification,
              edition: ed.number,
              index: pubIdx,
              total: publications.length,
            });
          } catch (e: any) {
            errors.push(`Pub "${pub.title.slice(0, 60)}": ${e?.message || 'error'}`);
          }
        }

        emit('edition-done', {
          number: ed.number,
          publicationsCount: publications.length,
        });

        // Cerrar alertas new_edition abiertas para esta edición — el monitor
        // ya cumplió su propósito una vez que el scraper procesó la edición.
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE public.norm_alerts
                SET status = 'resolved',
                    resolved_at = now(),
                    resolved_by = 'auto:scan',
                    resolution_notes = COALESCE(resolution_notes,'') ||
                                       ' [auto] Edición scrapeada por scan ' || $2::text,
                    updated_at = now()
              WHERE status = 'open'
                AND alert_type = 'new_edition'
                AND remote_edition_number = $1`,
            ed.number, scanId,
          );
        } catch { /* ignore, no es crítico */ }
      } catch (e: any) {
        errors.push(`Edición ${ed.number}: ${e?.message || 'error'}`);
      }
    }

    emit('phase', {
      phase: 'summary',
      label: `Procesadas ${publicationsFound} normas de ${newEditions.length} ediciones nuevas`,
      pct: 96,
    });
  } catch (e: any) {
    errors.push(`Scan: ${e?.message || 'fatal error'}`);
    emit('error', { error: e?.message || 'fatal error' });
  }

  emit('summary', { editionsFound, publicationsFound, errors });

  // Auto-ingest de publicaciones que cumplan criterios de relevancia.
  // Convierte registry_publications → legal_documents + chunks + embeddings
  // + notificaciones, todo dentro del mismo flujo del scan.
  let autoIngested = 0;
  let autoIngestNotified = 0;
  if (publicationsFound > 0) {
    emit('phase', {
      phase: 'auto-ingest',
      label: 'Auto-ingesta de leyes/decretos relevantes al corpus…',
      pct: 97,
    });
    try {
      const { autoIngestQualified } = await import('./corpus-ingestion.service.js');
      const r = await autoIngestQualified({ scanId, triggeredBy });
      autoIngested = r.succeeded;
      autoIngestNotified = r.totalNotified;
      emit('phase', {
        phase: 'auto-ingest-done',
        label: `Auto-ingestadas ${r.succeeded}/${r.processed} normas (${r.totalChunks} chunks, ${r.totalNotified} usuarios notificados)`,
        pct: 99,
      });
      if (r.failed > 0) {
        errors.push(`Auto-ingest: ${r.failed} fallaron — ${r.errors.map((e) => e.error.slice(0, 60)).join('; ')}`);
      }
    } catch (e: any) {
      errors.push(`Auto-ingest fatal: ${e?.message || 'error'}`);
    }
  }

  emit('summary', {
    editionsFound,
    publicationsFound,
    autoIngested,
    autoIngestNotified,
    errors,
  });

  // Cerrar scan
  await prisma.$executeRawUnsafe(
    `UPDATE public.registry_scans
     SET completed_at = now(),
         status = $2,
         editions_found = $3,
         publications_found = $4,
         errors = $5::jsonb
     WHERE id = $1::uuid`,
    scanId,
    errors.length > 0 && publicationsFound === 0 ? 'failed' : 'completed',
    editionsFound, publicationsFound, JSON.stringify(errors),
  );

  return { scanId, editionsFound, publicationsFound, errors };
}

/**
 * Lista ediciones recientes del Registro Oficial usando el RSS oficial
 * de WordPress (/feed/). Reemplaza la implementación legacy que iba al
 * listado Joomla /index.php/registro-oficial-web/... — esa URL ahora
 * devuelve un 301 y la página destino ya no tiene los selectors
 * esperados, por lo que el scraper viejo devolvía 0 ediciones.
 *
 * El RSS expone los últimos ~23 items con: <title> (ej. "Tercer
 * Suplemento No. 283"), <link> (URL del post WP), <pubDate>, <category>,
 * y <content:encoded> con el índice resumido de la edición. Si no
 * podemos extraer el PDF (vive en CDN externo opaco
 * esacc.corteconstitucional.gob.ec), usamos el contenido del RSS como
 * fallback — es texto en HTML simple que el parser ya sabe procesar.
 *
 * El parámetro `year` se mantiene por compatibilidad pero el RSS no
 * filtra por año — devuelve siempre los más recientes.
 */
async function listEditionsForYear(_year: number): Promise<ScrapedEdition[]> {
  const xml = await fetchText(`${RO_BASE}/feed/`);
  if (!xml) return [];

  // Parser RSS — extrae cada <item>
  interface RssItem {
    title: string;
    link: string;
    pubDate: Date;
    category: string | null;
    contentHtml: string | null;
  }
  const rssItems: RssItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string): string | null => {
      const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
      const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const mm = block.match(cdata) || block.match(plain);
      return mm ? mm[1] : null;
    };
    const title    = get('title')?.trim() || '';
    const link     = get('link')?.trim() || '';
    const pubRaw   = get('pubDate')?.trim() || '';
    const category = get('category')?.trim() || null;
    const contentRaw = get('content:encoded');

    if (!title || !link || !pubRaw) continue;
    const pubDate = new Date(pubRaw);
    if (Number.isNaN(pubDate.getTime())) continue;

    rssItems.push({ title, link, pubDate, category, contentHtml: contentRaw });
  }

  // Para cada item, intentar resolver el PDF del post HTML
  const results: ScrapedEdition[] = [];
  for (const item of rssItems) {
    // Número de edición desde el título (ej. "Tercer Suplemento No. 283")
    const numMatch = item.title.match(/N[ºo°\.]*\s*(\d+)/);
    if (!numMatch) continue;
    const number = numMatch[1];

    let pdfUrl: string | null = null;
    try {
      const html = await fetchText(item.link);
      if (html) {
        // Los PDFs viven en el CDN de la Corte Constitucional
        // (esacc.corteconstitucional.gob.ec/storage/api/v1/10_DWL_FL/<blob>)
        // o ocasionalmente como .pdf directo.
        const pdfMatch =
          html.match(/href="(https?:\/\/[^"]*esacc\.corteconstitucional\.gob\.ec[^"]+)"/i) ||
          html.match(/href="(https?:\/\/[^"]*\/storage\/api\/v1\/10_DWL_FL\/[^"]+)"/i) ||
          html.match(/href="(https?:\/\/[^"]+\.pdf)"/i) ||
          html.match(/href="([^"]+\.pdf)"/i);
        if (pdfMatch) {
          pdfUrl = pdfMatch[1].startsWith('http')
            ? pdfMatch[1]
            : `${RO_BASE}${pdfMatch[1].startsWith('/') ? '' : '/'}${pdfMatch[1]}`;
        }
      }
    } catch { /* skip */ }

    results.push({
      number,
      date: item.pubDate,
      pageUrl: item.link,
      pdfUrl,
      // Se anexa el contenido del RSS para uso como fallback si el PDF falla
      rssContent: item.contentHtml,
      titleHint: item.title,
      categoryHint: item.category,
    } as ScrapedEditionWithFallback);

    // Cortesía: 800ms entre requests
    await sleep(800);
  }

  // Ordenar más recientes primero (no estrictamente necesario, RSS ya viene así)
  return results.sort((a, b) =>
    (b.date?.getTime() || 0) - (a.date?.getTime() || 0),
  );
}

// Variante de ScrapedEdition que adjunta fallback content del RSS
interface ScrapedEditionWithFallback extends ScrapedEdition {
  rssContent?: string | null;
  titleHint?: string;
  categoryHint?: string | null;
}

async function downloadAndExtractPdf(pdfUrl: string): Promise<string | null> {
  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const r = await fetch(pdfUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: ac.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    // Dynamic import para evitar el bug ENOENT de pdf-parse al cold start.
    // @ts-ignore - pdf-parse no tiene types
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buf);
    return parsed.text || null;
  } catch {
    return null;
  }
}

/**
 * Parsea el texto del PDF y extrae publicaciones individuales (leyes,
 * decretos, acuerdos, etc.) usando heurísticas sobre patrones recurrentes
 * en el formato del Registro Oficial.
 *
 * Estrategia: el RO típicamente tiene secciones separadas por encabezados
 * en MAYÚSCULAS con el nombre del instrumento. Buscamos esos delimitadores
 * y extraemos el texto entre uno y el siguiente.
 */
function parsePublicationsFromText(text: string): ParsedPublication[] {
  const publications: ParsedPublication[] = [];

  // Patrones de inicio de instrumento (orden de prioridad)
  const PATTERNS = [
    { type: 'ley_organica',       regex: /^\s*LEY\s+ORG[ÁA]NICA\s+(?:DE\s+|REFORMATORIA\s+|N[ºO\.]*\s*\d+\s+)?/im },
    { type: 'ley_ordinaria',      regex: /^\s*LEY\s+(?:DE\s+|REFORMATORIA\s+|N[ºO\.]*\s*\d+\s+|\w)/im },
    { type: 'decreto_ejecutivo',  regex: /^\s*DECRETO\s+(?:EJECUTIVO\s+)?N[ºO\.]*\s*(\d+)/im },
    { type: 'acuerdo_ministerial',regex: /^\s*ACUERDO\s+(?:MINISTERIAL\s+)?(?:N[ºO\.]*\s*([\w\-]+))/im },
    { type: 'resolucion',         regex: /^\s*RESOLUCI[ÓO]N\s+(?:N[ºO\.]*\s*([\w\-]+))/im },
    { type: 'reglamento',         regex: /^\s*REGLAMENTO\s+(?:GENERAL\s+|DE\s+|PARA\s+|A\s+)/im },
    { type: 'ordenanza',          regex: /^\s*ORDENANZA\s+(?:N[ºO\.]*\s*([\w\-]+))/im },
  ];

  // Dividir el texto en bloques de aprox. cada documento
  // Aplicamos un split por líneas en mayúsculas que parezcan headers
  const lines = text.split(/\r?\n/);
  let currentBlock: { type: string; number: string | null; title: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 4) continue;

    let matchedPattern: { type: string; numberMatch: RegExpMatchArray | null } | null = null;
    for (const p of PATTERNS) {
      const m = line.match(p.regex);
      if (m) {
        matchedPattern = { type: p.type, numberMatch: m };
        break;
      }
    }

    if (matchedPattern) {
      // Cerrar el bloque anterior
      if (currentBlock && currentBlock.lines.length > 5) {
        publications.push({
          type: currentBlock.type,
          number: currentBlock.number,
          title: currentBlock.title.slice(0, 280),
          issuingEntity: detectIssuingEntity(currentBlock.lines.slice(0, 30).join(' ')),
          textExcerpt: currentBlock.lines.slice(0, 200).join('\n').slice(0, 8000),
        });
      }
      currentBlock = {
        type: matchedPattern.type,
        number: matchedPattern.numberMatch?.[1] ?? null,
        title: line,
        lines: [line],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
      // Extender el título si las primeras líneas son cortas (continuación)
      if (currentBlock.lines.length < 4 && line.length < 120) {
        currentBlock.title = (currentBlock.title + ' ' + line).slice(0, 280);
      }
    }
  }

  // Cerrar último bloque
  if (currentBlock && currentBlock.lines.length > 5) {
    publications.push({
      type: currentBlock.type,
      number: currentBlock.number,
      title: currentBlock.title.slice(0, 280),
      issuingEntity: detectIssuingEntity(currentBlock.lines.slice(0, 30).join(' ')),
      textExcerpt: currentBlock.lines.slice(0, 200).join('\n').slice(0, 8000),
    });
  }

  return publications;
}

function detectIssuingEntity(text: string): string | null {
  const PATTERNS = [
    /Presidencia\s+de\s+la\s+Rep[úu]blica/i,
    /Asamblea\s+Nacional/i,
    /Ministerio\s+(?:del?|de la)\s+([A-Z][A-Za-z\s,]+)/i,
    /Servicio\s+de\s+Rentas\s+Internas/i,
    /Superintendencia\s+(?:de|del)\s+([A-Z][\wáéíóúñ\s]+)/i,
    /Corte\s+Constitucional/i,
    /Corte\s+Nacional\s+de\s+Justicia/i,
    /Consejo\s+(?:de\s+la\s+Judicatura|Nacional\s+Electoral)/i,
    /Procuradur[íi]a\s+General/i,
    /Contralor[íi]a\s+General/i,
    /Banco\s+Central\s+del\s+Ecuador/i,
  ];
  for (const p of PATTERNS) {
    const m = text.match(p);
    if (m) return m[0].slice(0, 120);
  }
  return null;
}

interface AIAnalysis {
  summary: string;
  classification: string;
  relevanceScore: number;
  keywords: string[];
  meta: any;
}

async function analyzePublicationWithAI(pub: ParsedPublication): Promise<AIAnalysis> {
  // Fallback si IA falla — no debemos romper el scrape entero
  const FALLBACK: AIAnalysis = {
    summary: pub.title.slice(0, 240),
    classification: 'general',
    relevanceScore: 0.5,
    keywords: [],
    meta: { fallback: true },
  };

  try {
    const ai = await getAiClient();
    const prompt = `Eres un(a) abogado(a) ecuatoriano(a) clasificando una publicación del Registro Oficial.

Devuelve EXCLUSIVAMENTE un objeto JSON con estos campos (primer carácter '{', último '}'):
{
  "summary": "<2-4 oraciones explicando qué establece esta norma>",
  "classification": "<una de: penal, civil, laboral, constitucional, transito, administrativo, tributario, mercantil, familia, inquilinato, ambiental, propiedad_intelectual, societario, notarial, agrario, internacional, general>",
  "relevanceScore": <número 0..1 indicando qué tan importante es para vectorizar en el corpus legal>,
  "keywords": ["palabra clave 1", "palabra clave 2", "..."]
}

PUBLICACIÓN:
Tipo: ${pub.type}
${pub.number ? `Número: ${pub.number}` : ''}
${pub.issuingEntity ? `Entidad: ${pub.issuingEntity}` : ''}
Título: ${pub.title}

Extracto:
${pub.textExcerpt.slice(0, 4000)}`;

    const r: any = await ai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });
    const raw = (r.choices?.[0]?.message?.content || '').trim();
    const fenced = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const start = fenced.indexOf('{');
    const end = fenced.lastIndexOf('}');
    if (start < 0 || end < start) return FALLBACK;
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    return {
      summary: String(parsed.summary || pub.title).slice(0, 800),
      classification: String(parsed.classification || 'general').toLowerCase().slice(0, 40),
      relevanceScore: Math.max(0, Math.min(1, Number(parsed.relevanceScore) || 0.5)),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.slice(0, 12).map((k: any) => String(k).slice(0, 80))
        : [],
      meta: { model: ai.model, generatedAt: new Date().toISOString() },
    };
  } catch (e: any) {
    return { ...FALLBACK, meta: { fallback: true, error: e?.message?.slice(0, 200) } };
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function parseSpanishDate(d1: string, d2: string, d3: string): Date | null {
  const MESES: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  };
  try {
    const day = parseInt(d1, 10);
    const year = parseInt(d3, 10);
    let month: number;
    const monthKey = d2.toLowerCase().trim();
    if (MESES[monthKey] !== undefined) {
      month = MESES[monthKey];
    } else {
      month = parseInt(d2, 10) - 1;
    }
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(Date.UTC(year, month, day));
  } catch {
    return null;
  }
}
