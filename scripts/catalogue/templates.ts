// Product templates for the mock catalogue (spec §5). Model names are plausible demo names, not real SKUs.
// Each template expands into `count` variants from the cartesian product of its axes.

export type Kind =
  | 'laptop' | 'tablet' | 'case' | 'pencil' | 'minipc' | 'tower' | 'aio' | 'monitor' | 'display'
  | 'headset' | 'headphones' | 'earbuds' | 'speaker' | 'speakerphone' | 'keyboard' | 'mouse' | 'webcam'
  | 'doccam' | 'presenter' | 'dock' | 'hub' | 'charger' | 'cable' | 'wifi' | 'trolley' | 'bag' | 'stand'
  | 'protector' | 'licence';

export interface Axis {
  key: string; // spec key this axis sets
  inName?: boolean; // append the option label to the product name
  options: Array<[label: string, costAdd: number]>;
}

export interface Template {
  category: string;
  subcategory: string;
  brand: string;
  series: string;
  kind: Kind;
  count: number;
  baseCost: number; // GBP ex VAT
  specs: Record<string, string>;
  axes?: Axis[];
  weightKg: number;
  warrantyMonths: number;
  tags: string[];
  bundleFor?: string; // marks the first variant as a "frequently bought together" accessory
}

const ax = (key: string, options: Axis['options'], inName = true): Axis => ({ key, options, inName });

const RAM_4_8 = ax('RAM', [['4 GB', 0], ['8 GB', 35]]);
const COLOUR = (a: string, b: string) => ax('Colour', [[a, 0], [b, 0]]);
const USB_AC = (add: number) => ax('Connection', [['USB-A', 0], ['USB-C', add]]);
const WIFI_CELL = (add: number) => ax('Connectivity', [['Wi-Fi', 0], ['Wi-Fi + Cellular', add]]);

const W11E = 'Windows 11 Pro Education';

export const TEMPLATES: Template[] = [
  // ─────────────── Laptops (40) ───────────────
  // Chromebooks (14)
  {
    category: 'Laptops', subcategory: 'Chromebooks', brand: 'Lenovo', series: 'EduBook Chromebook 11e Gen 4', kind: 'laptop',
    count: 4, baseCost: 165, weightKg: 1.25, warrantyMonths: 24, tags: ['education', 'chromebook'],
    specs: { Processor: 'MediaTek Kompanio 520', Screen: '11.6" HD anti-glare', OS: 'ChromeOS', Battery: 'Up to 12 hours', Ports: 'USB-C ×2, USB-A ×2, microSD, 3.5 mm audio', Weight: '1.25 kg' },
    axes: [RAM_4_8, ax('Storage', [['32 GB eMMC', 0], ['64 GB eMMC', 22]])],
  },
  {
    category: 'Laptops', subcategory: 'Chromebooks', brand: 'Acer', series: 'Chromebook Classroom 311', kind: 'laptop',
    count: 4, baseCost: 150, weightKg: 1.3, warrantyMonths: 12, tags: ['education', 'chromebook'],
    specs: { Processor: 'Intel N100', Storage: '64 GB eMMC', OS: 'ChromeOS', Battery: 'Up to 10 hours', Ports: 'USB-C ×2, USB-A ×2, HDMI', Weight: '1.3 kg' },
    axes: [ax('Screen', [['11.6" HD', 0], ['11.6" HD touch', 28]]), RAM_4_8],
  },
  {
    category: 'Laptops', subcategory: 'Chromebooks', brand: 'HP', series: 'Chromebook Campus 14 G2', kind: 'laptop',
    count: 3, baseCost: 235, weightKg: 1.45, warrantyMonths: 12, tags: ['education', 'chromebook'],
    specs: { Processor: 'Intel N200', Screen: '14" Full HD IPS', OS: 'ChromeOS', Battery: 'Up to 11 hours', Ports: 'USB-C ×2, USB-A, microSD, 3.5 mm audio', Weight: '1.45 kg' },
    axes: [ax('RAM', [['4 GB', 0], ['8 GB', 40]]), ax('Storage', [['64 GB eMMC', 0], ['128 GB eMMC', 30]])],
  },
  {
    category: 'Laptops', subcategory: 'Chromebooks', brand: 'ASUS', series: 'Chromebook Flip CR1 Edu', kind: 'laptop',
    count: 3, baseCost: 210, weightKg: 1.35, warrantyMonths: 24, tags: ['education', 'chromebook', '2-in-1'],
    specs: { Processor: 'Intel N100', RAM: '8 GB', Screen: '11.6" HD touch, 360° hinge', OS: 'ChromeOS', Battery: 'Up to 11 hours', Ports: 'USB-C ×2, USB-A ×2, microSD', Weight: '1.35 kg' },
    axes: [ax('Storage', [['32 GB eMMC', 0], ['64 GB eMMC', 20]]), ax('Stylus', [['No stylus', 0], ['Garaged stylus', 35]])],
  },
  // Windows laptops (14)
  {
    category: 'Laptops', subcategory: 'Windows laptops', brand: 'Dell', series: 'Latitude 3450 Edu', kind: 'laptop',
    count: 4, baseCost: 520, weightKg: 1.52, warrantyMonths: 36, tags: ['education', 'business'],
    specs: { Storage: '256 GB SSD', Screen: '14" Full HD IPS', OS: W11E, Battery: 'Up to 9 hours', Ports: 'USB-C (Thunderbolt), USB-A ×2, HDMI, RJ45', Weight: '1.52 kg' },
    axes: [ax('Processor', [['Intel Core i5-1335U', 0], ['Intel Core i7-1355U', 170]]), ax('RAM', [['8 GB', 0], ['16 GB', 75]])],
  },
  {
    category: 'Laptops', subcategory: 'Windows laptops', brand: 'HP', series: 'ProBook 450 G-Edu 15.6"', kind: 'laptop',
    count: 4, baseCost: 560, weightKg: 1.74, warrantyMonths: 12, tags: ['business'],
    specs: { RAM: '16 GB', Screen: '15.6" Full HD IPS', OS: W11E, Battery: 'Up to 10 hours', Ports: 'USB-C ×2, USB-A ×2, HDMI, RJ45', Weight: '1.74 kg' },
    axes: [ax('Processor', [['Intel Core i5-1335U', 0], ['Intel Core i7-1355U', 190]]), ax('Storage', [['256 GB SSD', 0], ['512 GB SSD', 50]])],
  },
  {
    category: 'Laptops', subcategory: 'Windows laptops', brand: 'Lenovo', series: 'ThinkPad E14 Gen 6 Edu', kind: 'laptop',
    count: 3, baseCost: 610, weightKg: 1.44, warrantyMonths: 12, tags: ['business', 'education'],
    specs: { Storage: '512 GB SSD', Screen: '14" WUXGA IPS', OS: W11E, Battery: 'Up to 11 hours', Ports: 'USB-C ×2, USB-A ×2, HDMI, RJ45', Weight: '1.44 kg' },
    axes: [ax('Processor', [['AMD Ryzen 5 7535HS', 0], ['AMD Ryzen 7 7735HS', 150]]), ax('RAM', [['16 GB', 0], ['32 GB', 110]])],
  },
  {
    category: 'Laptops', subcategory: 'Windows laptops', brand: 'Microsoft', series: 'Surface Laptop Go Edu 12.4"', kind: 'laptop',
    count: 3, baseCost: 520, weightKg: 1.13, warrantyMonths: 12, tags: ['education', 'lightweight'],
    specs: { Processor: 'Intel Core i5-1235U', Screen: '12.4" PixelSense touch', OS: W11E, Battery: 'Up to 15 hours', Ports: 'USB-C, USB-A, Surface Connect, 3.5 mm audio', Weight: '1.13 kg' },
    axes: [ax('RAM', [['8 GB', 0], ['16 GB', 110]]), ax('Storage', [['128 GB SSD', 0], ['256 GB SSD', 60]])],
  },
  // MacBooks (6)
  {
    category: 'Laptops', subcategory: 'MacBooks', brand: 'Apple', series: 'MacBook Air 13" (M3)', kind: 'laptop',
    count: 3, baseCost: 880, weightKg: 1.24, warrantyMonths: 12, tags: ['macbook', 'lightweight'],
    specs: { Processor: 'Apple M3, 8-core CPU', Screen: '13.6" Liquid Retina', OS: 'macOS', Battery: 'Up to 18 hours', Ports: 'Thunderbolt ×2, MagSafe 3, 3.5 mm audio', Weight: '1.24 kg' },
    axes: [ax('RAM', [['16 GB', 0], ['24 GB', 180]]), ax('Storage', [['256 GB SSD', 0], ['512 GB SSD', 180]])],
  },
  {
    category: 'Laptops', subcategory: 'MacBooks', brand: 'Apple', series: 'MacBook Pro 14" (M4)', kind: 'laptop',
    count: 3, baseCost: 1360, weightKg: 1.55, warrantyMonths: 12, tags: ['macbook', 'creative'],
    specs: { Processor: 'Apple M4, 10-core CPU', Screen: '14.2" Liquid Retina XDR', OS: 'macOS', Battery: 'Up to 22 hours', Ports: 'Thunderbolt 4 ×3, HDMI, SDXC, MagSafe 3', Weight: '1.55 kg' },
    axes: [ax('RAM', [['16 GB', 0], ['24 GB', 180]]), ax('Storage', [['512 GB SSD', 0], ['1 TB SSD', 360]])],
  },
  // Rugged / education (6)
  {
    category: 'Laptops', subcategory: 'Rugged/education', brand: 'Acer', series: 'TravelMate B3 Spin Rugged', kind: 'laptop',
    count: 3, baseCost: 345, weightKg: 1.4, warrantyMonths: 36, tags: ['education', 'rugged', '2-in-1'],
    specs: { Processor: 'Intel N100', Screen: '11.6" HD touch, 360° hinge', OS: W11E, Battery: 'Up to 12 hours', Ports: 'USB-C, USB-A ×2, HDMI, microSD', Weight: '1.4 kg', Durability: 'MIL-STD 810H, spill-resistant keyboard' },
    axes: [RAM_4_8, ax('Storage', [['64 GB eMMC', 0], ['128 GB SSD', 35]])],
  },
  {
    category: 'Laptops', subcategory: 'Rugged/education', brand: 'Lenovo', series: 'ThinkPad 11e Yoga Rugged Gen 7', kind: 'laptop',
    count: 3, baseCost: 395, weightKg: 1.48, warrantyMonths: 36, tags: ['education', 'rugged', '2-in-1'],
    specs: { Processor: 'Intel N200', Screen: '11.6" HD touch, 360° hinge', OS: W11E, Battery: 'Up to 12 hours', Ports: 'USB-C ×2, USB-A ×2, HDMI', Weight: '1.48 kg', Durability: 'Rubber bumpers, drop-tested to 75 cm' },
    axes: [ax('RAM', [['8 GB', 0], ['16 GB', 60]]), ax('Storage', [['128 GB SSD', 0], ['256 GB SSD', 35]])],
  },

  // ─────────────── Tablets (30) ───────────────
  // iPads (10)
  {
    category: 'Tablets', subcategory: 'iPads', brand: 'Apple', series: 'iPad 11" (A16)', kind: 'tablet',
    count: 4, baseCost: 295, weightKg: 0.48, warrantyMonths: 12, tags: ['education', 'ipad'],
    specs: { Processor: 'Apple A16', Screen: '11" Liquid Retina', OS: 'iPadOS', Battery: 'Up to 10 hours', Ports: 'USB-C', Weight: '477 g' },
    axes: [ax('Storage', [['128 GB', 0], ['256 GB', 85]]), WIFI_CELL(115)],
  },
  {
    category: 'Tablets', subcategory: 'iPads', brand: 'Apple', series: 'iPad Air 11" (M3)', kind: 'tablet',
    count: 3, baseCost: 485, weightKg: 0.46, warrantyMonths: 12, tags: ['ipad', 'creative'],
    specs: { Processor: 'Apple M3', Screen: '11" Liquid Retina', OS: 'iPadOS', Battery: 'Up to 10 hours', Ports: 'USB-C', Weight: '460 g' },
    axes: [ax('Storage', [['128 GB', 0], ['256 GB', 85]]), WIFI_CELL(115)],
  },
  {
    category: 'Tablets', subcategory: 'iPads', brand: 'Apple', series: 'iPad Pro 11" (M4)', kind: 'tablet',
    count: 3, baseCost: 810, weightKg: 0.44, warrantyMonths: 12, tags: ['ipad', 'creative'],
    specs: { Processor: 'Apple M4', Screen: '11" Ultra Retina XDR', OS: 'iPadOS', Battery: 'Up to 10 hours', Ports: 'USB-C (Thunderbolt)', Weight: '444 g' },
    axes: [ax('Storage', [['256 GB', 0], ['512 GB', 170]]), WIFI_CELL(170)],
  },
  // Android tablets (10)
  {
    category: 'Tablets', subcategory: 'Android tablets', brand: 'Samsung', series: 'Galaxy Tab A9+ Edu', kind: 'tablet',
    count: 4, baseCost: 150, weightKg: 0.49, warrantyMonths: 24, tags: ['education', 'android'],
    specs: { Processor: 'Snapdragon 695', Screen: '11" 90 Hz LCD', OS: 'Android 14', Battery: 'Up to 13 hours', Ports: 'USB-C, microSD', Weight: '480 g' },
    axes: [ax('Storage', [['64 GB', 0], ['128 GB', 30]]), ax('Connectivity', [['Wi-Fi', 0], ['Wi-Fi + 5G', 60]])],
  },
  {
    category: 'Tablets', subcategory: 'Android tablets', brand: 'Lenovo', series: 'Tab M11 Classroom', kind: 'tablet',
    count: 3, baseCost: 140, weightKg: 0.47, warrantyMonths: 12, tags: ['education', 'android'],
    specs: { Processor: 'MediaTek Helio G88', Screen: '11" WUXGA', OS: 'Android 14', Connectivity: 'Wi-Fi', Battery: 'Up to 10 hours', Ports: 'USB-C, microSD, 3.5 mm audio', Weight: '465 g' },
    axes: [ax('Storage', [['64 GB', 0], ['128 GB', 25]]), ax('Pen', [['No pen', 0], ['With Tab Pen', 20]])],
  },
  {
    category: 'Tablets', subcategory: 'Android tablets', brand: 'Samsung', series: 'Galaxy Tab S9 FE', kind: 'tablet',
    count: 3, baseCost: 330, weightKg: 0.52, warrantyMonths: 24, tags: ['android', 'creative'],
    specs: { Processor: 'Exynos 1380', Screen: '10.9" 90 Hz', OS: 'Android 14', Battery: 'Up to 18 hours', Ports: 'USB-C, microSD', Weight: '523 g', Pen: 'S Pen included' },
    axes: [ax('Storage', [['128 GB', 0], ['256 GB', 50]]), ax('Connectivity', [['Wi-Fi', 0], ['Wi-Fi + 5G', 70]])],
  },
  // Tablet cases and keyboards (10)
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Logitech', series: 'Rugged Combo Keyboard Case for iPad 11"', kind: 'case',
    count: 2, baseCost: 58, weightKg: 0.68, warrantyMonths: 12, tags: ['education', 'ipad-accessory', 'rugged'],
    specs: { Compatibility: 'iPad 11" (A16), iPad 10th gen', Layout: 'UK QWERTY', Connection: 'Smart Connector', Protection: 'Drop-tested to 1.2 m' },
    axes: [COLOUR('Classic Blue', 'Graphite')],
  },
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Targus', series: 'SafePort Rugged Case', kind: 'case',
    count: 3, baseCost: 18, weightKg: 0.3, warrantyMonths: 24, tags: ['education', 'rugged'],
    specs: { Material: 'Shock-absorbing TPU', Protection: 'Drop-tested to 1.2 m', Stand: 'Built-in kickstand' },
    axes: [ax('Compatibility', [['for iPad 11"', 0], ['for iPad Air 11"', 4], ['for Galaxy Tab A9+', 0]])],
  },
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Belkin', series: 'Classroom Keyboard Case for iPad 11"', kind: 'case',
    count: 2, baseCost: 45, weightKg: 0.6, warrantyMonths: 24, tags: ['education', 'ipad-accessory'],
    specs: { Compatibility: 'iPad 11" (A16)', Connection: 'Bluetooth 5.0', Battery: 'Up to 6 months' },
    axes: [ax('Layout', [['UK', 0], ['UK with trackpad', 15]])],
  },
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Logitech', series: 'Crayon Digital Pencil (USB-C)', kind: 'pencil',
    count: 1, baseCost: 45, weightKg: 0.02, warrantyMonths: 12, tags: ['education', 'ipad-accessory'],
    specs: { Compatibility: 'iPad models from 2018 onward', Charging: 'USB-C', Battery: 'Up to 7.5 hours' },
  },
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Apple', series: 'Pencil (USB-C)', kind: 'pencil',
    count: 1, baseCost: 62, weightKg: 0.02, warrantyMonths: 12, tags: ['ipad-accessory'],
    specs: { Compatibility: 'iPad models with USB-C', Charging: 'USB-C', Pairing: 'Magnetic attach' },
  },
  {
    category: 'Tablets', subcategory: 'Tablet cases and keyboards', brand: 'Samsung', series: 'Book Cover Keyboard for Tab S9 FE', kind: 'case',
    count: 1, baseCost: 70, weightKg: 0.45, warrantyMonths: 12, tags: ['android'],
    specs: { Compatibility: 'Galaxy Tab S9 FE', Layout: 'UK QWERTY', Connection: 'POGO pin' },
  },

  // ─────────────── Desktops & All-in-ones (20) ───────────────
  {
    category: 'Desktops & All-in-ones', subcategory: 'Mini PCs', brand: 'Lenovo', series: 'ThinkCentre M70q Tiny Gen 5', kind: 'minipc',
    count: 3, baseCost: 420, weightKg: 1.3, warrantyMonths: 36, tags: ['business', 'education'],
    specs: { RAM: '8 GB', Storage: '256 GB SSD', OS: W11E, Ports: 'USB-C, USB-A ×5, DisplayPort ×2, HDMI, RJ45', 'Form factor': '1 litre tiny' },
    axes: [ax('Processor', [['Intel Core i3-14100T', 0], ['Intel Core i5-14400T', 110], ['Intel Core i7-14700T', 230]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'Mini PCs', brand: 'HP', series: 'Pro Mini 400 G9', kind: 'minipc',
    count: 3, baseCost: 380, weightKg: 1.25, warrantyMonths: 36, tags: ['business'],
    specs: { Storage: '256 GB SSD', OS: W11E, Ports: 'USB-C, USB-A ×5, DisplayPort ×2, RJ45', 'Form factor': 'Mini' },
    axes: [ax('Processor', [['Intel Core i3-13100T', 0], ['Intel Core i5-13500T', 100]]), ax('RAM', [['8 GB', 0], ['16 GB', 45]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'Tower PCs', brand: 'Dell', series: 'OptiPlex Tower 7020', kind: 'tower',
    count: 3, baseCost: 480, weightKg: 5.2, warrantyMonths: 36, tags: ['business', 'education'],
    specs: { RAM: '16 GB', OS: W11E, Ports: 'USB-C, USB-A ×8, DisplayPort ×2, HDMI, RJ45', 'Form factor': 'Tower' },
    axes: [ax('Processor', [['Intel Core i5-14500', 0], ['Intel Core i7-14700', 190]]), ax('Storage', [['256 GB SSD', 0], ['512 GB SSD', 45]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'Tower PCs', brand: 'Acer', series: 'Veriton S2690G', kind: 'tower',
    count: 2, baseCost: 400, weightKg: 4.8, warrantyMonths: 36, tags: ['business'],
    specs: { RAM: '8 GB', Storage: '256 GB SSD', OS: W11E, Ports: 'USB-A ×8, HDMI, VGA, RJ45', 'Form factor': 'Small form factor' },
    axes: [ax('Processor', [['Intel Core i3-12100', 0], ['Intel Core i5-12400', 110]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'All-in-ones', brand: 'HP', series: 'ProOne 440 G9 AiO 23.8"', kind: 'aio',
    count: 3, baseCost: 620, weightKg: 7.4, warrantyMonths: 36, tags: ['business', 'education'],
    specs: { RAM: '16 GB', Storage: '512 GB SSD', Screen: '23.8" Full HD IPS', OS: W11E, Ports: 'USB-C, USB-A ×4, HDMI out, RJ45' },
    axes: [ax('Processor', [['Intel Core i5-13500T', 0], ['Intel Core i7-13700T', 170]]), ax('Touch', [['Non-touch', 0], ['Touch', 70]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'All-in-ones', brand: 'Lenovo', series: 'ThinkCentre neo 50a 24 Gen 5', kind: 'aio',
    count: 3, baseCost: 580, weightKg: 6.9, warrantyMonths: 12, tags: ['education'],
    specs: { RAM: '8 GB', Storage: '512 GB SSD', Screen: '23.8" Full HD IPS', OS: W11E, Ports: 'USB-C, USB-A ×4, HDMI out' },
    axes: [ax('Processor', [['Intel Core i3-1315U', 0], ['Intel Core i5-13420H', 90], ['Intel Core i7-13620H', 220]])],
  },
  {
    category: 'Desktops & All-in-ones', subcategory: 'iMac', brand: 'Apple', series: 'iMac 24" (M4)', kind: 'aio',
    count: 3, baseCost: 1150, weightKg: 4.4, warrantyMonths: 12, tags: ['creative'],
    specs: { Processor: 'Apple M4, 8-core CPU', RAM: '16 GB', Screen: '24" 4.5K Retina', OS: 'macOS', Ports: 'Thunderbolt ×2–4' },
    axes: [ax('Configuration', [['8-core GPU, 256 GB', 0], ['10-core GPU, 256 GB', 180], ['10-core GPU, 512 GB', 360]])],
  },

  // ─────────────── Monitors & Displays (20) ───────────────
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'Dell', series: 'P2425H 24"', kind: 'monitor',
    count: 2, baseCost: 135, weightKg: 4.9, warrantyMonths: 36, tags: ['business', 'education'],
    specs: { Size: '24"', Resolution: 'Full HD 1920×1080', Panel: 'IPS', 'Refresh rate': '100 Hz', Stand: 'Height, tilt, swivel, pivot' },
    axes: [ax('Connectivity', [['HDMI, DisplayPort', 0], ['USB-C 15 W hub', 45]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'AOC', series: '24B2XH 24"', kind: 'monitor',
    count: 2, baseCost: 95, weightKg: 3.1, warrantyMonths: 36, tags: ['education', 'budget'],
    specs: { Size: '24"', Resolution: 'Full HD 1920×1080', Panel: 'IPS', 'Refresh rate': '75 Hz', Connectivity: 'HDMI, VGA', Stand: 'Tilt' },
    axes: [ax('Speakers', [['No speakers', 0], ['Built-in speakers', 10]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'Philips', series: '27E1N 27"', kind: 'monitor',
    count: 3, baseCost: 150, weightKg: 5.2, warrantyMonths: 36, tags: ['business'],
    specs: { Size: '27"', Panel: 'IPS', 'Refresh rate': '75 Hz', Connectivity: 'HDMI, DisplayPort, USB-C', Stand: 'Height, tilt' },
    axes: [ax('Resolution', [['Full HD 1920×1080', 0], ['QHD 2560×1440', 55], ['4K UHD 3840×2160', 130]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'Samsung', series: 'ViewFinity S6 27"', kind: 'monitor',
    count: 2, baseCost: 210, weightKg: 5.6, warrantyMonths: 36, tags: ['creative'],
    specs: { Size: '27"', Resolution: 'QHD 2560×1440', Panel: 'IPS', 'Refresh rate': '100 Hz', Stand: 'Height, tilt, swivel' },
    axes: [ax('Connectivity', [['HDMI, DisplayPort', 0], ['USB-C 90 W', 60]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'Lenovo', series: 'ThinkVision T34w-30 34"', kind: 'monitor',
    count: 2, baseCost: 340, weightKg: 8.9, warrantyMonths: 36, tags: ['business', 'ultrawide'],
    specs: { Size: '34" curved', Resolution: 'WQHD 3440×1440', Panel: 'VA', 'Refresh rate': '60 Hz', Stand: 'Height, tilt, swivel' },
    axes: [ax('Connectivity', [['HDMI, DisplayPort', 0], ['USB-C dock with RJ45', 75]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Monitors', brand: 'HP', series: 'Series 5 Pro 527pq 27"', kind: 'monitor',
    count: 2, baseCost: 190, weightKg: 5.4, warrantyMonths: 36, tags: ['business'],
    specs: { Size: '27"', Resolution: 'QHD 2560×1440', Panel: 'IPS', 'Refresh rate': '100 Hz', Stand: 'Height, tilt, swivel, pivot' },
    axes: [ax('Connectivity', [['HDMI, DisplayPort', 0], ['USB-C 65 W', 50]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Portable monitors', brand: 'ASUS', series: 'ZenScreen MB16 Portable 15.6"', kind: 'monitor',
    count: 2, baseCost: 140, weightKg: 0.71, warrantyMonths: 36, tags: ['portable'],
    specs: { Size: '15.6"', Resolution: 'Full HD 1920×1080', Panel: 'IPS', Connectivity: 'USB-C, mini HDMI', Stand: 'Foldable smart case' },
    axes: [ax('Touch', [['Non-touch', 0], ['Touch', 40]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Portable monitors', brand: 'Lenovo', series: 'ThinkVision M14 Portable 14"', kind: 'monitor',
    count: 1, baseCost: 190, weightKg: 0.6, warrantyMonths: 36, tags: ['portable', 'business'],
    specs: { Size: '14"', Resolution: 'Full HD 1920×1080', Panel: 'IPS', Connectivity: 'USB-C ×2 (pass-through charging)', Stand: 'Integrated kickstand' },
  },
  {
    category: 'Monitors & Displays', subcategory: 'Interactive displays', brand: 'Samsung', series: 'Flip Pro Interactive Display', kind: 'display',
    count: 2, baseCost: 1850, weightKg: 32, warrantyMonths: 36, tags: ['education', 'interactive'],
    specs: { Resolution: '4K UHD', Touch: '20-point multi-touch', Connectivity: 'HDMI, USB-C, Wi-Fi screen share', Mounting: 'Wall mount or optional stand' },
    axes: [ax('Size', [['55"', 0], ['65"', 650]])],
  },
  {
    category: 'Monitors & Displays', subcategory: 'Interactive displays', brand: 'Philips', series: 'Classroom Interactive Display 4K', kind: 'display',
    count: 2, baseCost: 1450, weightKg: 41, warrantyMonths: 36, tags: ['education', 'interactive'],
    specs: { Resolution: '4K UHD', Touch: '40-point infrared touch', Connectivity: 'HDMI ×3, USB-C, RJ45', OS: 'Android 13 built in' },
    axes: [ax('Size', [['65"', 0], ['75"', 700]])],
  },

  // ─────────────── Headphones & Audio (30) ───────────────
  // Classroom headsets (10)
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Logitech', series: 'H390 USB Classroom Headset', kind: 'headset',
    count: 1, baseCost: 18, weightKg: 0.2, warrantyMonths: 24, tags: ['education', 'usb-headset'],
    specs: { Type: 'Over-ear, stereo', Connection: 'USB-A', Wireless: 'No', Microphone: 'Noise-cancelling boom mic', Controls: 'Inline volume and mute' },
  },
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Jabra', series: 'Evolve2 30 SE', kind: 'headset',
    count: 2, baseCost: 45, weightKg: 0.13, warrantyMonths: 24, tags: ['usb-headset', 'business'],
    specs: { Type: 'On-ear, stereo', Wireless: 'No', Microphone: '2-mic call technology', Certification: 'Teams and Zoom certified' },
    axes: [USB_AC(4)],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Sennheiser', series: 'SC 160 USB Headset', kind: 'headset',
    count: 2, baseCost: 38, weightKg: 0.12, warrantyMonths: 24, tags: ['usb-headset'],
    specs: { Connection: 'USB-A', Wireless: 'No', Microphone: 'Noise-cancelling boom mic', Controls: 'Inline call control' },
    axes: [ax('Type', [['Mono', 0], ['Stereo', 4]])],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Poly', series: 'Blackwire 3320 USB Headset', kind: 'headset',
    count: 2, baseCost: 30, weightKg: 0.1, warrantyMonths: 24, tags: ['usb-headset'],
    specs: { Type: 'On-ear, stereo', Wireless: 'No', Microphone: 'Noise-cancelling boom mic', Controls: 'Inline call control' },
    axes: [USB_AC(3)],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Logitech', series: 'H111 Classroom Headset (3.5 mm)', kind: 'headset',
    count: 1, baseCost: 14, weightKg: 0.1, warrantyMonths: 24, tags: ['education', 'budget'],
    specs: { Type: 'On-ear, stereo', Connection: '3.5 mm jack', Wireless: 'No', Microphone: 'Rotating boom mic' },
  },
  {
    category: 'Headphones & Audio', subcategory: 'Classroom headsets', brand: 'Kensington', series: 'USB Hi-Fi Classroom Headset', kind: 'headset',
    count: 2, baseCost: 20, weightKg: 0.18, warrantyMonths: 24, tags: ['education', 'usb-headset'],
    specs: { Type: 'Over-ear, stereo', Connection: 'USB-A', Wireless: 'No', Cleaning: 'Wipe-clean leatherette cushions' },
    axes: [ax('Microphone', [['Boom mic', 0], ['Boom mic with volume control', 4]])],
  },
  // Wireless headphones (6)
  {
    category: 'Headphones & Audio', subcategory: 'Wireless headphones', brand: 'Sony', series: 'WH-ANC Pro Wireless', kind: 'headphones',
    count: 2, baseCost: 230, weightKg: 0.25, warrantyMonths: 12, tags: ['premium', 'noise-cancelling'],
    specs: { Type: 'Over-ear', Connection: 'Bluetooth 5.3', Wireless: 'Yes', Microphone: 'Beamforming mics', Battery: 'Up to 30 hours' },
    axes: [COLOUR('Black', 'Silver')],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Wireless headphones', brand: 'Bose', series: 'QuietComfort Wireless', kind: 'headphones',
    count: 2, baseCost: 200, weightKg: 0.24, warrantyMonths: 12, tags: ['premium', 'noise-cancelling'],
    specs: { Type: 'Over-ear', Connection: 'Bluetooth 5.3', Wireless: 'Yes', Microphone: 'Built-in mics', Battery: 'Up to 24 hours' },
    axes: [COLOUR('Black', 'White Smoke')],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Wireless headphones', brand: 'Jabra', series: 'Evolve2 65 Flex', kind: 'headphones',
    count: 2, baseCost: 140, weightKg: 0.1, warrantyMonths: 24, tags: ['business', 'noise-cancelling'],
    specs: { Type: 'On-ear, foldable', Wireless: 'Yes, Bluetooth with dongle', Microphone: 'Hidden boom mic', Battery: 'Up to 32 hours' },
    axes: [USB_AC(6)],
  },
  // Earbuds (5)
  {
    category: 'Headphones & Audio', subcategory: 'Earbuds', brand: 'Apple', series: 'AirPods (4th generation)', kind: 'earbuds',
    count: 2, baseCost: 100, weightKg: 0.04, warrantyMonths: 12, tags: ['wireless'],
    specs: { Type: 'In-ear', Connection: 'Bluetooth 5.3', Wireless: 'Yes', Battery: 'Up to 30 hours with case', Charging: 'USB-C' },
    axes: [ax('Noise cancelling', [['Standard', 0], ['Active Noise Cancellation', 40]])],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Earbuds', brand: 'JBL', series: 'Tune Buds Classroom', kind: 'earbuds',
    count: 2, baseCost: 55, weightKg: 0.05, warrantyMonths: 12, tags: ['wireless'],
    specs: { Type: 'In-ear', Connection: 'Bluetooth 5.3', Wireless: 'Yes', Battery: 'Up to 48 hours with case' },
    axes: [COLOUR('Black', 'Blue')],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Earbuds', brand: 'Samsung', series: 'Galaxy Buds FE', kind: 'earbuds',
    count: 1, baseCost: 70, weightKg: 0.05, warrantyMonths: 12, tags: ['wireless'],
    specs: { Type: 'In-ear', Connection: 'Bluetooth 5.2', Wireless: 'Yes', Battery: 'Up to 21 hours with case' },
  },
  // Speakers (5)
  {
    category: 'Headphones & Audio', subcategory: 'Speakers', brand: 'JBL', series: 'Flip Classroom Bluetooth Speaker', kind: 'speaker',
    count: 2, baseCost: 75, weightKg: 0.56, warrantyMonths: 12, tags: ['portable', 'waterproof'],
    specs: { Connection: 'Bluetooth 5.1', Wireless: 'Yes', Battery: 'Up to 12 hours', Protection: 'IP67' },
    axes: [COLOUR('Black', 'Teal')],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Speakers', brand: 'Anker', series: 'Soundcore Motion 300', kind: 'speaker',
    count: 2, baseCost: 55, weightKg: 0.8, warrantyMonths: 18, tags: ['portable'],
    specs: { Connection: 'Bluetooth 5.3', Wireless: 'Yes', Output: '30 W stereo', Battery: 'Up to 13 hours' },
    axes: [COLOUR('Midnight Black', 'Frost Blue')],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Speakers', brand: 'Bose', series: 'SoundLink Flex', kind: 'speaker',
    count: 1, baseCost: 110, weightKg: 0.6, warrantyMonths: 12, tags: ['portable', 'waterproof'],
    specs: { Connection: 'Bluetooth 5.3', Wireless: 'Yes', Battery: 'Up to 12 hours', Protection: 'IP67' },
  },
  // Conference mics (4)
  {
    category: 'Headphones & Audio', subcategory: 'Conference mics', brand: 'Jabra', series: 'Speak2 55 Speakerphone', kind: 'speakerphone',
    count: 2, baseCost: 100, weightKg: 0.3, warrantyMonths: 24, tags: ['business', 'conferencing'],
    specs: { Microphone: '4 beamforming noise-cancelling mics', Battery: 'Up to 12 hours', Certification: 'Teams and Zoom certified' },
    axes: [ax('Connection', [['USB-A, Bluetooth', 0], ['USB-A, Bluetooth with Link 380 dongle', 20]])],
  },
  {
    category: 'Headphones & Audio', subcategory: 'Conference mics', brand: 'Poly', series: 'Sync 20 Speakerphone', kind: 'speakerphone',
    count: 1, baseCost: 105, weightKg: 0.3, warrantyMonths: 24, tags: ['business', 'conferencing'],
    specs: { Connection: 'USB-A, Bluetooth', Microphone: '3 steerable mics', Battery: 'Up to 20 hours' },
  },
  {
    category: 'Headphones & Audio', subcategory: 'Conference mics', brand: 'Anker', series: 'PowerConf S330 Speakerphone', kind: 'speakerphone',
    count: 1, baseCost: 60, weightKg: 0.3, warrantyMonths: 18, tags: ['conferencing', 'budget'],
    specs: { Connection: 'USB-C', Microphone: '4 mics, 360° pickup', Power: 'USB powered' },
  },

  // ─────────────── Peripherals (25) ───────────────
  {
    category: 'Peripherals', subcategory: 'Keyboards', brand: 'Logitech', series: 'MK270 Wireless Keyboard and Mouse', kind: 'keyboard',
    count: 2, baseCost: 18, weightKg: 0.7, warrantyMonths: 36, tags: ['education', 'wireless'],
    specs: { Connection: '2.4 GHz USB receiver', Layout: 'UK QWERTY', Battery: 'Up to 24 months (keyboard)' },
    axes: [COLOUR('Black', 'Off-white')],
  },
  {
    category: 'Peripherals', subcategory: 'Keyboards', brand: 'Microsoft', series: 'Bluetooth Desktop Keyboard', kind: 'keyboard',
    count: 1, baseCost: 30, weightKg: 0.45, warrantyMonths: 12, tags: ['wireless'],
    specs: { Connection: 'Bluetooth 4.0', Layout: 'UK QWERTY', Battery: 'Up to 36 months' },
  },
  {
    category: 'Peripherals', subcategory: 'Keyboards', brand: 'Kensington', series: 'Pro Fit Washable Keyboard', kind: 'keyboard',
    count: 2, baseCost: 22, weightKg: 0.6, warrantyMonths: 36, tags: ['education', 'washable'],
    specs: { Layout: 'UK QWERTY', Cleaning: 'IP68, dishwasher-safe' },
    axes: [ax('Connection', [['Wired USB-A', 0], ['Wireless 2.4 GHz', 8]])],
  },
  {
    category: 'Peripherals', subcategory: 'Mice', brand: 'Logitech', series: 'M190 Wireless Mouse', kind: 'mouse',
    count: 2, baseCost: 9, weightKg: 0.09, warrantyMonths: 12, tags: ['education', 'wireless'], bundleFor: 'Laptops',
    specs: { Connection: '2.4 GHz USB receiver', Sensor: 'Optical, 1000 DPI', Battery: 'Up to 18 months' },
    axes: [COLOUR('Charcoal', 'Blue')],
  },
  {
    category: 'Peripherals', subcategory: 'Mice', brand: 'Logitech', series: 'MX Anywhere 3S', kind: 'mouse',
    count: 1, baseCost: 55, weightKg: 0.1, warrantyMonths: 12, tags: ['premium', 'wireless'],
    specs: { Connection: 'Bluetooth, Logi Bolt', Sensor: '8000 DPI, works on glass', Battery: 'Up to 70 days, USB-C' },
  },
  {
    category: 'Peripherals', subcategory: 'Mice', brand: 'Kensington', series: 'Pro Fit Washable Mouse', kind: 'mouse',
    count: 2, baseCost: 14, weightKg: 0.1, warrantyMonths: 36, tags: ['education', 'washable'],
    specs: { Sensor: 'Optical, 1600 DPI', Cleaning: 'IP67, washable' },
    axes: [ax('Connection', [['Wired USB-A', 0], ['Wireless 2.4 GHz', 3]])],
  },
  {
    category: 'Peripherals', subcategory: 'Webcams', brand: 'Logitech', series: 'C920s Pro HD Webcam', kind: 'webcam',
    count: 1, baseCost: 50, weightKg: 0.16, warrantyMonths: 24, tags: ['conferencing'],
    specs: { Resolution: '1080p at 30 fps', Connection: 'USB-A', Microphone: 'Dual stereo mics', Privacy: 'Lens shutter' },
  },
  {
    category: 'Peripherals', subcategory: 'Webcams', brand: 'Logitech', series: 'Brio 300 Webcam', kind: 'webcam',
    count: 2, baseCost: 45, weightKg: 0.08, warrantyMonths: 24, tags: ['conferencing'],
    specs: { Resolution: '1080p at 30 fps', Connection: 'USB-C', Microphone: 'Noise-reducing mic', Privacy: 'Integrated shutter' },
    axes: [COLOUR('Graphite', 'Off-white')],
  },
  {
    category: 'Peripherals', subcategory: 'Webcams', brand: 'Microsoft', series: 'Modern Webcam', kind: 'webcam',
    count: 1, baseCost: 45, weightKg: 0.1, warrantyMonths: 12, tags: ['conferencing'],
    specs: { Resolution: '1080p at 30 fps, HDR', Connection: 'USB-A', Certification: 'Teams certified', Privacy: 'Privacy shutter' },
  },
  {
    category: 'Peripherals', subcategory: 'Webcams', brand: 'Anker', series: 'PowerConf C200 Webcam', kind: 'webcam',
    count: 1, baseCost: 45, weightKg: 0.1, warrantyMonths: 18, tags: ['conferencing'],
    specs: { Resolution: '2K at 30 fps', Connection: 'USB-C', Microphone: 'Stereo noise-cancelling mics', Privacy: 'Privacy cover' },
  },
  {
    category: 'Peripherals', subcategory: 'Document cameras', brand: 'Epson', series: 'ELPDC Visualiser', kind: 'doccam',
    count: 3, baseCost: 220, weightKg: 2.1, warrantyMonths: 36, tags: ['education', 'visualiser'],
    specs: { Connection: 'USB, HDMI', Lighting: 'Built-in LED', Software: 'Epson Easy Interactive Tools' },
    axes: [ax('Model', [['DC13 (Full HD, 10× zoom)', 0], ['DC21 (Full HD, 12× optical zoom)', 95], ['DC07 (compact)', -90]])],
  },
  {
    category: 'Peripherals', subcategory: 'Document cameras', brand: 'Kensington', series: 'Desktop Document Camera', kind: 'doccam',
    count: 2, baseCost: 110, weightKg: 1.2, warrantyMonths: 24, tags: ['education', 'visualiser'],
    specs: { Connection: 'USB-A', Lighting: 'Adjustable LED', Arm: 'Folding multi-joint arm' },
    axes: [ax('Resolution', [['Full HD', 0], ['4K', 25]])],
  },
  {
    category: 'Peripherals', subcategory: 'Presenters', brand: 'Logitech', series: 'Spotlight Presentation Remote', kind: 'presenter',
    count: 2, baseCost: 95, weightKg: 0.05, warrantyMonths: 24, tags: ['education', 'presenter'],
    specs: { Connection: 'Bluetooth or USB receiver', Range: 'Up to 30 m', Battery: 'Up to 3 months, USB-C' },
    axes: [COLOUR('Slate', 'Gold')],
  },
  {
    category: 'Peripherals', subcategory: 'Presenters', brand: 'Kensington', series: 'Wireless Presenter', kind: 'presenter',
    count: 2, baseCost: 25, weightKg: 0.04, warrantyMonths: 36, tags: ['education', 'presenter'],
    specs: { Connection: '2.4 GHz USB receiver', Range: 'Up to 20 m' },
    axes: [ax('Laser', [['Red laser', 0], ['Green laser', 8]])],
  },
  {
    category: 'Peripherals', subcategory: 'Presenters', brand: 'Targus', series: 'Laser Presentation Remote', kind: 'presenter',
    count: 1, baseCost: 22, weightKg: 0.04, warrantyMonths: 24, tags: ['education', 'presenter', 'budget'],
    specs: { Connection: '2.4 GHz USB receiver', Range: 'Up to 15 m', Laser: 'Red laser' },
  },

  // ─────────────── Networking & Power (20) ───────────────
  {
    category: 'Networking & Power', subcategory: 'Docks', brand: 'Dell', series: 'Universal Dock UD22', kind: 'dock',
    count: 1, baseCost: 190, weightKg: 0.5, warrantyMonths: 36, tags: ['business'],
    specs: { Connection: 'USB-C', 'Power delivery': '96 W', 'Video out': 'Up to 4 displays', Ports: 'USB-A ×2, USB-C ×2, HDMI, DisplayPort ×2, RJ45' },
  },
  {
    category: 'Networking & Power', subcategory: 'Docks', brand: 'Lenovo', series: 'ThinkPad Universal USB-C Dock', kind: 'dock',
    count: 1, baseCost: 160, weightKg: 0.5, warrantyMonths: 36, tags: ['business'],
    specs: { Connection: 'USB-C', 'Power delivery': '90 W', 'Video out': 'Up to 3 displays', Ports: 'USB-A ×3, USB-C, HDMI, DisplayPort ×2, RJ45' },
  },
  {
    category: 'Networking & Power', subcategory: 'Docks', brand: 'Kensington', series: 'SD2480T Thunderbolt 4 Dock', kind: 'dock',
    count: 1, baseCost: 210, weightKg: 0.6, warrantyMonths: 36, tags: ['business', 'mac'],
    specs: { Connection: 'Thunderbolt 4', 'Power delivery': '90 W', 'Video out': 'Dual 4K', Ports: 'TB4 ×3, USB-A ×4, RJ45, SD' },
  },
  {
    category: 'Networking & Power', subcategory: 'Docks', brand: 'Targus', series: 'Universal USB-C DV4K Dock', kind: 'dock',
    count: 1, baseCost: 120, weightKg: 0.4, warrantyMonths: 36, tags: ['business'],
    specs: { Connection: 'USB-C or USB-A', 'Power delivery': '65 W', 'Video out': 'Dual 4K', Ports: 'USB-A ×4, HDMI ×2, RJ45' },
  },
  {
    category: 'Networking & Power', subcategory: 'Hubs', brand: 'Anker', series: '7-in-1 USB-C Hub', kind: 'hub',
    count: 1, baseCost: 28, weightKg: 0.07, warrantyMonths: 18, tags: ['portable'],
    specs: { Connection: 'USB-C', Ports: 'HDMI 4K, USB-A ×2, USB-C PD 100 W, SD, microSD' },
  },
  {
    category: 'Networking & Power', subcategory: 'Hubs', brand: 'Belkin', series: 'USB-C Multiport Hub', kind: 'hub',
    count: 2, baseCost: 45, weightKg: 0.1, warrantyMonths: 24, tags: ['portable'],
    specs: { Connection: 'USB-C', 'Power delivery': '100 W pass-through' },
    axes: [ax('Ports', [['6-in-1', 0], ['8-in-1 with RJ45', 12]])],
  },
  {
    category: 'Networking & Power', subcategory: 'Chargers', brand: 'Anker', series: 'Nano USB-C GaN Charger', kind: 'charger',
    count: 2, baseCost: 30, weightKg: 0.12, warrantyMonths: 18, tags: ['portable'],
    specs: { Ports: 'USB-C ×2, USB-A', Plug: 'UK 3-pin' },
    axes: [ax('Power', [['65 W', 0], ['100 W', 20]])],
  },
  {
    category: 'Networking & Power', subcategory: 'Chargers', brand: 'Belkin', series: 'BoostCharge Pro 4-Port 108 W', kind: 'charger',
    count: 1, baseCost: 55, weightKg: 0.25, warrantyMonths: 24, tags: [],
    specs: { Power: '108 W', Ports: 'USB-C ×2, USB-A ×2', Plug: 'UK 3-pin' },
  },
  {
    category: 'Networking & Power', subcategory: 'Chargers', brand: 'Lenovo', series: '65 W USB-C Laptop Power Adapter', kind: 'charger',
    count: 1, baseCost: 32, weightKg: 0.3, warrantyMonths: 12, tags: ['education'],
    specs: { Power: '65 W', Ports: 'Fixed USB-C cable', Plug: 'UK 3-pin' },
  },
  {
    category: 'Networking & Power', subcategory: 'Cables', brand: 'Belkin', series: 'USB-C to USB-C Cable 100 W', kind: 'cable',
    count: 2, baseCost: 8, weightKg: 0.05, warrantyMonths: 24, tags: [],
    specs: { Connectors: 'USB-C to USB-C', Power: '100 W', Data: '480 Mbps' },
    axes: [ax('Length', [['1 m', 0], ['2 m', 4]])],
  },
  {
    category: 'Networking & Power', subcategory: 'Cables', brand: 'Anker', series: 'HDMI 2.1 Cable 2 m', kind: 'cable',
    count: 1, baseCost: 9, weightKg: 0.1, warrantyMonths: 18, tags: [],
    specs: { Connectors: 'HDMI to HDMI', Bandwidth: '48 Gbps, 8K60 / 4K120', Length: '2 m' },
  },
  {
    category: 'Networking & Power', subcategory: 'Wi-Fi', brand: 'TP-Link', series: 'Omada EAP650 Wi-Fi 6 Access Point', kind: 'wifi',
    count: 1, baseCost: 110, weightKg: 0.5, warrantyMonths: 36, tags: ['education', 'network'],
    specs: { Standard: 'Wi-Fi 6 AX3000', Power: 'PoE', Management: 'Omada cloud or controller', Mounting: 'Ceiling or wall' },
  },
  {
    category: 'Networking & Power', subcategory: 'Wi-Fi', brand: 'Ubiquiti', series: 'UniFi U6+ Access Point', kind: 'wifi',
    count: 1, baseCost: 120, weightKg: 0.4, warrantyMonths: 12, tags: ['education', 'network'],
    specs: { Standard: 'Wi-Fi 6, 2×2 MIMO', Power: 'PoE', Management: 'UniFi Network', Mounting: 'Ceiling or wall' },
  },
  {
    category: 'Networking & Power', subcategory: 'Wi-Fi', brand: 'TP-Link', series: 'Deco X50 Mesh Wi-Fi (2-pack)', kind: 'wifi',
    count: 1, baseCost: 140, weightKg: 1.0, warrantyMonths: 36, tags: ['network', 'home'],
    specs: { Standard: 'Wi-Fi 6 AX3000', Coverage: 'Up to 465 m²', Ports: '3 × Gigabit per unit' },
  },
  {
    category: 'Networking & Power', subcategory: 'Charging trolleys', brand: 'Kensington', series: 'AC Charging Trolley', kind: 'trolley',
    count: 2, baseCost: 650, weightKg: 45, warrantyMonths: 24, tags: ['education', 'classroom'],
    specs: { Compatibility: 'Laptops, Chromebooks and tablets up to 15.6"', Security: 'Lockable doors', Power: 'Timed charging, UK plug' },
    axes: [ax('Capacity', [['16-bay', 0], ['32-bay', 450]])],
  },
  {
    category: 'Networking & Power', subcategory: 'Charging trolleys', brand: 'Targus', series: 'Intellect 30-bay Charging Cart', kind: 'trolley',
    count: 1, baseCost: 900, weightKg: 60, warrantyMonths: 24, tags: ['education', 'classroom'],
    specs: { Capacity: '30-bay', Compatibility: 'Devices up to 14"', Security: 'Key and combination lock', Power: 'Intelligent sequenced charging' },
  },

  // ─────────────── Software & Accessories (15) ───────────────
  {
    category: 'Software & Accessories', subcategory: 'Bags and sleeves', brand: 'Targus', series: 'Classic 15.6" Laptop Bag', kind: 'bag',
    count: 1, baseCost: 15, weightKg: 0.7, warrantyMonths: 24, tags: ['education'], bundleFor: 'Laptops',
    specs: { Fits: 'Laptops up to 15.6"', Material: 'Water-resistant polyester', Pockets: 'Front organiser, padded laptop section' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Bags and sleeves', brand: 'Targus', series: 'EcoSmart 14" Sleeve', kind: 'bag',
    count: 1, baseCost: 10, weightKg: 0.2, warrantyMonths: 24, tags: ['eco'],
    specs: { Fits: 'Laptops up to 14"', Material: 'Recycled plastic bottles' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Bags and sleeves', brand: 'Kensington', series: 'Contour 2.0 Laptop Backpack', kind: 'bag',
    count: 1, baseCost: 45, weightKg: 1.2, warrantyMonths: 24, tags: [],
    specs: { Fits: 'Laptops up to 15.6"', Material: 'Water-resistant nylon', Features: 'Ergonomic straps, trolley sleeve' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Bags and sleeves', brand: 'Targus', series: 'Rugged Chromebook Sleeve', kind: 'bag',
    count: 2, baseCost: 12, weightKg: 0.3, warrantyMonths: 24, tags: ['education', 'chromebook', 'rugged'],
    specs: { Material: 'Shock-absorbing EVA', Features: 'Work-in design, carry handle' },
    axes: [ax('Fits', [['11.6"', 0], ['14"', 2]])],
  },
  {
    category: 'Software & Accessories', subcategory: 'Stands', brand: 'Kensington', series: 'SmartFit Laptop Riser', kind: 'stand',
    count: 1, baseCost: 35, weightKg: 1.4, warrantyMonths: 24, tags: ['ergonomic'],
    specs: { Fits: 'Laptops up to 15.6"', Adjustment: '5 height settings' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Stands', brand: 'Belkin', series: 'Tablet Stage Stand', kind: 'stand',
    count: 1, baseCost: 25, weightKg: 1.1, warrantyMonths: 24, tags: ['education'],
    specs: { Fits: 'Tablets 7–13"', Use: 'Turns a tablet into a document camera' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Stands', brand: 'Targus', series: 'Ergo Laptop Stand', kind: 'stand',
    count: 1, baseCost: 20, weightKg: 0.8, warrantyMonths: 24, tags: ['ergonomic'],
    specs: { Fits: 'Laptops up to 15.6"', Material: 'Aluminium', Adjustment: 'Folding, 3 angles' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Screen protectors', brand: 'Belkin', series: 'ScreenForce Pro Screen Protector, iPad 11"', kind: 'protector',
    count: 1, baseCost: 18, weightKg: 0.05, warrantyMonths: 12, tags: ['ipad-accessory'],
    specs: { Material: 'Tempered glass', Compatibility: 'iPad 11" (A16)', Features: 'Anti-microbial treatment' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Screen protectors', brand: 'Targus', series: '4Vu Privacy Screen', kind: 'protector',
    count: 2, baseCost: 35, weightKg: 0.1, warrantyMonths: 12, tags: ['privacy'],
    specs: { Type: 'Two-way privacy filter', Fitting: 'Adhesive tabs' },
    axes: [ax('Size', [['14"', 0], ['15.6"', 5]])],
  },
  {
    category: 'Software & Accessories', subcategory: 'Licences', brand: 'Microsoft', series: '365 Business Standard (12-month licence)', kind: 'licence',
    count: 1, baseCost: 92, weightKg: 0, warrantyMonths: 0, tags: ['software', 'licence'],
    specs: { Delivery: 'Electronic licence key by email', Users: '1 user, up to 5 PCs or Macs', Term: '12 months' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Licences', brand: 'Microsoft', series: 'Office Home 2024 (perpetual licence)', kind: 'licence',
    count: 1, baseCost: 115, weightKg: 0, warrantyMonths: 0, tags: ['software', 'licence'],
    specs: { Delivery: 'Electronic licence key by email', Users: '1 PC or Mac', Term: 'Perpetual' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Licences', brand: 'Microsoft', series: 'Windows 11 Pro Upgrade Licence', kind: 'licence',
    count: 1, baseCost: 110, weightKg: 0, warrantyMonths: 0, tags: ['software', 'licence'],
    specs: { Delivery: 'Electronic licence key by email', Upgrade: 'From Windows 11 Home', Term: 'Perpetual' },
  },
  {
    category: 'Software & Accessories', subcategory: 'Licences', brand: 'Microsoft', series: '365 Personal (12-month licence)', kind: 'licence',
    count: 1, baseCost: 55, weightKg: 0, warrantyMonths: 0, tags: ['software', 'licence'],
    specs: { Delivery: 'Electronic licence key by email', Users: '1 user', Term: '12 months' },
  },
];

export const CATEGORY_TARGETS: Record<string, number> = {
  Laptops: 40,
  Tablets: 30,
  'Desktops & All-in-ones': 20,
  'Monitors & Displays': 20,
  'Headphones & Audio': 30,
  Peripherals: 25,
  'Networking & Power': 20,
  'Software & Accessories': 15,
};

export const BRAND_CODES: Record<string, string> = {
  Apple: 'APL', Lenovo: 'LEN', HP: 'HPI', Dell: 'DEL', Acer: 'ACR', ASUS: 'ASU', Microsoft: 'MSF', Samsung: 'SAM',
  Logitech: 'LOG', Jabra: 'JAB', Sennheiser: 'SEN', Poly: 'POL', Sony: 'SNY', Bose: 'BOS', JBL: 'JBL', Anker: 'ANK',
  Belkin: 'BLK', AOC: 'AOC', Philips: 'PHI', Targus: 'TAR', Kensington: 'KEN', Epson: 'EPS', 'TP-Link': 'TPL',
  Ubiquiti: 'UBQ',
};

/** Seeded RRP uplift on cost, so default markups land on realistic margins (spec §5.4). */
export function rrpUplift(category: string, brand: string): [number, number] {
  if (brand === 'Apple') return [0.03, 0.06];
  switch (category) {
    case 'Laptops':
    case 'Tablets':
    case 'Desktops & All-in-ones':
      return [0.04, 0.08];
    case 'Monitors & Displays':
      return [0.08, 0.15];
    case 'Peripherals':
      return [0.1, 0.2];
    case 'Headphones & Audio':
      return [0.2, 0.4];
    default:
      return [0.25, 0.45];
  }
}
