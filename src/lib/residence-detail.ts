import type { Residence } from "@/data/residences";
import { getResidence } from "@/data/residences";

export type CareServiceBlock = {
  title: string;
  available: boolean;
  detail: string;
};

export type RoomPricing = {
  name: string;
  type: "Private" | "Shared" | "Suite";
  sqft: number | null;
  basePrice: number | null;
  communityFee: number | null;
  careFee: number | null;
  deposit: number | null;
  estimated: boolean;
  included: string[];
  extras: string[];
  notes: string;
};

export type AvailabilityDetail = {
  status: "available" | "limited" | "waitlist" | "unknown";
  label: string;
  estimatedMoveIn: string | null;
  contactNote: string;
};

export type AmenityGroup = {
  title: string;
  items: string[];
};

export type AdmissionInfo = {
  documents: string[];
  acceptedConditions: string[];
  notAccepted: string[];
  assessmentRequired: string;
  financialPolicy: string;
  residencyCriteria: string[];
};

export type ReviewCategory = { label: string; score: number };

export type CommunityReview = {
  name: string;
  relation: string;
  rating: number;
  text: string;
  date: string;
  categories?: ReviewCategory[];
  communityResponse?: string;
};

export type NearbyPlace = { name: string; distance: string; type: string };

export type TourSlot = { id: string; label: string; when: string };

export type CommunityDetail = Residence & {
  streetAddress: string;
  communityType: string;
  philosophy: string;
  yearOpened: number;
  capacity: number;
  licenses: string[];
  careServices: CareServiceBlock[];
  rooms: RoomPricing[];
  pricingNote: string | null;
  availabilityDetail: AvailabilityDetail;
  amenityGroups: AmenityGroup[];
  admission: AdmissionInfo;
  reviewCategories: ReviewCategory[];
  detailedReviews: CommunityReview[];
  nearbyHospitals: NearbyPlace[];
  nearbyPharmacies: NearbyPlace[];
  nearbyServices: NearbyPlace[];
  familyDistanceNote: string;
  tourSlots: TourSlot[];
  phone: string;
  email: string;
};

function roomsFromPricing(r: Residence): RoomPricing[] {
  if (!r.pricing.length) {
    return [
      {
        name: "Private suite",
        type: "Private",
        sqft: null,
        basePrice: null,
        communityFee: null,
        careFee: null,
        deposit: null,
        estimated: true,
        included: r.includedServices.slice(0, 4),
        extras: ["Premium dining package", "Private duty aide hours"],
        notes: "Request a personalized quote from the community.",
      },
    ];
  }
  return r.pricing.map((p, i) => ({
    name: p.room,
    type: p.room.toLowerCase().includes("shared")
      ? "Shared"
      : p.room.toLowerCase().includes("suite")
        ? "Suite"
        : "Private",
    sqft: [380, 320, 280, 420][i % 4],
    basePrice: p.price,
    communityFee: Math.round(p.price * 0.08),
    careFee: Math.round(p.price * 0.12),
    deposit: Math.round(p.price * 0.5),
    estimated: !r.priceAvailable,
    included: r.includedServices,
    extras: ["Guest meals", "Beauty salon appointments", "Companion care hours"],
    notes: p.notes,
  }));
}

function availabilityFrom(r: Residence): AvailabilityDetail {
  if (r.availableNow && r.availabilityConfirmed) {
    return {
      status: "available",
      label: "Available now",
      estimatedMoveIn: "As soon as assessment is complete",
      contactNote: "Contact the community to hold a suite or schedule a tour.",
    };
  }
  if (r.availableNow && !r.availabilityConfirmed) {
    return {
      status: "limited",
      label: "Limited / unconfirmed availability",
      estimatedMoveIn: "Confirm with admissions",
      contactNote: "Listings may change — message admissions to verify before applying.",
    };
  }
  if (r.waitingWeeks) {
    return {
      status: "waitlist",
      label: "Waitlist",
      estimatedMoveIn: `~${r.waitingWeeks} weeks (estimate)`,
      contactNote: "Join the waitlist and request updates via Haven messaging.",
    };
  }
  return {
    status: "unknown",
    label: "Ask the community",
    estimatedMoveIn: null,
    contactNote: "Availability is not published — request a call or tour to learn more.",
  };
}

function defaultCareServices(r: Residence): CareServiceBlock[] {
  const hasMemory = r.careLevels.includes("Memory care") || r.secureMemoryCare;
  const hasNursing = r.careLevels.includes("Nursing care");
  const hasRehab = r.careLevels.includes("Rehabilitation");
  return [
    {
      title: "Daily living assistance",
      available: true,
      detail: "Help with bathing, dressing, grooming, and mealtime support as needed.",
    },
    {
      title: "Medication management",
      available: r.medicalServices.some((m) => m.toLowerCase().includes("medicat")),
      detail: "Scheduled reminders, administration, and pharmacy coordination.",
    },
    {
      title: "Nursing care",
      available: hasNursing || r.medicalServices.some((m) => m.toLowerCase().includes("nurs")),
      detail: hasNursing
        ? "Skilled nursing coverage with clinical oversight."
        : "On-site or on-call nursing depending on care level.",
    },
    {
      title: "Memory care",
      available: hasMemory,
      detail: hasMemory
        ? "Secure environment, trained staff, and structured dementia programming."
        : "Not a dedicated memory-care program — ask about cognitive support options.",
    },
    {
      title: "Therapies",
      available: r.therapists.length > 0 || hasRehab,
      detail: r.therapists.length
        ? `On-site team includes: ${r.therapists.join(", ")}.`
        : "Therapy coordinated with visiting clinicians.",
    },
    {
      title: "Diabetes management",
      available: hasNursing || r.medicalServices.length >= 2,
      detail: "Blood-sugar monitoring support and dietary coordination when clinically appropriate.",
    },
    {
      title: "Mobility support",
      available: r.wheelchairAccessible,
      detail: r.wheelchairAccessible
        ? "Accessible pathways, transfer assistance, and mobility-equipment friendly rooms."
        : "Discuss mobility needs during assessment.",
    },
    {
      title: "Specialized medical care",
      available: r.medicalServices.length > 0,
      detail: r.medicalServices.join(" · ") || "Coordinate specialty visits as needed.",
    },
  ];
}

function defaultAmenityGroups(r: Residence): AmenityGroup[] {
  return [
    { title: "Dining", items: r.meals.length ? r.meals : ["Restaurant-style dining"] },
    {
      title: "Transport",
      items: r.transportAvailable
        ? ["Scheduled medical transport", "Local errands shuttle"]
        : ["Family-arranged transport"],
    },
    {
      title: "Garden & outdoors",
      items: r.amenities.filter((a) =>
        /garden|courtyard|terrace|path|trail|orchard|outdoor/i.test(a),
      ).length
        ? r.amenities.filter((a) =>
            /garden|courtyard|terrace|path|trail|orchard|outdoor/i.test(a),
          )
        : ["Outdoor seating"],
    },
    {
      title: "Fitness",
      items: r.amenities.some((a) => /fitness|rehab|gym|studio/i.test(a))
        ? r.amenities.filter((a) => /fitness|rehab|gym|studio/i.test(a))
        : ["Wellness classes"],
    },
    { title: "Activities", items: r.activities },
    {
      title: "Lounges",
      items: r.amenities.filter((a) => /lounge|library|café|cafe|piano|movie/i.test(a)).length
        ? r.amenities.filter((a) => /lounge|library|café|cafe|piano|movie/i.test(a))
        : ["Shared living rooms"],
    },
    {
      title: "Beauty & wellness",
      items: r.amenities.some((a) => /salon|hair|beauty/i.test(a))
        ? ["On-site salon / beauty services"]
        : ["Visiting beautician by appointment"],
    },
    {
      title: "Pets",
      items: r.petFriendly ? ["Pets accepted with policy"] : ["Pet visits by arrangement"],
    },
    {
      title: "Safety",
      items: [
        r.secureMemoryCare ? "Secure memory wing" : "24/7 staffed community",
        "Emergency response system",
      ],
    },
    {
      title: "Family spaces",
      items: r.amenities.filter((a) => /family|kitchen|visiting|overnight/i.test(a)).length
        ? r.amenities.filter((a) => /family|kitchen|visiting|overnight/i.test(a))
        : ["Visitor lounges"],
    },
  ];
}

function defaultAdmission(r: Residence): AdmissionInfo {
  return {
    documents: [
      "Government-issued ID",
      "Insurance / Medicare / Medicaid cards",
      "Recent physician summary or history & physical",
      "Medication list",
      "Power of attorney / healthcare proxy (if applicable)",
    ],
    acceptedConditions: [
      ...r.careLevels.map((c) => `${c} needs`),
      ...(r.wheelchairAccessible ? ["Mobility assistance & wheelchair use"] : []),
      ...(r.secureMemoryCare ? ["Mild to moderate dementia with wandering risk"] : []),
    ],
    notAccepted: [
      ...(hasComplexExclusion(r)
        ? ["Unstable ventilator dependence without clinical capacity"]
        : ["Conditions outside licensed care levels"]),
      "Behaviors that endanger others without an agreed care plan",
    ],
    assessmentRequired:
      "In-person or virtual clinical assessment with admissions nursing before move-in confirmation.",
    financialPolicy: r.acceptsMedicaid
      ? "Private pay and Medicaid pathways available — verify bed type and spend-down rules with admissions."
      : r.acceptsVeteransBenefits
        ? "Private pay primary; Veterans Benefits may offset costs when approved."
        : "Primarily private pay. Ask admissions about long-term care insurance and deposit policies.",
    residencyCriteria: [
      "Age and care-need fit for licensed community type",
      "Completed assessment and required documents",
      "Signed residency agreement and financial clearance",
      ...(r.partner ? ["Haven partner application accepted"] : ["Direct inquiry may be required (non-partner)"]),
    ],
  };
}

function hasComplexExclusion(r: Residence) {
  return !r.careLevels.includes("Nursing care");
}

function defaultReviews(r: Residence): CommunityReview[] {
  return r.reviews.map((rev, i) => ({
    ...rev,
    date: ["Mar 2026", "Jan 2026", "Nov 2025"][i % 3],
    categories: [
      { label: "Care quality", score: rev.rating },
      { label: "Staff", score: Math.min(5, rev.rating) },
      { label: "Cleanliness", score: Math.min(5, rev.rating - (i % 2 === 0 ? 0 : 0.2)) },
      { label: "Communication", score: Math.min(5, rev.rating - 0.1) },
    ].map((c) => ({ ...c, score: Math.round(c.score * 10) / 10 })),
    communityResponse:
      i === 0
        ? "Thank you for trusting our team. We are honored to support your family."
        : undefined,
  }));
}

const STREET: Record<string, string> = {
  "maple-grove": "4200 Shoal Creek Blvd",
  "lakeside-haven": "8810 Park Lane",
  "cedar-memory": "950 Memorial Dr",
  "sunrise-terrace": "210 Broadway St",
  "riverside-nursing": "1400 W 7th St",
  "orchard-house": "550 Palm Valley Blvd",
  "hillcrest-manor": "7800 N Lamar Blvd",
};

const OVERRIDES: Partial<Record<string, Partial<CommunityDetail>>> = {
  "maple-grove": {
    philosophy:
      "Dignity in the everyday — familiar routines, sunlight, and a neighborhood feel that keeps families close to the rhythm of home.",
    yearOpened: 2014,
    capacity: 86,
    licenses: ["Texas ALF license", "Memory care endorsement", "Life Safety Code compliant"],
    pricingNote: null,
  },
  "cedar-memory": {
    philosophy:
      "Purpose-built for memory: secure, sensory-rich spaces and staff trained for Alzheimer’s and related dementias.",
    yearOpened: 2018,
    capacity: 64,
    licenses: ["Texas ALF license", "Memory care specialty", "Dementia-trained staffing standard"],
  },
  "hillcrest-manor": {
    philosophy: "A continuing-care path from independence to assisted living on one campus.",
    yearOpened: 2009,
    capacity: 140,
    licenses: ["Texas ALF license", "CCRC disclosure on file"],
    pricingNote:
      "Published rates are unavailable. Treat any figures as estimates until the community provides a written quote.",
  },
  "lakeside-haven": {
    philosophy: "Recover strength, then live well — rehab-forward assisted living with lake-side calm.",
    yearOpened: 2016,
    capacity: 92,
  },
  "riverside-nursing": {
    philosophy: "Clinical excellence without losing the human touch for complex care needs.",
    yearOpened: 2005,
    capacity: 110,
    licenses: ["Texas nursing facility license", "Medicare / Medicaid certified"],
  },
};

export function buildCommunityDetail(r: Residence): CommunityDetail {
  const override = OVERRIDES[r.id] || {};
  const rooms = roomsFromPricing(r);
  const base: CommunityDetail = {
    ...r,
    streetAddress: STREET[r.id] || `100 Community Way`,
    communityType: r.careLevels.join(" · "),
    philosophy:
      "Person-centered care with transparent admissions and family partnership through Haven.",
    yearOpened: 2012,
    capacity: 80,
    licenses: ["State licensed community", "Fire & life-safety inspected"],
    careServices: defaultCareServices(r),
    rooms,
    pricingNote: r.priceAvailable
      ? "Base rates shown; care fees vary after assessment. Confirm totals in writing."
      : "Pricing is estimative / unavailable publicly — request a formal quote.",
    availabilityDetail: availabilityFrom(r),
    amenityGroups: defaultAmenityGroups(r),
    admission: defaultAdmission(r),
    reviewCategories: [
      { label: "Care quality", score: r.rating },
      { label: "Staff kindness", score: Math.min(5, r.rating + 0.05) },
      { label: "Cleanliness", score: Math.max(3.5, r.rating - 0.15) },
      { label: "Activities", score: Math.max(3.5, r.rating - 0.2) },
      { label: "Communication", score: Math.min(5, r.rating) },
    ].map((c) => ({ ...c, score: Math.round(Math.min(5, c.score) * 10) / 10 })),
    detailedReviews: defaultReviews(r),
    nearbyHospitals: [
      { name: `${r.city} Medical Center`, distance: "2.4 mi", type: "Hospital" },
      { name: "Regional Urgent Care", distance: "1.1 mi", type: "Urgent care" },
    ],
    nearbyPharmacies: [
      { name: "Community Pharmacy", distance: "0.6 mi", type: "Pharmacy" },
      { name: "HealthMart", distance: "1.3 mi", type: "Pharmacy" },
    ],
    nearbyServices: [
      { name: "Grocery & market", distance: "0.8 mi", type: "Errands" },
      { name: "Park / walking trail", distance: "0.4 mi", type: "Outdoors" },
      { name: "Place of worship", distance: "1.0 mi", type: "Community" },
    ],
    familyDistanceNote: `About ${r.distanceMiles} miles from the Haven demo search center — useful as a proxy for family visit distance.`,
    tourSlots: [
      { id: `${r.id}-t1`, label: "Weekday morning", when: "Tue · 10:00 AM" },
      { id: `${r.id}-t2`, label: "Weekday afternoon", when: "Wed · 2:30 PM" },
      { id: `${r.id}-t3`, label: "Weekend visit", when: "Sat · 11:00 AM" },
      { id: `${r.id}-t4`, label: "Virtual tour", when: "Thu · 4:00 PM (video)" },
    ],
    phone: "(512) 555-0140",
    email: `admissions@${r.id.replace(/-/g, "")}.example`,
  };

  return {
    ...base,
    ...override,
    careServices: override.careServices || base.careServices,
    rooms: override.rooms || base.rooms,
    amenityGroups: override.amenityGroups || base.amenityGroups,
    admission: override.admission || base.admission,
    detailedReviews: override.detailedReviews || base.detailedReviews,
  };
}

export function getCommunityDetail(id: string): CommunityDetail | undefined {
  const r = getResidence(id);
  if (!r) return undefined;
  return buildCommunityDetail(r);
}
