// "Build your own package": the catalogue a couple picks from on the enquiry form, and the
// indicative estimate shown beside it. Pure functions, used by the browser (live preview) and the
// server (which recomputes the saved estimate, so a client-sent number is never trusted).

import type { IconName } from "@/frontend/components/icons/icon";

export type ServiceKey =
  | "venue"
  | "decor"
  | "catering"
  | "photo"
  | "mehendi"
  | "makeup"
  | "music"
  | "choreo"
  | "hospitality"
  | "invites";

export const SERVICES: readonly { key: ServiceKey; label: string; description: string; icon: IconName }[] = [
  { key: "venue", label: "Venue sourcing", description: "Shortlist, visit and negotiate the right venues", icon: "pin" },
  { key: "decor", label: "Decor & florals", description: "Mandaps, stages, entrances and flowers", icon: "palette" },
  { key: "catering", label: "Catering", description: "Menus, tastings and live counters for every event", icon: "event" },
  { key: "photo", label: "Photography & film", description: "Candid photos, cinematic film and a teaser", icon: "star" },
  { key: "mehendi", label: "Mehendi artist", description: "Bridal and family mehendi artists", icon: "heart" },
  { key: "makeup", label: "Bridal & family makeup", description: "Makeup and hair for the bride and family", icon: "user" },
  { key: "music", label: "Music", description: "DJ, live band or dhol for each function", icon: "chat" },
  { key: "choreo", label: "Sangeet choreography", description: "Rehearsed family and couple performances", icon: "confetti" },
  { key: "hospitality", label: "Guest hospitality & travel", description: "Stays, transfers and a welcome desk", icon: "guests" },
  { key: "invites", label: "Invitations & stationery", description: "Cards, digital invites and signage", icon: "mail" },
];

export const SERVICE_KEYS = SERVICES.map((s) => s.key) as [ServiceKey, ...ServiceKey[]];

export const EVENTS = ["Mehendi", "Haldi", "Sangeet", "Wedding", "Reception"] as const;
export type EventKey = (typeof EVENTS)[number];
export const EVENT_LABELS: Record<EventKey, string> = {
  Mehendi: "Mehendi",
  Haldi: "Haldi",
  Sangeet: "Sangeet",
  Wedding: "Wedding (pheras)",
  Reception: "Reception",
};

export const PLANNING = [
  { key: "FULL", label: "Full planning", description: "We run everything from first call to final payment." },
  { key: "DAY_OF", label: "Day-of coordination", description: "You've booked vendors, we run the days." },
] as const;
export type PlanningKey = (typeof PLANNING)[number]["key"];
export const PLANNING_KEYS = ["FULL", "DAY_OF"] as const;

export const DEFAULT_PACKAGE = {
  planning: "FULL" as PlanningKey,
  events: ["Sangeet", "Wedding", "Reception"] as EventKey[],
  services: ["catering", "decor", "photo"] as ServiceKey[],
};

export const PREVIEW_GUESTS = 300;

// ---- Estimate -------------------------------------------------------------------------------
// All amounts are whole rupees.
//  1. Per guest, per event (scales with the number of events ticked):
//       catering 1,800 · decor & florals 1,300
//  2. Per guest (once):
//       venue sourcing fee 2,000 · hospitality & travel 3,500 · invitations 450
//  3. Fixed:
//       photo & film 9,00,000 · mehendi artist 1,50,000 · makeup 2,00,000
//       music 3,50,000 · choreography 1,20,000
//  subtotal = sum of the ticked services.
//  4. Planning fee: FULL = 12% of the subtotal; DAY_OF = flat 8,00,000 (the Partial / Day-of
//     package base price).
//  5. Range = result -/+ 12%, each end rounded to the nearest 50,000.
const PER_GUEST_PER_EVENT: Partial<Record<ServiceKey, number>> = { catering: 1800, decor: 1300 };
const PER_GUEST: Partial<Record<ServiceKey, number>> = { venue: 2000, hospitality: 3500, invites: 450 };
const FIXED: Partial<Record<ServiceKey, number>> = {
  photo: 9_00_000,
  mehendi: 1_50_000,
  makeup: 2_00_000,
  music: 3_50_000,
  choreo: 1_20_000,
};
const FULL_FEE_RATE = 0.12;
const DAY_OF_FEE = 8_00_000;
const SPREAD = 0.12;
const ROUND_TO = 50_000;

export type PackageEstimate = {
  low: number;
  high: number;
  /** Guest count the figures are for. */
  guests: number;
  /** True when the couple left guests empty and we used the 300-guest preview. */
  assumedGuests: boolean;
};

export function estimate(input: {
  guests?: number | null;
  services: readonly string[];
  events: readonly string[];
  planning?: string | null;
}): PackageEstimate {
  const assumedGuests = !input.guests || input.guests < 1;
  const guests = assumedGuests ? PREVIEW_GUESTS : Math.round(input.guests as number);
  const eventCount = Math.max(1, input.events.length);

  let subtotal = 0;
  for (const s of new Set(input.services)) {
    const k = s as ServiceKey;
    subtotal += (PER_GUEST_PER_EVENT[k] ?? 0) * guests * eventCount;
    subtotal += (PER_GUEST[k] ?? 0) * guests;
    subtotal += FIXED[k] ?? 0;
  }

  const fee = input.planning === "DAY_OF" ? DAY_OF_FEE : Math.round(subtotal * FULL_FEE_RATE);
  const total = subtotal + fee;
  const round = (n: number) => Math.round(n / ROUND_TO) * ROUND_TO;
  return { low: round(total * (1 - SPREAD)), high: round(total * (1 + SPREAD)), guests, assumedGuests };
}

export const serviceByKey = (key: string) => SERVICES.find((s) => s.key === key);
