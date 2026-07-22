export const medicalProfile = {
  completeness: 82,
  person: {
    name: "Paul Gilbert",
    age: 78,
    preferredName: "Paul",
    relationship: "Father",
  },
  sections: [
    {
      id: "general",
      title: "General health",
      summary: "Generally stable · Hypertension managed",
      items: ["Blood type: A+", "Primary physician: Dr. Amélie Caron", "Height/weight on file"],
    },
    {
      id: "conditions",
      title: "Conditions",
      summary: "3 conditions recorded",
      items: ["Mild cognitive impairment", "Hypertension", "Osteoarthritis (knees)"],
    },
    {
      id: "medications",
      title: "Medications",
      summary: "4 active medications",
      items: ["Amlodipine 5mg, morning", "Donepezil 5mg, evening", "Vitamin D 1000 IU", "Acetaminophen as needed"],
    },
    {
      id: "allergies",
      title: "Allergies",
      summary: "1 allergy",
      items: ["Penicillin, rash"],
    },
    {
      id: "vaccinations",
      title: "Vaccinations",
      summary: "Up to date for 2025–26",
      items: ["Influenza, Oct 2025", "COVID booster, Nov 2025", "Pneumococcal, 2023"],
    },
    {
      id: "mobility",
      title: "Mobility",
      summary: "Walker for longer distances",
      items: ["Walks short distances independently", "Uses walker outdoors", "No recent falls (6 months)"],
    },
    {
      id: "cognitive",
      title: "Cognitive assessment",
      summary: "Mild impairment · Needs gentle reminders",
      items: ["Orientation: mostly intact", "Short-term memory: mild difficulty", "Safety awareness: good with cues"],
    },
    {
      id: "care",
      title: "Care requirements",
      summary: "Assistance with meds & bathing",
      items: ["Medication supervision", "Bathing assistance 3× week", "Meal preparation support"],
    },
    {
      id: "documents",
      title: "Medical documents",
      summary: "5 documents in vault",
      items: ["History summary", "Medication list", "Cognitive assessment"],
    },
    {
      id: "insurance",
      title: "Insurance",
      summary: "Provincial + private top-up",
      items: ["RAMQ active", "Private long-term care rider"],
    },
    {
      id: "emergency",
      title: "Emergency contacts",
      summary: "2 contacts",
      items: ["Alex Martin, Son, Primary", "Sophie Martin, Daughter, Secondary"],
    },
  ],
};
