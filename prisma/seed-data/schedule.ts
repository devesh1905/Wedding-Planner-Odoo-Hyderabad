import { demoWeddingId } from "./weddings";
import { seedId, type VendorCategory } from "./types";
export type EventName = "Mehendi" | "Sangeet" | "Wedding" | "Reception";
export type ScheduleSeed = { id: string; weddingId: string; eventId: string; event: EventName; startTime: string; title: string; status: "UPCOMING"; responsibleRole: "PLANNER" | "VENUE_LEAD" | "HOSPITALITY_LEAD"; vendorCategory: VendorCategory; notes: string };
export const weddingEvents = ([
  ["Mehendi", "2026-11-15T10:00:00+05:30"], ["Sangeet", "2026-11-15T17:00:00+05:30"],
  ["Wedding", "2026-11-16T09:00:00+05:30"], ["Reception", "2026-11-17T16:00:00+05:30"],
] as const).map(([name, startTime], index) => ({ id: seedId(3, index + 1), weddingId: demoWeddingId, name, startTime, venue: "City Palace Udaipur" }));
const opening: [string, VendorCategory][] = [["Venue handover", "TENT"], ["Power and backup generator check", "LIGHTING"], ["Floral installation inspection", "FLORIST"], ["Sound line check", "DJ"], ["Catering hygiene and menu check", "CATERER"], ["Transport dispatch confirmation", "TRANSPORT"], ["Photography briefing", "PHOTOGRAPHER"], ["Bridal styling call", "MAKEUP"], ["Guest welcome desk opens", "DECORATOR"], ["Family arrival and seating", "TRANSPORT"]];
const main: Record<EventName, [string, VendorCategory][]> = {
  Mehendi: [["Henna artists arrive", "MAKEUP"], ["Bride enters floral courtyard", "FLORIST"], ["Henna ceremony begins", "MAKEUP"], ["Folk music begins", "DHOL"], ["Family portraits", "PHOTOGRAPHER"], ["Regional snack counters open", "CATERER"], ["Couple mehendi portraits", "PHOTOGRAPHER"], ["Family games", "DJ"], ["Tea and refreshments", "CATERER"], ["Sunset courtyard photographs", "PHOTOGRAPHER"]],
  Sangeet: [["Dance rehearsal check", "DJ"], ["Groom family welcome", "DHOL"], ["Couple grand entrance", "LIGHTING"], ["Welcome speech", "DJ"], ["Bride family performance", "DJ"], ["Groom family performance", "DJ"], ["Couple dance", "LIGHTING"], ["Live food counters open", "CATERER"], ["Family dance floor opens", "DJ"], ["Dessert service", "CATERER"]],
  Wedding: [["Groom leaves hotel", "TRANSPORT"], ["Baraat assembly", "DHOL"], ["Groom arrival", "DHOL"], ["Milni family welcome", "PHOTOGRAPHER"], ["Bride entry", "FLORIST"], ["Garland exchange", "FLORIST"], ["Mandap seating", "DECORATOR"], ["Wedding vows and pheras", "PHOTOGRAPHER"], ["Blessings and family portraits", "PHOTOGRAPHER"], ["Wedding banquet opens", "CATERER"]],
  Reception: [["Couple styling complete", "MAKEUP"], ["Guest shuttle arrival", "TRANSPORT"], ["Welcome drinks served", "CATERER"], ["Couple stage entrance", "LIGHTING"], ["Formal family portraits", "PHOTOGRAPHER"], ["Welcome toast", "DJ"], ["Dinner service opens", "CATERER"], ["Cake ceremony", "CATERER"], ["Dance floor opens", "DJ"], ["Dessert and coffee service", "CATERER"]],
};
const closing: [string, VendorCategory][] = [["Dietary request check", "CATERER"], ["Guest comfort and water round", "CATERER"], ["Family transport confirmation", "TRANSPORT"], ["Final guest photographs", "PHOTOGRAPHER"], ["Last food counter call", "CATERER"], ["Guest shuttle boarding", "TRANSPORT"], ["Equipment inventory", "LIGHTING"], ["Vendor checkout", "TENT"], ["Venue cleanup inspection", "DECORATOR"], ["Planner handover and issue review", "DECORATOR"]];
export const schedule: ScheduleSeed[] = weddingEvents.flatMap((event, eventIndex) => [...opening, ...main[event.name], ...closing].map(([title, vendorCategory], index) => ({
  id: seedId(4, eventIndex * 30 + index + 1), weddingId: demoWeddingId, eventId: event.id, event: event.name,
  startTime: new Date(new Date(event.startTime).getTime() + index * 12 * 60000).toISOString(), title,
  status: "UPCOMING", responsibleRole: index % 3 === 0 ? "VENUE_LEAD" : index % 3 === 1 ? "HOSPITALITY_LEAD" : "PLANNER",
  vendorCategory, notes: index === 1 ? "Confirm generator fuel and test backup supply before guests arrive." : "Confirm completion with the assigned lead.",
})));
