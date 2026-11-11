// Sample reviews for the demo product page (spec §10.3: "mock data, clearly sample").
// Always labelled as samples in the UI and never included in structured data: UK law bans
// presenting invented reviews as genuine. Replace with a real review provider before launch.

export interface SampleReview {
  author: string;
  role: string;
  rating: number;
  title: string;
  body: string;
}

const GENERIC: SampleReview[] = [
  {
    author: 'Sample reviewer',
    role: 'Primary teacher',
    rating: 5,
    title: 'Does exactly what we needed',
    body: 'Arrived quickly and was set up in minutes. It has coped with a full week of lessons without any fuss.',
  },
  {
    author: 'Sample reviewer',
    role: 'IT technician, secondary school',
    rating: 4,
    title: 'Good value for the department',
    body: 'Solid build and easy to manage. We bought several and they all arrived together and well packed.',
  },
  {
    author: 'Sample reviewer',
    role: 'Head of department',
    rating: 5,
    title: 'Would order again',
    body: 'Clear pricing with VAT shown up front, which made the purchase order simple. Delivery was on time.',
  },
];

const BY_CATEGORY: Record<string, SampleReview> = {
  Laptops: {
    author: 'Sample reviewer',
    role: 'Secondary teacher',
    rating: 5,
    title: 'Battery lasts the school day',
    body: 'Light enough to carry between classrooms and the battery easily gets through a full timetable.',
  },
  'Headphones & Audio': {
    author: 'Sample reviewer',
    role: 'Languages teacher',
    rating: 5,
    title: 'Clear audio for listening tests',
    body: 'Comfortable for younger pupils and the microphone picks up speech clearly for oral practice.',
  },
  Tablets: {
    author: 'Sample reviewer',
    role: 'Early years lead',
    rating: 4,
    title: 'Great in the classroom',
    body: 'Responsive screen and plenty of storage for our learning apps. Pair it with a rugged case.',
  },
};

export function sampleReviewsFor(category: string): SampleReview[] {
  const specific = BY_CATEGORY[category];
  return specific ? [specific, ...GENERIC.slice(0, 2)] : GENERIC;
}
