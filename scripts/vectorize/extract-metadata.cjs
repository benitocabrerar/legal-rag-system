/**
 * Extractor de metadatos completo para PDFs jurídicos.
 *
 * Captura:
 *   - Metadata nativa del PDF (Title, Author, Subject, Keywords, Creator,
 *     Producer, CreationDate, ModDate, PDFFormatVersion, IsAcroFormPresent,
 *     IsXFAPresent, IsLinearized, NumPages, PDF version, encryption flags)
 *   - Metadata heurística extraída del CONTENIDO:
 *       · norm_title (primera línea no vacía y suficientemente larga)
 *       · publication_number (ROS-XXX, RO XXX, Suplemento XXX, etc.)
 *       · publication_type (ORDINARIO, SUPLEMENTO, …)
 *       · publication_date (fecha de publicación)
 *       · last_reform_date (última reforma detectada)
 *       · document_state (ORIGINAL vs REFORMADO)
 *       · keywords detectadas (constitucion, codigo, ley, reglamento, …)
 *       · numero de articulos, libros, titulos
 *       · referencias (hace mención a otra ley)
 *   - Estadísticas: file_size, sha256, char_count, word_count, page_count,
 *     extraction_method (pdf-parse | vision | failed)
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function detectPublication(text) {
  // Busca patrones del Registro Oficial:
  //   "Suplemento del Registro Oficial Nº 449"
  //   "Registro Oficial No. 180"
  //   "R.O. 449"
  //   "RO No 180"
  //   "Segundo Suplemento del Registro Oficial No. 837"
  const result = { publication_number: 'ND', publication_type: 'ORDINARIO' };

  const t = text.slice(0, 5000); // primeras páginas

  // Tipo de publicación
  if (/segundo\s+suplemento/i.test(t)) result.publication_type = 'SEGUNDO_SUPLEMENTO';
  else if (/suplemento\s+especial/i.test(t)) result.publication_type = 'SUPLEMENTO_ESPECIAL';
  else if (/edici[oó]n\s+constitucional/i.test(t)) result.publication_type = 'EDICION_CONSTITUCIONAL';
  else if (/suplemento/i.test(t)) result.publication_type = 'SUPLEMENTO';

  // Número
  const patterns = [
    /Registro\s+Oficial\s+(?:N[°º\.o]?\s*|n[uú]mero\s+)?(\d{1,5})/i,
    /R\.?\s*O\.?\s*(?:N[°º\.o]?\s*)?(\d{1,5})/i,
    /\bNo\.?\s*(\d{1,5})\b/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) { result.publication_number = m[1]; break; }
  }
  return result;
}

function detectDate(text) {
  // Busca fecha en formato común español:
  //   "20 de octubre de 2008"
  //   "20-OCT-2008"
  //   "20/10/2008"
  //   "octubre 20, 2008"
  const t = text.slice(0, 5000);
  const months = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
    noviembre: 11, diciembre: 12,
  };
  // "20 de octubre de 2008"
  let m = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = months[m[2].toLowerCase().replace(/[áéíóú]/g, c => 'aeiou'['áéíóú'.indexOf(c)])];
    const y = parseInt(m[3], 10);
    if (mo && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return new Date(Date.UTC(y, mo - 1, d)).toISOString();
    }
  }
  // dd/mm/yyyy
  m = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return new Date(Date.UTC(y, mo - 1, d)).toISOString();
    }
  }
  return null;
}

function detectLastReform(text) {
  // "Última modificación: 31-dic-2024" / "Última reforma: 2023" / "modificado el …"
  const reformPatterns = [
    /[uú]ltima\s+(?:modificaci[oó]n|reforma)\s*[:\s]+([^\n.]+)/i,
    /reformado\s+por\s+[^\n]+?(\d{4})/i,
    /[uú]ltima\s+actualizaci[oó]n\s*[:\s]+([^\n.]+)/i,
  ];
  for (const re of reformPatterns) {
    const m = text.match(re);
    if (m) {
      // Intentar parsear como fecha
      const date = detectDate(m[1] || m[0]);
      if (date) return date;
    }
  }
  return null;
}

function detectStructure(text) {
  // Conteos heurísticos
  const articles = (text.match(/\bArt\.?\s*\d+/gi) || []).length;
  const books = (text.match(/\bLibro\s+(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo|Noveno|Décimo|[IVX]+)\b/gi) || []).length;
  const titles = (text.match(/\bT[ií]tulo\s+(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo|Noveno|Décimo|[IVX]+|\d+)\b/gi) || []).length;
  const chapters = (text.match(/\bCap[ií]tulo\s+(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo|Noveno|Décimo|[IVX]+|\d+)\b/gi) || []).length;
  const sections = (text.match(/\bSecci[oó]n\s+(?:Primera|Segunda|Tercera|Cuarta|Quinta|[IVX]+|\d+)\b/gi) || []).length;
  const paragraphs = (text.match(/\bParr?[áa]grafo\s+\d+/gi) || []).length;
  return { articles, books, titles, chapters, sections, paragraphs };
}

function detectKeywords(text) {
  const t = text.toLowerCase();
  const found = [];
  const candidates = [
    'derechos humanos', 'garantías constitucionales', 'debido proceso',
    'principio de legalidad', 'tutela judicial', 'derechos fundamentales',
    'iguald', 'libertad', 'propiedad', 'familia', 'matrimonio', 'divorcio',
    'sucesion', 'contrato', 'obligación', 'responsabilidad civil',
    'delito', 'pena', 'culpabilidad', 'flagrancia', 'medida cautelar',
    'inocencia', 'tributo', 'impuesto', 'tasa', 'contribución',
    'trabajo', 'salario', 'jornada', 'sindicato', 'huelga', 'despido',
    'menor', 'niño', 'adolescente', 'patria potestad',
    'contratación pública', 'consulta popular', 'soberanía',
    'amparo', 'habeas corpus', 'habeas data', 'acción de protección',
  ];
  for (const k of candidates) {
    if (t.includes(k)) found.push(k);
  }
  return found.slice(0, 30);
}

function detectReferences(text) {
  // Detecta menciones a otras leyes ("Ley Orgánica de…", "Código …", "Reglamento …")
  const refs = new Set();
  const patterns = [
    /Ley\s+Org[áa]nica\s+(?:de|del)\s+([A-Z][^\n.,;]{5,80})/g,
    /C[oó]digo\s+(?:Org[áa]nico|Civil|Penal|Tributario|de\s+Trabajo|de\s+la\s+Niñez|de\s+la\s+Democracia)\s*(?:de\s+([A-Z][^\n.,;]{5,80}))?/g,
    /Reglamento\s+(?:a\s+la\s+|General\s+a\s+la\s+)?([A-Z][^\n.,;]{5,80})/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[0]) refs.add(m[0].trim().slice(0, 120));
      if (refs.size > 50) break;
    }
  }
  return Array.from(refs).slice(0, 50);
}

function detectArticles(text) {
  // Lista los primeros 5 articulos para enriquecer metadata
  const matches = text.match(/Art\.?\s*\d+\.[^\n]{0,200}/gi) || [];
  return matches.slice(0, 5).map(s => s.replace(/\s+/g, ' ').trim());
}

function fixEncoding(s) {
  if (!s) return s;
  // Detectar y reparar mojibake típico de pdf-parse en español
  // (ej. "RepÃºblica" → "República")
  try {
    if (/Ã[¡©­³º±]|Ã±|Â/.test(s)) {
      return Buffer.from(s, 'latin1').toString('utf8');
    }
  } catch {}
  return s;
}

function extractTitleFromContent(text) {
  // La primera línea con >20 caracteres que no sea un encabezado de Registro Oficial
  const lines = text.split(/\n/).map(l => fixEncoding(l).trim()).filter(l => l.length > 20 && l.length < 200);
  for (const l of lines.slice(0, 30)) {
    if (/^(?:Registro|R\.?O|Suplemento|EDICI[OÓ]N|Año|Quito|Lic\.|Dr\.)/i.test(l)) continue;
    return l;
  }
  return null;
}

/**
 * Extracción completa.
 * Recibe el filename y el resultado de pdf-parse({ text, numpages, info, metadata, version }).
 */
function buildMetadata(filename, filePath, parsedPdf, classification) {
  const buf = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);

  const text = parsedPdf?.text || '';
  const native = parsedPdf?.info || {};
  const xmp = parsedPdf?.metadata?.toJSON?.() || null;

  const detectedPub = detectPublication(text);
  const detectedPubDate = detectDate(text);
  const detectedReform = detectLastReform(text);
  const structure = detectStructure(text);
  const keywords = detectKeywords(text);
  const refs = detectReferences(text);
  const sampleArticles = detectArticles(text);
  const contentTitle = extractTitleFromContent(text);

  const wordCount = (text.match(/\S+/g) || []).length;

  return {
    // Lo que va a campos estructurados de legal_documents
    structured: {
      norm_title: contentTitle || classification.title || filename.replace(/\.pdf$/i, ''),
      publication_number: detectedPub.publication_number,
      publication_type: detectedPub.publication_type,
      publication_date: detectedPubDate,
      last_reform_date: detectedReform,
      document_state: detectedReform ? 'REFORMADO' : 'ORIGINAL',
    },
    // Todo lo demás va al campo metadata jsonb
    metadata: {
      file: {
        original_filename: filename,
        size_bytes: stats.size,
        size_kb: Math.round(stats.size / 1024),
        sha256: sha256(buf),
        file_modified: stats.mtime.toISOString(),
        file_created: stats.birthtime.toISOString(),
      },
      extraction: {
        method: parsedPdf?._source || 'pdf-parse',
        page_count: parsedPdf?.numpages || 0,
        char_count: text.length,
        word_count: wordCount,
        avg_chars_per_page: parsedPdf?.numpages ? Math.round(text.length / parsedPdf.numpages) : 0,
        pdf_version: parsedPdf?.version || null,
      },
      pdf_native: {
        title: native.Title || null,
        author: native.Author || null,
        subject: native.Subject || null,
        keywords: native.Keywords || null,
        creator: native.Creator || null,
        producer: native.Producer || null,
        creation_date: native.CreationDate || null,
        mod_date: native.ModDate || null,
        is_acroform: native.IsAcroFormPresent || false,
        is_xfa: native.IsXFAPresent || false,
        is_linearized: native.IsLinearized || false,
        is_encrypted: native.IsEncrypted || false,
      },
      pdf_xmp: xmp,
      classification,
      detected: {
        content_title: contentTitle,
        publication: detectedPub,
        publication_date: detectedPubDate,
        last_reform_date: detectedReform,
        keywords,
        structure,
        sample_articles: sampleArticles,
        references_to: refs,
      },
      ingested_at: new Date().toISOString(),
    },
  };
}

module.exports = { buildMetadata, sha256 };
