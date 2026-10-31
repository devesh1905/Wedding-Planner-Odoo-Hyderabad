// Package task templates. offsetDays is relative to the wedding's first day (negative = before).
// Generating a plan = copying these into Task rows with dueDate = startDate + offsetDays.

export type TemplateRow = { title: string; event: string; offsetDays: number; role?: "FOUNDER" | "PLANNER" };

export const EVENTS = ["VENUE", "DESIGN", "VENDORS", "MEHENDI", "HALDI", "SANGEET", "WEDDING", "RECEPTION", "WRAP_UP"] as const;

export const FULL_SERVICE: TemplateRow[] = [
  // Venue
  { title: "Shortlist 3 venues matching guest count & theme", event: "VENUE", offsetDays: -150 },
  { title: "Site visit with couple and family", event: "VENUE", offsetDays: -140 },
  { title: "Sign venue contract & pay venue deposit", event: "VENUE", offsetDays: -130, role: "FOUNDER" },
  { title: "Block guest room inventory at venue", event: "VENUE", offsetDays: -120 },
  // Design
  { title: "Finalise theme moodboard & colour palette", event: "DESIGN", offsetDays: -120 },
  { title: "Approve mandap and stage design", event: "DESIGN", offsetDays: -90 },
  { title: "Floor plan & seating layout for all events", event: "DESIGN", offsetDays: -60 },
  { title: "Invitation card design & print", event: "DESIGN", offsetDays: -75 },
  // Vendors
  { title: "Collect & compare caterer quotes", event: "VENDORS", offsetDays: -110 },
  { title: "Book decorator", event: "VENDORS", offsetDays: -100 },
  { title: "Book photographer & videographer", event: "VENDORS", offsetDays: -100 },
  { title: "Book DJ, dhol & live band", event: "VENDORS", offsetDays: -90 },
  { title: "Book makeup artists for bride & family", event: "VENDORS", offsetDays: -80 },
  { title: "Arrange guest transport & baraat horse", event: "VENDORS", offsetDays: -45 },
  { title: "Menu tasting with couple", event: "VENDORS", offsetDays: -40 },
  { title: "Confirm vendor arrival times & share run sheet", event: "VENDORS", offsetDays: -7 },
  // Guests
  { title: "Collect guest list & RSVPs", event: "VENUE", offsetDays: -45 },
  { title: "Room allocation & welcome hampers", event: "VENUE", offsetDays: -14 },
  // Events
  { title: "Mehendi: artists, seating & music confirmed", event: "MEHENDI", offsetDays: -10 },
  { title: "Mehendi: décor set-up & walkthrough", event: "MEHENDI", offsetDays: 0 },
  { title: "Haldi: flowers, colours & splash area ready", event: "HALDI", offsetDays: 1 },
  { title: "Sangeet: choreography rehearsal", event: "SANGEET", offsetDays: -5 },
  { title: "Sangeet: sound check & stage cues", event: "SANGEET", offsetDays: 1 },
  { title: "Wedding: rehearsal / practice run of pheras", event: "WEDDING", offsetDays: 1 },
  { title: "Wedding: pandit, samagri & mandap checklist", event: "WEDDING", offsetDays: 2 },
  { title: "Wedding: baraat route & timing with transport", event: "WEDDING", offsetDays: 2 },
  { title: "Reception: stage, buffet & photo booth ready", event: "RECEPTION", offsetDays: 2 },
  // Wrap-up
  { title: "Match vendor bills & extras", event: "WRAP_UP", offsetDays: 4 },
  { title: "Collect final payment from couple", event: "WRAP_UP", offsetDays: 7, role: "FOUNDER" },
  { title: "Settle remaining vendor balances", event: "WRAP_UP", offsetDays: 10, role: "FOUNDER" },
  { title: "Rate vendors & send thank-you to couple", event: "WRAP_UP", offsetDays: 12 },
];

export const PARTIAL: TemplateRow[] = [
  { title: "Kick-off call: collect existing vendor contacts", event: "VENDORS", offsetDays: -30 },
  { title: "Build minute-by-minute run sheet", event: "VENDORS", offsetDays: -20 },
  { title: "Confirm vendor arrival times & share run sheet", event: "VENDORS", offsetDays: -7 },
  { title: "Venue walkthrough with family", event: "VENUE", offsetDays: -3 },
  { title: "Mehendi: vendor check-in & family cues", event: "MEHENDI", offsetDays: 0 },
  { title: "Sangeet: sound check & stage cues", event: "SANGEET", offsetDays: 1 },
  { title: "Wedding: rehearsal / practice run", event: "WEDDING", offsetDays: 1 },
  { title: "Wedding: vendor check-in at gate", event: "WEDDING", offsetDays: 2 },
  { title: "Wedding: tell family when to move", event: "WEDDING", offsetDays: 2 },
  { title: "Reception: run sheet & send-off", event: "RECEPTION", offsetDays: 2 },
  { title: "Clear-up & vendor pack-out", event: "WRAP_UP", offsetDays: 3 },
  { title: "Collect final payment", event: "WRAP_UP", offsetDays: 7, role: "FOUNDER" },
];

export const PACKAGES = [
  {
    kind: "FULL_SERVICE" as const,
    name: "Full-Service Wedding",
    description:
      "Theme & design, venue booking, vendor sourcing, layout planning, guest tracking, rehearsal and on-the-day crisis handling.",
    basePrice: 35_00_000, // ₹35 L
    templates: FULL_SERVICE,
  },
  {
    kind: "PARTIAL" as const,
    name: "Partial / Day-of",
    description: "Day schedule management, vendor check-in, family cues and clear-up after the event.",
    basePrice: 8_00_000, // ₹8 L
    templates: PARTIAL,
  },
];
