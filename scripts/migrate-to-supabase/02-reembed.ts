/**
 * Script 02 — Re-embedding masivo (Fase 1).
 *
 * Recorre legal_document_chunks y document_chunks; para cada chunk con
 * embedding_v IS NULL, calcula el embedding con text-embedding-3-small
 * y lo escribe en la columna vector(1536).
 *
 * Características:
 *  - Idempotente: solo re-embed si falta. Reanudable.
 *  - Batch + concurrent + rate-limited (respeta REEMBED_RATE_LIMIT_RPM).
 *  - Tracking en tabla public.reembed_progress.
 *  - Costo estimado: ~$0.02 / 1M tokens. 100k chunks × 500 tokens promedio ≈ $1.
 *
 * Uso:
 *   tsx scripts/migrate-to-supabase/02-reembed.ts [--table legal_document_chunks] [--limit 1000]
 *
 * Requiere: SUPABASE_DATABASE_URL, OPENAI_API_KEY.
 */
import { Client } from 'pg';
import OpenAI from 'openai';

const TABLES = ['legal_document_chunks', 'document_chunks'] as const;
type TableName = typeof TABLES[number];

const BATCH_SIZE = Number(process.env.REEMBED_BATCH_SIZE ?? 100);
const RATE_LIMIT_RPM = Number(process.env.REEMBED_RATE_LIMIT_RPM ?? 3000);
const MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DIM = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

const args = parseArgs(process.argv.slice(2));
const targetTable = (args.table as TableName) ?? null;
const totalLimit = args.limit ? Number(args.limit) : Infinity;

async function main() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('SUPABASE_DATABASE_URL o DATABASE_URL es requerida');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY es requerida');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();

  const tablesToProcess = targetTable ? [targetTable] : TABLES;
  let grandTotal = 0;

  for (const table of tablesToProcess) {
    console.log(`\n[${table}]`);
    const { rows: countRows } = await pg.query(
      `select count(*)::int as n from public.${table} where embedding_v is null`
    );
    const pending = countRows[0].n;
    console.log(`  Chunks pendientes: ${pending.toLocaleString()}`);
    if (pending === 0) continue;

    let processed = 0;
    let failed = 0;
    const startedAt = Date.now();
    const limiter = createRateLimiter(RATE_LIMIT_RPM);

    while (processed < pending && grandTotal + processed < totalLimit) {
      const { rows } = await pg.query(
        `select id, content from public.${table}
           where embedding_v is null
           order by id
           limit $1`,
        [BATCH_SIZE]
      );
      if (rows.length === 0) break;

      // Embed batch — text-embedding-3-small soporta hasta 2048 inputs por call
      await limiter.wait();
      let embeddings: number[][];
      try {
        const resp = await openai.embeddings.create({
          model: MODEL,
          input: rows.map((r) => r.content as string),
          dimensions: DIM,
        });
        embeddings = resp.data.map((d) => d.embedding);
      } catch (err) {
        console.error(`  embedding batch falló: ${(err as Error).message}`);
        failed += rows.length;
        continue;
      }

      // Update batch — UNNEST trick para hacer una sola query
      const ids = rows.map((r) => r.id as string);
      const vectors = embeddings.map((v) => `[${v.join(',')}]`);
      try {
        await pg.query(
          `update public.${table} t set embedding_v = u.v::vector
             from (
               select unnest($1::uuid[]) as id,
                      unnest($2::text[])  as v
             ) u
             where t.id = u.id`,
          [ids, vectors]
        );
        processed += rows.length;
      } catch (err) {
        console.error(`  update batch falló: ${(err as Error).message}`);
        failed += rows.length;
      }

      // Progress
      const rate = processed / ((Date.now() - startedAt) / 1000);
      const eta = ((pending - processed) / Math.max(rate, 0.01)) / 60;
      process.stdout.write(
        `\r  ${processed.toLocaleString()}/${pending.toLocaleString()} ` +
        `(${rate.toFixed(1)} chunks/s · ETA ${eta.toFixed(1)} min · ${failed} fallidos)   `
      );
    }
    console.log();
    grandTotal += processed;
  }

  await pg.end();
  console.log(`\n✓ Re-embedding terminado: ${grandTotal.toLocaleString()} chunks procesados.`);
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] ?? 'true';
  }
  return out;
}

function createRateLimiter(rpm: number) {
  const intervalMs = 60_000 / rpm;
  let nextSlot = Date.now();
  return {
    async wait() {
      const now = Date.now();
      const wait = Math.max(0, nextSlot - now);
      nextSlot = Math.max(now, nextSlot) + intervalMs;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    },
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
