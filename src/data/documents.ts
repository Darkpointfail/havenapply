export type VaultDocument = {
  id: string;
  name: string;
  category: "Medical" | "Insurance" | "Identity" | "Assessments" | "Other";
  updated: string;
  size: string;
  expires: string | null;
  sharedWith: string[];
  versions: number;
};

export const documents: VaultDocument[] = [
  {
    id: "d1",
    name: "Medical history summary.pdf",
    category: "Medical",
    updated: "Apr 10, 2026",
    size: "1.2 MB",
    expires: null,
    sharedWith: ["Maple Grove", "Cedar Memory Care"],
    versions: 3,
  },
  {
    id: "d2",
    name: "Medication list.pdf",
    category: "Medical",
    updated: "Apr 12, 2026",
    size: "240 KB",
    expires: null,
    sharedWith: ["Maple Grove", "Lakeside Haven"],
    versions: 2,
  },
  {
    id: "d3",
    name: "Provincial health card.jpg",
    category: "Identity",
    updated: "Mar 1, 2026",
    size: "890 KB",
    expires: "Dec 2028",
    sharedWith: ["All applications"],
    versions: 1,
  },
  {
    id: "d4",
    name: "Insurance policy.pdf",
    category: "Insurance",
    updated: "Feb 18, 2026",
    size: "2.1 MB",
    expires: "Jan 2027",
    sharedWith: ["Maple Grove"],
    versions: 1,
  },
  {
    id: "d5",
    name: "Cognitive assessment.pdf",
    category: "Assessments",
    updated: "Mar 22, 2026",
    size: "640 KB",
    expires: "Mar 2027",
    sharedWith: ["Cedar Memory Care"],
    versions: 2,
  },
  {
    id: "d6",
    name: "Power of attorney.pdf",
    category: "Other",
    updated: "Jan 5, 2026",
    size: "1.8 MB",
    expires: null,
    sharedWith: [],
    versions: 1,
  },
];
