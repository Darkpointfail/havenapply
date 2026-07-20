import { images } from "@/data/images";

export type CareLevel =
  | "Assisted living"
  | "Memory care"
  | "Nursing care"
  | "Rehabilitation"
  | "Independent living"
  | "Respite care"
  | "CCRC";

export type Residence = {
  id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  region: string;
  distanceKm: number;
  distanceMiles: number;
  lat: number;
  lng: number;
  priceFrom: number | null;
  priceAvailable: boolean;
  waitingWeeks: number | null;
  availableNow: boolean;
  availabilityConfirmed: boolean;
  careLevels: CareLevel[];
  rating: number;
  reviewCount: number;
  roomTypes: ("Private" | "Shared")[];
  petFriendly: boolean;
  languages: string[];
  mealsIncluded: boolean;
  specialMeals: boolean;
  wheelchairAccessible: boolean;
  medicalServices: string[];
  acceptsMedicaid: boolean;
  acceptsVeteransBenefits: boolean;
  secureMemoryCare: boolean;
  transportAvailable: boolean;
  couplesWelcome: boolean;
  respiteAvailable: boolean;
  partner: boolean;
  highlights: string[];
  image: string;
  gallery: string[];
  about: string;
  staffRatio: string;
  doctors: string[];
  nurses: string[];
  therapists: string[];
  amenities: string[];
  activities: string[];
  meals: string[];
  includedServices: string[];
  pricing: { room: string; price: number; notes: string }[];
  inspections: { date: string; result: string; summary: string }[];
  reviews: { name: string; relation: string; rating: number; text: string }[];
};

export const residences: Residence[] = [
  {
    id: "maple-grove",
    name: "Maple Grove Residence",
    city: "Austin",
    state: "TX",
    zip: "78731",
    region: "Greater Austin",
    distanceKm: 8,
    distanceMiles: 5,
    lat: 30.35,
    lng: -97.76,
    priceFrom: 4200,
    priceAvailable: true,
    waitingWeeks: null,
    availableNow: true,
    availabilityConfirmed: true,
    careLevels: ["Assisted living", "Memory care"],
    rating: 4.8,
    reviewCount: 126,
    roomTypes: ["Private", "Shared"],
    petFriendly: true,
    languages: ["English", "Spanish"],
    mealsIncluded: true,
    specialMeals: true,
    wheelchairAccessible: true,
    medicalServices: ["Nursing 24/7", "Medication management", "Physiotherapy"],
    acceptsMedicaid: false,
    acceptsVeteransBenefits: true,
    secureMemoryCare: true,
    transportAvailable: true,
    couplesWelcome: true,
    respiteAvailable: true,
    partner: true,
    highlights: ["Secure memory wing", "Pet friendly", "Garden courtyard"],
    image: images.caregiverSenior,
    gallery: [
      images.caregiverSenior,
      images.adultChildParent,
      images.seniorsTogether,
      images.holdingHands,
    ],
    about:
      "A warm, light-filled community focused on dignified daily living with attentive memory-care support and a strong sense of neighborhood.",
    staffRatio: "1:5 daytime · 1:8 overnight",
    doctors: ["Dr. Amélie Caron", "Dr. James Patel"],
    nurses: ["Sofia Nguyen, RN", "Marc Lefebvre, RN", "Priya Shah, LPN"],
    therapists: ["Hannah Brooks, PT", "Émile Roy, OT"],
    amenities: [
      "Garden courtyard",
      "Library lounge",
      "Hair salon",
      "Family kitchen",
      "Secure memory wing",
      "Wi‑Fi throughout",
    ],
    activities: ["Morning stretch", "Art workshop", "Music hour", "Garden walks", "Family Sundays"],
    meals: ["Chef-prepared menus", "Texture-modified options", "Cultural meal nights"],
    includedServices: [
      "Housekeeping",
      "Laundry",
      "Personal care assistance",
      "Activities program",
      "Family portal updates",
    ],
    pricing: [
      { room: "Private suite", price: 5200, notes: "Ensuite bath, garden view" },
      { room: "Private standard", price: 4200, notes: "Shared lounge access" },
      { room: "Shared room", price: 3400, notes: "Two residents, private storage" },
    ],
    inspections: [
      {
        date: "Nov 2025",
        result: "Compliant",
        summary: "Strong scores for care planning and infection prevention.",
      },
    ],
    reviews: [
      {
        name: "Claire M.",
        relation: "Daughter",
        rating: 5,
        text: "The staff treated my mother like family. Haven made a hard season feel manageable.",
      },
      {
        name: "Robert K.",
        relation: "Son",
        rating: 5,
        text: "Transparent waiting times and warm communication.",
      },
    ],
  },
  {
    id: "lakeside-haven",
    name: "Lakeside Haven",
    city: "Dallas",
    state: "TX",
    zip: "75225",
    region: "North Dallas",
    distanceKm: 14,
    distanceMiles: 9,
    lat: 32.86,
    lng: -96.78,
    priceFrom: 3800,
    priceAvailable: true,
    waitingWeeks: 10,
    availableNow: false,
    availabilityConfirmed: true,
    careLevels: ["Assisted living", "Rehabilitation"],
    rating: 4.6,
    reviewCount: 89,
    roomTypes: ["Private"],
    petFriendly: false,
    languages: ["English", "Spanish"],
    mealsIncluded: true,
    specialMeals: true,
    wheelchairAccessible: true,
    medicalServices: ["Rehab gym", "Nursing daytime", "Occupational therapy"],
    acceptsMedicaid: true,
    acceptsVeteransBenefits: true,
    secureMemoryCare: false,
    transportAvailable: true,
    couplesWelcome: true,
    respiteAvailable: true,
    partner: true,
    highlights: ["Rehab program", "Medicaid accepted", "Private rooms"],
    image: images.gentleCare,
    gallery: [images.gentleCare, images.outdoorWalk, images.elderlyCouple],
    about:
      "Lakeside Haven specializes in short- and long-term assisted living with a strong rehabilitation program after hospital stays.",
    staffRatio: "1:6 daytime · 1:9 overnight",
    doctors: ["Dr. Nadia El-Sayed"],
    nurses: ["Thomas Berger, RN", "Lila Cohen, RN"],
    therapists: ["Owen Park, PT", "Maya Fontaine, SLP"],
    amenities: ["Waterfront terrace", "Rehab studio", "Café corner", "Visiting suites"],
    activities: ["Hydrotherapy", "Book club", "Tai chi", "Cooking classes"],
    meals: ["Seasonal menus", "Heart-healthy options", "Guest dining"],
    includedServices: ["Concierge", "Transport to appointments", "Weekly housekeeping"],
    pricing: [
      { room: "Private lake view", price: 4600, notes: "Balcony access" },
      { room: "Private courtyard", price: 3800, notes: "Quiet wing" },
    ],
    inspections: [
      {
        date: "Jan 2026",
        result: "Compliant",
        summary: "Excellent rehab documentation and resident engagement scores.",
      },
    ],
    reviews: [
      {
        name: "Helen P.",
        relation: "Spouse",
        rating: 5,
        text: "After his surgery, the rehab team helped him regain confidence.",
      },
    ],
  },
  {
    id: "cedar-memory",
    name: "Cedar Memory Care",
    city: "Houston",
    state: "TX",
    zip: "77024",
    region: "Memorial",
    distanceKm: 6,
    distanceMiles: 4,
    lat: 29.77,
    lng: -95.52,
    priceFrom: 5100,
    priceAvailable: true,
    waitingWeeks: 16,
    availableNow: false,
    availabilityConfirmed: true,
    careLevels: ["Memory care", "Nursing care"],
    rating: 4.9,
    reviewCount: 74,
    roomTypes: ["Private"],
    petFriendly: true,
    languages: ["English", "Spanish", "Mandarin"],
    mealsIncluded: true,
    specialMeals: true,
    wheelchairAccessible: true,
    medicalServices: ["Dementia specialists", "Nursing 24/7", "Behavioral support"],
    acceptsMedicaid: false,
    acceptsVeteransBenefits: false,
    secureMemoryCare: true,
    transportAvailable: false,
    couplesWelcome: false,
    respiteAvailable: true,
    partner: true,
    highlights: ["Secure memory campus", "Dementia specialists", "Sensory garden"],
    image: images.holdingHands,
    gallery: [images.holdingHands, images.seniorSmile, images.caregiverSenior],
    about:
      "Purpose-built for Alzheimer’s and related dementias, with familiar routines, sensory gardens, and trained memory-care teams.",
    staffRatio: "1:4 daytime · 1:6 overnight",
    doctors: ["Dr. Elise Moreau", "Dr. Victor Chen"],
    nurses: ["Aisha Rahman, RN", "Paul Girard, RN"],
    therapists: ["Nora Blanc, OT", "Sam Rivera, Music therapist"],
    amenities: ["Sensory garden", "Circular walking paths", "Family lounge", "Secure outdoor courtyard"],
    activities: ["Reminiscence therapy", "Music & memory", "Gentle yoga", "Pet visits"],
    meals: ["Familiar comfort foods", "Assisted dining", "Hydration stations"],
    includedServices: ["Specialized dementia programming", "Care conferences", "Family education nights"],
    pricing: [
      { room: "Private memory suite", price: 5600, notes: "Visual cueing design" },
      { room: "Private standard", price: 5100, notes: "Close to nursing station" },
    ],
    inspections: [
      {
        date: "Sep 2025",
        result: "Compliant",
        summary: "Outstanding dementia care protocols and family communication.",
      },
    ],
    reviews: [
      {
        name: "Daniela R.",
        relation: "Daughter",
        rating: 5,
        text: "They understand Alzheimer’s with such patience.",
      },
    ],
  },
  {
    id: "sunrise-terrace",
    name: "Sunrise Terrace",
    city: "San Antonio",
    state: "TX",
    zip: "78209",
    region: "Alamo Heights",
    distanceKm: 22,
    distanceMiles: 14,
    lat: 29.48,
    lng: -98.46,
    priceFrom: 3500,
    priceAvailable: true,
    waitingWeeks: 6,
    availableNow: false,
    availabilityConfirmed: false,
    careLevels: ["Independent living", "Assisted living"],
    rating: 4.5,
    reviewCount: 152,
    roomTypes: ["Private", "Shared"],
    petFriendly: true,
    languages: ["English", "Spanish"],
    mealsIncluded: true,
    specialMeals: false,
    wheelchairAccessible: true,
    medicalServices: ["On-call nursing", "Wellness checks", "Pharmacy liaison"],
    acceptsMedicaid: true,
    acceptsVeteransBenefits: true,
    secureMemoryCare: false,
    transportAvailable: true,
    couplesWelcome: true,
    respiteAvailable: false,
    partner: true,
    highlights: ["Independent + assisted", "Shuttle service", "Couples welcome"],
    image: images.seniorsTogether,
    gallery: [images.seniorsTogether, images.familyVisit, images.community],
    about:
      "A lively community for seniors who want independence with a safety net. Bright apartments and flexible care add-ons.",
    staffRatio: "1:8 daytime · 1:12 overnight",
    doctors: ["Dr. Karim Haddad"],
    nurses: ["Julie Tremblay, RN"],
    therapists: ["Céline Dubois, Wellness coach"],
    amenities: ["Fitness studio", "Rooftop terrace", "Movie lounge", "Shuttle service"],
    activities: ["Bridge club", "Dance evenings", "Language café", "Market trips"],
    meals: ["Restaurant-style dining", "À la carte breakfast"],
    includedServices: ["Weekly housekeeping", "Social calendar", "Emergency response"],
    pricing: [
      { room: "One-bedroom", price: 4100, notes: "Kitchenette included" },
      { room: "Studio private", price: 3500, notes: "Meals package" },
      { room: "Shared suite", price: 2900, notes: "Ideal for companions" },
    ],
    inspections: [
      {
        date: "May 2025",
        result: "Compliant",
        summary: "High resident satisfaction; clear emergency procedures.",
      },
    ],
    reviews: [
      {
        name: "Fatima A.",
        relation: "Niece",
        rating: 4,
        text: "My aunt loves the community spirit.",
      },
    ],
  },
  {
    id: "riverside-nursing",
    name: "Riverside Nursing Home",
    city: "Fort Worth",
    state: "TX",
    zip: "76107",
    region: "Cultural District",
    distanceKm: 11,
    distanceMiles: 7,
    lat: 32.75,
    lng: -97.36,
    priceFrom: 4700,
    priceAvailable: true,
    waitingWeeks: 20,
    availableNow: false,
    availabilityConfirmed: true,
    careLevels: ["Nursing care", "Rehabilitation", "Respite care"],
    rating: 4.4,
    reviewCount: 61,
    roomTypes: ["Private", "Shared"],
    petFriendly: false,
    languages: ["English", "Spanish"],
    mealsIncluded: true,
    specialMeals: true,
    wheelchairAccessible: true,
    medicalServices: ["Skilled nursing", "Wound care", "IV therapy", "Palliative support"],
    acceptsMedicaid: true,
    acceptsVeteransBenefits: true,
    secureMemoryCare: false,
    transportAvailable: true,
    couplesWelcome: false,
    respiteAvailable: true,
    partner: true,
    highlights: ["Skilled nursing", "Wound care", "Respite stays"],
    image: images.nursingCare,
    gallery: [images.nursingCare, images.bedsideCare, images.holdingHands],
    about:
      "Clinical excellence with a human touch. Riverside supports complex medical needs while keeping daily life personal.",
    staffRatio: "1:4 daytime · 1:7 overnight",
    doctors: ["Dr. Sophie Lang", "Dr. Michael Okonkwo"],
    nurses: ["Grace Adeyemi, RN", "Hugo Martin, RN", "Inès Benali, LPN"],
    therapists: ["Leo Frost, PT", "Amara Singh, Respiratory therapist"],
    amenities: ["Quiet chapel", "Therapy courtyard", "Family overnight room"],
    activities: ["Bedside reading", "Art therapy", "Spiritual care", "Family nights"],
    meals: ["Clinically tailored menus", "Assisted feeding support"],
    includedServices: ["Care planning meetings", "Pharmacy coordination", "Discharge planning"],
    pricing: [
      { room: "Private clinical", price: 5400, notes: "Medical monitoring suite" },
      { room: "Shared clinical", price: 4700, notes: "Two residents" },
    ],
    inspections: [
      {
        date: "Dec 2025",
        result: "Compliant",
        summary: "Strong clinical governance and medication safety practices.",
      },
    ],
    reviews: [
      {
        name: "Patrick L.",
        relation: "Son",
        rating: 4,
        text: "Complex care, handled with dignity.",
      },
    ],
  },
  {
    id: "orchard-house",
    name: "Orchard House",
    city: "Round Rock",
    state: "TX",
    zip: "78664",
    region: "North Austin",
    distanceKm: 18,
    distanceMiles: 11,
    lat: 30.51,
    lng: -97.68,
    priceFrom: 3900,
    priceAvailable: true,
    waitingWeeks: null,
    availableNow: true,
    availabilityConfirmed: true,
    careLevels: ["Assisted living"],
    rating: 4.7,
    reviewCount: 98,
    roomTypes: ["Private"],
    petFriendly: true,
    languages: ["English"],
    mealsIncluded: true,
    specialMeals: false,
    wheelchairAccessible: true,
    medicalServices: ["Medication management", "Visiting physicians", "Wellness clinic"],
    acceptsMedicaid: false,
    acceptsVeteransBenefits: true,
    secureMemoryCare: false,
    transportAvailable: true,
    couplesWelcome: true,
    respiteAvailable: false,
    partner: true,
    highlights: ["Boutique scale", "Available now", "Private suites"],
    image: images.grandmotherChild,
    gallery: [images.grandmotherChild, images.elderlyCouple, images.outdoorWalk],
    about:
      "A boutique residence with a home-like scale — personalized assisted living without an institutional feel.",
    staffRatio: "1:5 daytime · 1:8 overnight",
    doctors: ["Dr. Laura Kim"],
    nurses: ["Emma Walsh, RN"],
    therapists: ["Benito Cruz, OT"],
    amenities: ["Orchard paths", "Conservatory", "Piano lounge", "Pet visiting hours"],
    activities: ["Gardening club", "Choir", "Tea & conversation", "Intergenerational visits"],
    meals: ["Farm-to-table inspired", "Family-style dinners"],
    includedServices: ["Personal care plans", "Laundry", "Concierge errands"],
    pricing: [
      { room: "Garden suite", price: 4500, notes: "Private patio" },
      { room: "Orchard room", price: 3900, notes: "Tree views" },
    ],
    inspections: [
      {
        date: "Aug 2025",
        result: "Compliant",
        summary: "Warm culture of care noted across all inspection domains.",
      },
    ],
    reviews: [
      {
        name: "Anne W.",
        relation: "Daughter",
        rating: 5,
        text: "It feels like a real home.",
      },
    ],
  },
  {
    id: "hillcrest-manor",
    name: "Hillcrest Manor",
    city: "Austin",
    state: "TX",
    zip: "78757",
    region: "North Loop",
    distanceKm: 12,
    distanceMiles: 7,
    lat: 30.34,
    lng: -97.72,
    priceFrom: null,
    priceAvailable: false,
    waitingWeeks: null,
    availableNow: false,
    availabilityConfirmed: false,
    careLevels: ["Assisted living", "Independent living", "CCRC"],
    rating: 4.2,
    reviewCount: 41,
    roomTypes: ["Private", "Shared"],
    petFriendly: true,
    languages: ["English", "Spanish"],
    mealsIncluded: true,
    specialMeals: true,
    wheelchairAccessible: true,
    medicalServices: ["Wellness clinic", "Medication reminders"],
    acceptsMedicaid: true,
    acceptsVeteransBenefits: false,
    secureMemoryCare: false,
    transportAvailable: true,
    couplesWelcome: true,
    respiteAvailable: true,
    partner: false,
    highlights: ["CCRC path", "Medicaid", "Non-partner listing"],
    image: images.community,
    gallery: [images.community, images.familyVisit],
    about:
      "A continuing-care campus with independent and assisted living. Listed on Haven for discovery — pricing confirmed after inquiry.",
    staffRatio: "1:7 daytime · 1:10 overnight",
    doctors: ["Dr. Nina Ortiz"],
    nurses: ["Carlos Mendez, RN"],
    therapists: ["Priya Das, Wellness"],
    amenities: ["Pool", "Auditorium", "Walking trails"],
    activities: ["Lectures", "Water aerobics", "Craft studio"],
    meals: ["Dining room", "Bistro", "Kosher-style options on request"],
    includedServices: ["Housekeeping", "Activities"],
    pricing: [],
    inspections: [
      {
        date: "Feb 2025",
        result: "Compliant",
        summary: "Standard compliance; limited public pricing disclosure.",
      },
    ],
    reviews: [
      {
        name: "Mark T.",
        relation: "Son",
        rating: 4,
        text: "Nice campus. We are still waiting on a detailed quote.",
      },
    ],
  },
];

export function getResidence(id: string) {
  return residences.find((r) => r.id === id);
}
