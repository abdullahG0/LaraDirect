// Renders placeholder product images (spec §5.5) to public/products/<sku>-<n>.webp.
// Existing files are kept, so real photos dropped in with matching names win. Use --force to redraw all.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { MockCatalogueItem } from '../src/lib/distributor/mock/catalogue-types';
import { silhouette } from './catalogue/silhouettes';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'products');
const SIZE = 800;
const force = process.argv.includes('--force');

const CATEGORY_TINT: Record<string, [string, string]> = {
  Laptops: ['#EFF4FF', '#DBE6FE'],
  Tablets: ['#ECFDF8', '#CCF5EA'],
  'Desktops & All-in-ones': ['#EEF0FF', '#DCE0FD'],
  'Monitors & Displays': ['#EEF8FF', '#D5EDFD'],
  'Headphones & Audio': ['#F5F0FF', '#E6DBFD'],
  Peripherals: ['#FFF8EB', '#FDEACB'],
  'Networking & Power': ['#EFFBF2', '#D3F3DC'],
  'Software & Accessories': ['#F4F6F9', '#E2E7EE'],
};

const COLOUR_HEX: Record<string, string> = {
  'classic blue': '#1D4ED8',
  blue: '#2563EB',
  'frost blue': '#93C5FD',
  teal: '#0F766E',
  graphite: '#374151',
  charcoal: '#1F2937',
  black: '#111827',
  'midnight black': '#0B1220',
  silver: '#CBD5E1',
  'white smoke': '#E5E7EB',
  'off-white': '#E7E5E4',
  slate: '#475569',
  gold: '#CA8A04',
};

function bodyColour(p: MockCatalogueItem): string {
  const c = p.specs.Colour?.toLowerCase();
  if (c && COLOUR_HEX[c]) return COLOUR_HEX[c];
  if (p.brand === 'Apple') return '#A3AAB5';
  if (p.mock.kind === 'trolley' || p.mock.kind === 'licence') return '#1E3A8A';
  return '#1F2937';
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else line += ' ' + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 2);
}

function svgFor(p: MockCatalogueItem, n: number): string {
  const [t1, t2] = CATEGORY_TINT[p.category] ?? ['#F8FAFC', '#E2E8F0'];
  const body = bodyColour(p);
  const accent = n === 3 ? '#14B8A6' : '#3B82F6';
  // View variations: 1 front, 2 angled, 3 close-up, 4 alternate background.
  const transform =
    n === 2
      ? 'translate(60 20) skewY(-6) scale(0.9)'
      : n === 3
        ? 'translate(-160 -150) scale(1.4)'
        : 'translate(0 0)';
  const bg =
    n === 4
      ? `<rect width="${SIZE}" height="${SIZE}" fill="${t2}"/>`
      : `<rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>`;
  const model = p.name.replace(new RegExp(`^${p.brand}\\s+`), '');
  const lines = wrap(model, 38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${t1}"/></linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0B1F3A" flood-opacity="0.18"/></filter>
  </defs>
  ${bg}
  <g filter="url(#s)" transform="${transform}">${silhouette(p.mock.kind, body, accent)}</g>
  <text x="48" y="78" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#0B1F3A">${esc(p.brand)}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="48" y="${690 + i * 34}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="26" fill="#475569">${esc(l)}</text>`,
    )
    .join('')}
  <text x="752" y="78" text-anchor="end" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="18" fill="#94A3B8">Demo image</text>
</svg>`;
}

async function main() {
  const catalogue = JSON.parse(
    readFileSync(path.join(ROOT, 'data', 'mock-catalogue.json'), 'utf8'),
  ) as MockCatalogueItem[];
  if (!catalogue.length) throw new Error('Catalogue is empty: run npm run gen:catalogue first');
  mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  for (const p of catalogue) {
    for (const [i, rel] of p.images.entries()) {
      const file = path.join(ROOT, 'public', rel);
      if (!force && existsSync(file)) {
        skipped++;
        continue;
      }
      await sharp(Buffer.from(svgFor(p, i + 1)))
        .webp({ quality: 82 })
        .toFile(file);
      written++;
    }
  }
  console.log(`Images: ${written} written, ${skipped} kept (already present) in public/products/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
