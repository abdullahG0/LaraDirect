// Storefront category tree and filter facets. Safe to import from client components.
// `name` values match products.category / products.subcategory exactly.

export interface Subcategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string; // database value
  label: string; // short label for navigation
  blurb: string;
  subcategories: Subcategory[];
  facets: FacetDef[];
}

/** A category-specific filter built from product specs. `bucket` returns null to leave a product out. */
export interface FacetDef {
  key: string; // URL param
  label: string;
  bucket: (specs: Record<string, string>) => string | null;
  order?: 'numeric' | 'alpha';
}

const sub = (name: string, slug?: string): Subcategory => ({
  name,
  slug:
    slug ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
});

// ── Spec normalisers ─────────────────────────────────────────────────────────

const inches = (v?: string) => {
  const m = v?.match(/^([\d.]+)"/);
  return m ? `${m[1]}"` : null;
};
const capacity = (v?: string) => v?.match(/^(\d+ (?:GB|TB))/)?.[1] ?? null;
const processorFamily = (v?: string) => {
  if (!v) return null;
  const core = v.match(/Intel Core (i\d)/);
  if (core) return `Intel Core ${core[1]}`;
  if (/Intel N\d/.test(v)) return 'Intel N-series';
  const ryzen = v.match(/AMD Ryzen (\d)/);
  if (ryzen) return `AMD Ryzen ${ryzen[1]}`;
  const apple = v.match(/Apple (M\d)/);
  if (apple) return `Apple ${apple[1]}`;
  if (/MediaTek/.test(v)) return 'MediaTek';
  return null;
};

const screenSize: FacetDef = {
  key: 'screen',
  label: 'Screen size',
  bucket: (s) => inches(s.Screen),
  order: 'numeric',
};
const ram: FacetDef = { key: 'ram', label: 'Memory (RAM)', bucket: (s) => s.RAM ?? null, order: 'numeric' };
const storage: FacetDef = {
  key: 'storage',
  label: 'Storage',
  bucket: (s) => capacity(s.Storage),
  order: 'numeric',
};
const processor: FacetDef = { key: 'cpu', label: 'Processor', bucket: (s) => processorFamily(s.Processor) };

// ── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  {
    slug: 'laptops',
    name: 'Laptops',
    label: 'Laptops',
    blurb: 'Chromebooks, Windows laptops and MacBooks for lessons, marking and home.',
    subcategories: [
      sub('Chromebooks'),
      sub('Windows laptops'),
      sub('MacBooks'),
      sub('Rugged/education', 'rugged'),
    ],
    facets: [
      screenSize,
      ram,
      storage,
      { key: 'os', label: 'Operating system', bucket: (s) => s.OS ?? null },
      processor,
    ],
  },
  {
    slug: 'tablets',
    name: 'Tablets',
    label: 'iPads & Tablets',
    blurb: 'iPads and Android tablets, plus the cases and keyboards to protect them.',
    subcategories: [
      sub('iPads'),
      sub('Android tablets'),
      sub('Tablet cases and keyboards', 'cases-keyboards'),
    ],
    facets: [
      screenSize,
      { key: 'storage', label: 'Storage', bucket: (s) => capacity(s.Storage), order: 'numeric' },
      {
        key: 'conn',
        label: 'Connectivity',
        bucket: (s) =>
          s.Connectivity ? (/Cellular|5G/.test(s.Connectivity) ? 'Wi-Fi + Cellular' : 'Wi-Fi only') : null,
      },
    ],
  },
  {
    slug: 'desktops',
    name: 'Desktops & All-in-ones',
    label: 'Desktops',
    blurb: 'Mini PCs, towers and all-in-ones for staff rooms, offices and IT suites.',
    subcategories: [sub('Mini PCs'), sub('Tower PCs'), sub('All-in-ones'), sub('iMac')],
    facets: [processor, ram],
  },
  {
    slug: 'monitors',
    name: 'Monitors & Displays',
    label: 'Monitors',
    blurb: 'Desk monitors, portable screens and interactive classroom displays.',
    subcategories: [sub('Monitors'), sub('Portable monitors'), sub('Interactive displays')],
    facets: [
      { key: 'size', label: 'Screen size', bucket: (s) => inches(s.Size), order: 'numeric' },
      {
        key: 'res',
        label: 'Resolution',
        bucket: (s) => s.Resolution?.match(/^(Full HD|QHD|WQHD|4K UHD)/)?.[1] ?? null,
      },
      {
        key: 'touch',
        label: 'Touchscreen',
        bucket: (s) => (s.Touch && s.Touch !== 'Non-touch' ? 'Touchscreen' : null),
      },
    ],
  },
  {
    slug: 'audio',
    name: 'Headphones & Audio',
    label: 'Audio',
    blurb: 'Classroom headsets with boom mics, wireless headphones, speakers and conference mics.',
    subcategories: [
      sub('Classroom headsets'),
      sub('Wireless headphones'),
      sub('Earbuds'),
      sub('Speakers'),
      sub('Conference mics'),
    ],
    facets: [
      {
        key: 'wireless',
        label: 'Wired or wireless',
        bucket: (s) => (s.Wireless ? (s.Wireless.startsWith('Yes') ? 'Wireless' : 'Wired') : null),
      },
      {
        key: 'conn',
        label: 'Connection',
        bucket: (s) => {
          const c = s.Connection;
          if (!c) return null;
          if (/USB/.test(c) && /Bluetooth/.test(c)) return 'USB + Bluetooth';
          if (/Bluetooth/.test(c)) return 'Bluetooth';
          if (/USB-C/.test(c)) return 'USB-C';
          if (/USB-A/.test(c)) return 'USB-A';
          if (/3\.5/.test(c)) return '3.5 mm jack';
          return null;
        },
      },
      { key: 'mic', label: 'Microphone', bucket: (s) => (s.Microphone ? 'With microphone' : null) },
      {
        key: 'fit',
        label: 'Fit',
        bucket: (s) => s.Type?.match(/^(Over-ear|On-ear|In-ear)/)?.[1] ?? null,
      },
    ],
  },
  {
    slug: 'peripherals',
    name: 'Peripherals',
    label: 'Peripherals',
    blurb: 'Keyboards, mice, webcams, document cameras and presenters.',
    subcategories: [
      sub('Keyboards'),
      sub('Mice'),
      sub('Webcams'),
      sub('Document cameras'),
      sub('Presenters'),
    ],
    facets: [
      {
        key: 'conn',
        label: 'Connection',
        bucket: (s) => {
          const c = s.Connection;
          if (!c) return null;
          return /Bluetooth|receiver|Wireless|2\.4|Bolt/i.test(c) ? 'Wireless' : 'Wired';
        },
      },
    ],
  },
  {
    slug: 'networking-power',
    name: 'Networking & Power',
    label: 'Networking & Power',
    blurb: 'Docks, hubs, chargers, cables, Wi-Fi and charging trolleys.',
    subcategories: [
      sub('Docks'),
      sub('Hubs'),
      sub('Chargers'),
      sub('Cables'),
      sub('Wi-Fi'),
      sub('Charging trolleys'),
    ],
    facets: [],
  },
  {
    slug: 'accessories',
    name: 'Software & Accessories',
    label: 'Accessories',
    blurb: 'Bags and sleeves, stands, screen protectors and software licences.',
    subcategories: [
      sub('Bags and sleeves', 'bags-sleeves'),
      sub('Stands'),
      sub('Screen protectors'),
      sub('Licences'),
    ],
    facets: [],
  },
];

export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const categoryByName = (name: string) => CATEGORIES.find((c) => c.name === name);

export function subcategoryBySlug(category: Category, slug: string) {
  return category.subcategories.find((s) => s.slug === slug);
}

export function categoryHref(categoryName: string, subName?: string | null) {
  const cat = categoryByName(categoryName);
  if (!cat) return '/shop';
  const s = subName ? cat.subcategories.find((x) => x.name === subName) : undefined;
  return s ? `/c/${cat.slug}/${s.slug}` : `/c/${cat.slug}`;
}
