// Original, spec-led description copy for the mock catalogue (spec §5.3: 50–90 words, no manufacturer text).
import type { createRng } from '../../src/lib/utils/rng';

type Rng = ReturnType<typeof createRng>;

const SUBCATEGORY_OPENERS: Record<string, string[]> = {
  Chromebooks: [
    'A straightforward Chromebook for classrooms, where quick start-up and simple management matter more than anything else.',
    'This Chromebook is built for shared classroom use, with fast sign-in and automatic updates handled by ChromeOS.',
  ],
  'Windows laptops': [
    'A dependable Windows laptop for teachers who plan lessons, run reports and present from the same machine.',
    'This business-grade laptop suits staff who need full Windows software, a good keyboard and all-day reliability.',
  ],
  MacBooks: [
    'A slim, quiet MacBook for staff who work with creative apps, video or large documents.',
    'This MacBook combines a sharp display with long battery life, making it a strong choice for media and design departments.',
  ],
  'Rugged/education': [
    'Designed to survive the school day, this rugged laptop shrugs off knocks, spills and busy corridors.',
    'A tough, convertible laptop made for younger pupils, with reinforced corners and a spill-resistant keyboard.',
  ],
  iPads: [
    'An iPad that fits neatly into classroom routines, from reading and research to recording and creative projects.',
    'This iPad gives teachers and pupils a fast, simple tablet that works with familiar education apps.',
  ],
  'Android tablets': [
    'A capable Android tablet for reading, video lessons and learning apps, at a price that suits whole-class rollouts.',
    'This Android tablet offers a bright screen and long battery life for independent learning and group work.',
  ],
  'Tablet cases and keyboards': [
    'A practical tablet accessory that protects devices and makes them easier to use for writing and note-taking.',
    'This accessory helps tablets cope with daily classroom handling while adding useful features for pupils and staff.',
  ],
  'Mini PCs': [
    'A compact desktop that mounts behind a monitor or under a desk, freeing up space in classrooms and offices.',
    'This small-form-factor PC delivers full desktop performance in a box not much bigger than a hardback book.',
  ],
  'Tower PCs': [
    'A reliable tower PC for computer suites and offices, with room to add storage and memory later.',
    'This desktop tower is a sensible workhorse for ICT rooms, admin offices and reception desks.',
  ],
  'All-in-ones': [
    'An all-in-one PC that keeps desks tidy, combining screen, computer and speakers in a single unit.',
    'This all-in-one is ideal for reception areas, libraries and staff rooms where space and cabling are limited.',
  ],
  iMac: ['An all-in-one Mac with a vivid display, suited to media studies, music and design classrooms.'],
  Monitors: [
    'A clear, comfortable monitor for marking, planning and video calls, with adjustment to suit different desks.',
    'This monitor gives more room to work side by side, which helps with spreadsheets, timetables and lesson resources.',
  ],
  'Portable monitors': [
    'A lightweight second screen that slips into a laptop bag, handy for teachers who move between rooms.',
  ],
  'Interactive displays': [
    'A large interactive display that lets teachers and pupils write, draw and present together at the front of the class.',
    'This interactive panel replaces a projector and whiteboard with one bright, touch-enabled screen.',
  ],
  'Classroom headsets': [
    'A comfortable headset for phonics, language labs, online assessments and video lessons.',
    'This headset is made for everyday classroom use, with a clear microphone and simple plug-in setup.',
  ],
  'Wireless headphones': [
    'Wireless headphones with strong noise cancelling, ideal for focused work, travel and long video calls.',
  ],
  Earbuds: ['Compact wireless earbuds for calls, podcasts and music, with a pocket-sized charging case.'],
  Speakers: ['A portable speaker that fills a classroom with clear sound for music, videos and assemblies.'],
  'Conference mics': [
    'A speakerphone that picks up voices around the table, making hybrid meetings and parent calls clearer.',
  ],
  Keyboards: ['A reliable keyboard for classroom and office desks, with a familiar UK layout.'],
  Mice: ['A comfortable mouse for everyday computing, sized to suit a wide range of hands.'],
  Webcams: ['A sharp webcam for remote lessons, staff meetings and recording short teaching videos.'],
  'Document cameras': [
    'A document camera that shows worksheets, books and experiments on the big screen in real time.',
  ],
  Presenters: [
    'A presentation remote that lets teachers move freely around the room while controlling slides.',
  ],
  Docks: [
    'A docking station that connects a laptop to screens, network and accessories through a single cable.',
  ],
  Hubs: ['A compact hub that adds the ports most laptops are missing, from HDMI to card readers.'],
  Chargers: ['A spare or replacement charger that keeps devices topped up between lessons.'],
  Cables: ['A well-made cable for connecting and charging classroom and office devices.'],
  'Wi-Fi': ['Wireless networking kit that brings fast, stable Wi-Fi to classrooms, halls and staff areas.'],
  'Charging trolleys': [
    'A lockable charging trolley that stores, secures and charges a full class set of devices overnight.',
  ],
  'Bags and sleeves': [
    'A protective carry option for laptops moving between home, staff room and classroom.',
  ],
  Stands: ['A stand that raises screens or tablets to a more comfortable working height.'],
  'Screen protectors': ['A screen accessory that protects displays or keeps on-screen information private.'],
  Licences: ['A genuine software licence delivered electronically, ready to activate on your device.'],
};

const CATEGORY_CLOSERS: Record<string, string[]> = {
  Laptops: [
    'It handles lesson planning, video calls and marking without fuss.',
    'The keyboard is comfortable for long typing sessions and the trackpad is precise enough for slides.',
    'Supplied with a UK power adapter and covered by the manufacturer warranty.',
    'A sensible choice for teachers who move between classrooms, staff rooms and home.',
  ],
  Tablets: [
    'It is light enough for younger pupils to carry and robust enough for daily use.',
    'Works well alongside classroom management tools and shared device setups.',
    'Ideal for reading schemes, quizzes, recording and creative projects.',
  ],
  'Desktops & All-in-ones': [
    'Ready for common school software, from office suites to management information systems.',
    'Supports standard IT management tools for straightforward deployment across a site.',
    'Quiet in use, so it will not distract a busy classroom or office.',
  ],
  'Monitors & Displays': [
    'Flicker-free backlighting and a low blue light mode make long sessions easier on the eyes.',
    'Connects easily to laptops, desktops and docking stations.',
    'A good fit for classrooms, offices and home working setups.',
  ],
  'Headphones & Audio': [
    'Easy to clean between users and comfortable for younger and older pupils alike.',
    'Works with laptops, Chromebooks, tablets and desktop PCs.',
    'Clear sound helps learners focus, whether they are listening or speaking.',
  ],
  Peripherals: [
    'Plug-and-play setup means it works straight away with most computers.',
    'Built to cope with heavy daily use across shared desks.',
    'A dependable option for classrooms, offices and home working.',
  ],
  'Networking & Power': [
    'Built to a solid standard for reliable everyday use in schools and offices.',
    'Compatible with a wide range of laptops, tablets and phones.',
    'A practical upgrade that saves time and reduces cable clutter.',
  ],
  'Software & Accessories': [
    'Chosen to complement the devices teachers use every day.',
    'A small addition that makes a noticeable difference to daily use.',
    'Pairs well with the laptops and tablets in our range.',
  ],
};

const article = (w: string) => (/^(8|11|18|[aeiou])/i.test(w) ? `an ${w}` : `a ${w}`);

function specSentence(category: string, specs: Record<string, string>): string {
  const s = (k: string) => specs[k];
  if ((category === 'Laptops' || category === 'Desktops & All-in-ones') && s('Processor')) {
    const parts = [`It runs on ${article(s('Processor')!)}`];
    if (s('RAM')) parts.push(`with ${s('RAM')} of memory`);
    if (s('Storage')) parts.push(`and ${s('Storage')}`);
    let out = parts.join(' ');
    if (s('Screen')) out += `, paired with ${article(s('Screen')!)} display`;
    return `${out}.`;
  }
  if (category === 'Tablets' && s('Screen')) {
    return `It features ${article(s('Screen')!)} display${s('Storage') ? `, ${s('Storage')} of storage` : ''}${s('Battery') ? ` and ${s('Battery')!.toLowerCase()} of battery life` : ''}.`;
  }
  if (category === 'Monitors & Displays' && s('Resolution')) {
    return `It offers ${s('Resolution')} resolution${s('Panel') ? ` on ${article(s('Panel')!)} panel` : ''}${s('Connectivity') ? `, with ${s('Connectivity')} connections` : ''}.`;
  }
  const pairs = Object.entries(specs)
    .slice(0, 3)
    .map(([k, v]) => `${k.toLowerCase()}: ${v}`);
  return `Key details include ${pairs.join('; ')}.`;
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Builds a 50–90 word description from an opener, a spec sentence and category closers. */
export function buildDescription(
  rng: Rng,
  category: string,
  subcategory: string,
  specs: Record<string, string>,
): string {
  const openers = SUBCATEGORY_OPENERS[subcategory] ?? ['A dependable product for schools and offices.'];
  const sentences = [rng.pick(openers), specSentence(category, specs)];
  const closers = [...(CATEGORY_CLOSERS[category] ?? CATEGORY_CLOSERS['Software & Accessories']!)];
  // shuffle closers deterministically
  for (let i = closers.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [closers[i], closers[j]] = [closers[j]!, closers[i]!];
  }
  for (const c of closers) {
    const total = words(sentences.join(' '));
    if (total >= 55) break;
    if (total + words(c) <= 90) sentences.push(c);
  }
  const generic = [
    'Dispatched directly from the UK distributor, usually within one to two working days.',
    'Backed by UK statutory rights and the manufacturer warranty.',
  ];
  for (const g of generic) {
    if (words(sentences.join(' ')) >= 50) break;
    sentences.push(g);
  }
  return sentences.join(' ');
}
