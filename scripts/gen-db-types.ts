/**
 * Generates src/lib/supabase/types.ts from the live database schema (public schema only).
 * Reads SUPABASE_DB_URL from the environment. Works without Docker, unlike
 * `supabase gen types --db-url`. Output matches the shape supabase-js expects.
 *
 * Usage: npm run db:types
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const SCHEMA = 'public';
const OUT = resolve(process.cwd(), 'src/lib/supabase/types.ts');

type Column = {
  table_name: string;
  column_name: string;
  udt_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  is_identity: 'YES' | 'NO';
  is_generated: 'ALWAYS' | 'NEVER';
};

const key = (name: string) => (/^[a-z_][a-z0-9_]*$/i.test(name) ? name : JSON.stringify(name));

function baseType(udt: string, enums: Set<string>): string {
  if (enums.has(udt)) return `Database['public']['Enums']['${udt}']`;
  switch (udt) {
    case 'bool':
      return 'boolean';
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
      return 'number';
    case 'json':
    case 'jsonb':
      return 'Json';
    case 'void':
      return 'undefined';
    default:
      return 'string'; // text, varchar, uuid, date, timestamptz, inet, etc.
  }
}

function tsType(udt: string, enums: Set<string>): string {
  return udt.startsWith('_') ? `${baseType(udt.slice(1), enums)}[]` : baseType(udt, enums);
}

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is not set (add it to .env.local)');
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const enumRows = await client.query<{ name: string; value: string }>(
      `select t.typname as name, e.enumlabel as value
         from pg_type t join pg_enum e on e.enumtypid = t.oid
         join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = $1 order by t.typname, e.enumsortorder`,
      [SCHEMA],
    );
    const enums = new Map<string, string[]>();
    for (const r of enumRows.rows) enums.set(r.name, [...(enums.get(r.name) ?? []), r.value]);
    const enumNames = new Set(enums.keys());

    const relRows = await client.query<{ name: string; kind: 'BASE TABLE' | 'VIEW' }>(
      `select table_name as name, table_type as kind from information_schema.tables
        where table_schema = $1 order by table_name`,
      [SCHEMA],
    );

    const colRows = await client.query<Column>(
      `select table_name, column_name, udt_name, data_type, is_nullable, column_default, is_identity, is_generated
         from information_schema.columns where table_schema = $1
        order by table_name, column_name`,
      [SCHEMA],
    );
    const columnsByTable = new Map<string, Column[]>();
    for (const c of colRows.rows)
      columnsByTable.set(c.table_name, [...(columnsByTable.get(c.table_name) ?? []), c]);

    const fkRows = await client.query<{
      table_name: string;
      fk_name: string;
      columns: string[];
      ref_table: string;
      ref_columns: string[];
      is_one_to_one: boolean;
    }>(
      `select src.relname as table_name, con.conname as fk_name,
              array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k order by a.attname)::text[] as columns,
              dst.relname as ref_table,
              array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k order by a.attname)::text[] as ref_columns,
              exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
                        and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x) =
                            (select array_agg(x order by x) from unnest(con.conkey) x)) as is_one_to_one
         from pg_constraint con
         join pg_class src on src.oid = con.conrelid
         join pg_class dst on dst.oid = con.confrelid
         join pg_namespace n on n.oid = src.relnamespace
         join pg_namespace dn on dn.oid = dst.relnamespace
        where con.contype = 'f' and n.nspname = $1 and dn.nspname = $1
        order by src.relname, con.conname`,
      [SCHEMA],
    );

    const fnRows = await client.query<{ name: string; args: string | null; returns: string }>(
      `select p.proname as name,
              (select string_agg(coalesce(p.proargnames[i], 'arg' || i) || ':' || t.typname || ':' || (i > p.pronargs - p.pronargdefaults)::text, ',' order by i)
                 from unnest(p.proargtypes::oid[]) with ordinality as a(oid, i)
                 join pg_type t on t.oid = a.oid) as args,
              rt.typname as returns
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         join pg_type rt on rt.oid = p.prorettype
        where n.nspname = $1 and p.prokind = 'f'
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
        order by p.proname`,
      [SCHEMA],
    );

    const out: string[] = [];
    out.push('// Generated by: npm run db:types (scripts/gen-db-types.ts). Do not edit by hand.');
    out.push('');
    out.push(
      'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];',
    );
    out.push('');
    out.push('export type Database = {');
    out.push('  public: {');

    const relationshipsFor = (table: string, indent: string) => {
      const fks = fkRows.rows.filter((f) => f.table_name === table);
      if (fks.length === 0) return `${indent}Relationships: [];`;
      const items = fks.map(
        (f) =>
          `${indent}  {\n` +
          `${indent}    foreignKeyName: ${JSON.stringify(f.fk_name)};\n` +
          `${indent}    columns: ${JSON.stringify(f.columns)};\n` +
          `${indent}    isOneToOne: ${f.is_one_to_one};\n` +
          `${indent}    referencedRelation: ${JSON.stringify(f.ref_table)};\n` +
          `${indent}    referencedColumns: ${JSON.stringify(f.ref_columns)};\n` +
          `${indent}  },`,
      );
      return `${indent}Relationships: [\n${items.join('\n')}\n${indent}];`;
    };

    // Tables
    out.push('    Tables: {');
    for (const rel of relRows.rows.filter((r) => r.kind === 'BASE TABLE')) {
      const cols = columnsByTable.get(rel.name) ?? [];
      const field = (c: Column, mode: 'row' | 'insert' | 'update') => {
        const t = tsType(c.udt_name, enumNames) + (c.is_nullable === 'YES' ? ' | null' : '');
        const optional =
          mode === 'update' ||
          (mode === 'insert' &&
            (c.is_nullable === 'YES' ||
              c.column_default !== null ||
              c.is_identity === 'YES' ||
              c.is_generated === 'ALWAYS'));
        return `          ${key(c.column_name)}${optional ? '?' : ''}: ${t};`;
      };
      out.push(`      ${key(rel.name)}: {`);
      for (const mode of ['row', 'insert', 'update'] as const) {
        out.push(`        ${mode === 'row' ? 'Row' : mode === 'insert' ? 'Insert' : 'Update'}: {`);
        for (const c of cols) {
          if (mode !== 'row' && c.is_generated === 'ALWAYS') continue;
          out.push(field(c, mode));
        }
        out.push('        };');
      }
      out.push(relationshipsFor(rel.name, '        '));
      out.push('      };');
    }
    out.push('    };');

    // Views (read-only; columns reported as nullable, like the Supabase CLI does)
    out.push('    Views: {');
    for (const rel of relRows.rows.filter((r) => r.kind === 'VIEW')) {
      out.push(`      ${key(rel.name)}: {`);
      out.push('        Row: {');
      for (const c of columnsByTable.get(rel.name) ?? []) {
        out.push(`          ${key(c.column_name)}: ${tsType(c.udt_name, enumNames)} | null;`);
      }
      out.push('        };');
      out.push('        Relationships: [];');
      out.push('      };');
    }
    out.push('    };');

    // Functions
    out.push('    Functions: {');
    for (const fn of fnRows.rows) {
      const args = (fn.args ?? '')
        .split(',')
        .filter(Boolean)
        .map((a) => {
          const [name, type, hasDefault] = a.split(':');
          return `${key(name!)}${hasDefault === 'true' ? '?' : ''}: ${tsType(type!, enumNames)}`;
        });
      out.push(`      ${key(fn.name)}: {`);
      out.push(`        Args: ${args.length ? `{ ${args.join('; ')} }` : 'Record<PropertyKey, never>'};`);
      out.push(`        Returns: ${tsType(fn.returns, enumNames)};`);
      out.push('      };');
    }
    out.push('    };');

    // Enums
    out.push('    Enums: {');
    for (const [name, values] of enums) {
      out.push(`      ${key(name)}: ${values.map((v) => JSON.stringify(v)).join(' | ')};`);
    }
    out.push('    };');
    out.push('    CompositeTypes: Record<string, never>;');
    out.push('  };');
    out.push('};');
    out.push('');
    out.push("type PublicSchema = Database['public'];");
    out.push(
      "export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];",
    );
    out.push(
      "export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];",
    );
    out.push(
      "export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];",
    );
    out.push("export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];");
    out.push("export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];");
    out.push('');

    writeFileSync(OUT, out.join('\n'));
    const tables = relRows.rows.filter((r) => r.kind === 'BASE TABLE').length;
    const views = relRows.rows.length - tables;
    console.log(
      `Wrote ${OUT}: ${tables} tables, ${views} views, ${fnRows.rowCount} functions, ${enums.size} enums`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
