import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toCsv } from '@/components/admin/data-table/csv';
import { buildReport, GROUPS, loadReportLines } from '@/lib/admin/reports';
import { withAdmin } from '@/lib/auth/admin';
import { getSettings } from '@/lib/settings';
import { parseWith } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// GET /api/admin/reports?group=day|week|month|category|brand|product&from=&to=&format=json|csv
const schema = z.object({
  group: z.enum(GROUPS).default('day'),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const GET = withAdmin('viewer', async (req, { db }) => {
  const sp = new URL(req.url).searchParams;
  const q = parseWith(schema, Object.fromEntries(sp));
  const to = q.to ? `${q.to}T23:59:59.999Z` : new Date().toISOString();
  const from = q.from ? `${q.from}T00:00:00Z` : new Date(Date.now() - 30 * 86400_000).toISOString();
  const settings = await getSettings(db);
  const rows = buildReport(await loadReportLines(db, from, to), q.group, settings.vatRate);

  if (q.format === 'csv') {
    const csv = toCsv(
      [
        q.group,
        'Orders',
        'Units',
        'Revenue inc VAT',
        'Revenue ex VAT',
        'Cost ex VAT',
        'Gross profit',
        'Margin %',
      ],
      rows.map((r) => [
        r.label,
        r.orders,
        r.units,
        r.revenueIncVat.toFixed(2),
        r.revenueExVat.toFixed(2),
        r.cost.toFixed(2),
        r.profit.toFixed(2),
        r.marginPct.toFixed(2),
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laradirect-sales-by-${q.group}-${from.slice(0, 10)}-to-${to.slice(0, 10)}.csv"`,
      },
    });
  }
  return NextResponse.json({ group: q.group, from, to, rows });
});
