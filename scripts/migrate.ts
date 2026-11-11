/**
 * Applies SQL migrations in supabase/migrations to the database in SUPABASE_DB_URL.
 * Tracks applied files in a `_migrations` table, so re-running only applies new ones.
 * Works without Docker or `supabase link`.
 *
 * First run on a database that already has some migrations applied by hand:
 *   npm run db:migrate -- --baseline 0003   (marks 0001–0003 as applied without running them)
 *
 * Usage: npm run db:migrate
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pg from 'pg';

const DIR = resolve(process.cwd(), 'supabase/migrations');

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not set (add it to .env.local)');
  // Baseline can arrive several ways: `-- --baseline 0003` (bash), as npm config when PowerShell
  // swallows the `--` (npm_config_baseline, or a bare 0003 argument), or MIGRATE_BASELINE=0003.
  const args = process.argv.slice(2);
  const baselineIdx = args.indexOf('--baseline');
  const npmBaseline = process.env.npm_config_baseline;
  const baseline =
    (baselineIdx >= 0 ? args[baselineIdx + 1] : undefined) ??
    process.env.MIGRATE_BASELINE ??
    (npmBaseline && /^\d{4}$/.test(npmBaseline) ? npmBaseline : undefined) ??
    (npmBaseline ? args.find((a) => /^\d{4}$/.test(a)) : undefined);
  if (baseline) console.log(`Baseline: treating migrations up to ${baseline} as already applied`);

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      'create table if not exists _migrations (name text primary key, applied_at timestamptz default now())',
    );
    const { rows } = await client.query<{ name: string }>('select name from _migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = readdirSync(DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      if (baseline && file.slice(0, baseline.length) <= baseline) {
        await client.query('insert into _migrations (name) values ($1)', [file]);
        console.log(`baseline  ${file}`);
        continue;
      }
      const sql = readFileSync(join(DIR, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into _migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log(`applied   ${file}`);
      } catch (err) {
        await client.query('rollback');
        const msg = (err as Error).message;
        const hint =
          /already exists/.test(msg) && applied.size === 0
            ? '\nThis database already has earlier migrations. Run once with a baseline, e.g.\n' +
              '  PowerShell: $env:MIGRATE_BASELINE="0003"; npm run db:migrate\n' +
              '  bash:       MIGRATE_BASELINE=0003 npm run db:migrate'
            : '';
        throw new Error(`${file} failed: ${msg}${hint}`);
      }
    }
    console.log('Migrations up to date');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
