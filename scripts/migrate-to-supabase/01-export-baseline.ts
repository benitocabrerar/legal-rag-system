/**
 * Script 01 — Export baseline desde Render (Fase 0).
 *
 * Genera:
 *   - dump SQL (pg_dump --no-owner --no-acl) para restaurar en branch Supabase
 *   - checksums por tabla para validar paridad post-restore
 *   - inventario de filas por tabla
 *
 * Uso:
 *   tsx scripts/migrate-to-supabase/01-export-baseline.ts
 *
 * Requiere: DATABASE_URL apuntando a Render (la actual).
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'migration-baseline');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('[1/3] pg_dump → migration-baseline/dump.sql ...');
  const dumpPath = `${OUT_DIR}/dump-${STAMP}.sql`;
  try {
    execSync(`pg_dump --no-owner --no-acl --no-privileges -f "${dumpPath}" "$DATABASE_URL"`, {
      stdio: 'inherit',
      shell: '/bin/bash',
    });
  } catch (err) {
    console.error('pg_dump falló. Verificar que `pg_dump` esté instalado y DATABASE_URL configurada.');
    throw err;
  }

  console.log('[2/3] Inventario de filas por tabla ...');
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;

    const inventory: Record<string, number> = {};
    for (const { table_name } of tables) {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `select count(*)::bigint as count from public."${table_name}"`
        );
        inventory[table_name] = Number(rows[0]?.count ?? 0);
      } catch (err) {
        inventory[table_name] = -1;
        console.warn(`  ! ${table_name}: ${(err as Error).message}`);
      }
    }

    writeFileSync(
      `${OUT_DIR}/inventory-${STAMP}.json`,
      JSON.stringify(inventory, null, 2),
      'utf8'
    );
    const total = Object.values(inventory).reduce((a, b) => a + Math.max(0, b), 0);
    console.log(`  → ${tables.length} tablas, ${total.toLocaleString()} filas totales`);

    console.log('[3/3] Checksum de columnas críticas (samples) ...');
    const checksums: Record<string, string> = {};
    const critical = [
      { table: 'users', column: 'email' },
      { table: 'cases', column: 'title' },
      { table: 'documents', column: 'title' },
      { table: 'legal_documents', column: 'norm_title' },
    ];
    for (const { table, column } of critical) {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ md5: string }>>(
          `select md5(string_agg(coalesce(${column}::text, ''), '|' order by id))
             from public."${table}"`
        );
        checksums[`${table}.${column}`] = rows[0]?.md5 ?? '<empty>';
      } catch (err) {
        checksums[`${table}.${column}`] = `error: ${(err as Error).message}`;
      }
    }

    writeFileSync(
      `${OUT_DIR}/checksums-${STAMP}.json`,
      JSON.stringify(checksums, null, 2),
      'utf8'
    );
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n✓ Baseline en ${OUT_DIR}/`);
  console.log('Próximo paso: subir el dump a Supabase (branch migracion) y aplicar las migrations 0001-0005.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
