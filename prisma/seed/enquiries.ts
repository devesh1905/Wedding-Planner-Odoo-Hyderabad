import { randomBytes } from "node:crypto";
import type { PrismaClient, EnquiryStatus, EnquirySource } from "@prisma/client";
import { renderAgreement } from "../../src/lib/agreement";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

type Seed = {
  p1: string;
  p2: string;
  phone: string;
  email?: string;
  source: EnquirySource;
  date: string; // YYYY-MM-DD
  guests: number;
  theme: string;
  budget: number; // rupees
  city: string;
  notes?: string;
  status: EnquiryStatus;
  createdDaysAgo: number;
  lostReason?: string;
  meetingInDays?: number;
  overdue?: boolean;
};

const SEEDS: Seed[] = [
  // NEW x4
  { p1: "Aarohi Kapoor", p2: "Vihaan Malhotra", phone: "9810045521", email: "aarohi.kapoor@example.com", source: "WEB_FORM", date: "2027-02-12", guests: 350, theme: "Royal Heritage", budget: 15000000, city: "Jaipur", notes: "Wants a palace venue with a grand baraat entry.", status: "NEW", createdDaysAgo: 3, overdue: true },
  { p1: "Diya Agarwal", p2: "Rohan Bansal", phone: "9928817734", source: "INSTAGRAM", date: "2027-01-24", guests: 220, theme: "Pastel Garden", budget: 7500000, city: "Udaipur", notes: "Found us via a reel. Prefers a lakeside garden ceremony.", status: "NEW", createdDaysAgo: 1 },
  { p1: "Meera Joshi", p2: "Karan Purohit", phone: "9414203318", email: "meera.joshi@example.com", source: "PHONE", date: "2026-12-18", guests: 180, theme: "Desert Boho", budget: 4500000, city: "Jodhpur", status: "NEW", createdDaysAgo: 0 },
  { p1: "Sanya Khanna", p2: "Arjun Tandon", phone: "7042266190", source: "WHATSAPP", date: "2027-03-06", guests: 500, theme: "Modern Minimal", budget: 22000000, city: "Jaipur", notes: "Two-day affair; sangeet at a separate venue.", status: "NEW", createdDaysAgo: 2 },
  // CONTACTED x3
  { p1: "Kavya Rathore", p2: "Siddharth Chauhan", phone: "9602518847", email: "kavya.r@example.com", source: "REFERRAL", date: "2027-02-20", guests: 400, theme: "Royal Heritage", budget: 30000000, city: "Udaipur", notes: "Referred by a past client. Budget is flexible for the right venue.", status: "CONTACTED", createdDaysAgo: 6 },
  { p1: "Ishani Gupta", p2: "Nikhil Saxena", phone: "8239914406", source: "INSTAGRAM", date: "2027-01-10", guests: 160, theme: "Beach Chic", budget: 6000000, city: "Jaipur", notes: "Wants a tropical feel with white and teal tones.", status: "CONTACTED", createdDaysAgo: 8 },
  { p1: "Tanvi Shekhawat", p2: "Pranav Mehra", phone: "9784432065", email: "tanvi.s@example.com", source: "WEB_FORM", date: "2026-12-30", guests: 280, theme: "Pastel Garden", budget: 11000000, city: "Jodhpur", status: "CONTACTED", createdDaysAgo: 5 },
  // MEETING_BOOKED x2
  { p1: "Riya Oberoi", p2: "Aditya Sethi", phone: "9873350912", email: "riya.oberoi@example.com", source: "PHONE", date: "2027-02-05", guests: 600, theme: "Royal Heritage", budget: 30000000, city: "Udaipur", notes: "Large guest list, many outstation relatives needing stays.", status: "MEETING_BOOKED", createdDaysAgo: 10, meetingInDays: 2 },
  { p1: "Naina Bhatia", p2: "Kunal Deshmukh", phone: "9166027713", source: "WHATSAPP", date: "2027-03-14", guests: 250, theme: "Modern Minimal", budget: 9000000, city: "Jaipur", status: "MEETING_BOOKED", createdDaysAgo: 7, meetingInDays: 4 },
  // AGREEMENT_SENT x2
  { p1: "Pooja Rajput", p2: "Harsh Vardhan", phone: "9549081276", email: "pooja.rajput@example.com", source: "REFERRAL", date: "2027-01-31", guests: 450, theme: "Desert Boho", budget: 18000000, city: "Jodhpur", notes: "Met twice; keen on a fort venue with a sunset ceremony.", status: "AGREEMENT_SENT", createdDaysAgo: 16 },
  { p1: "Simran Walia", p2: "Dev Sachdeva", phone: "9953716640", source: "WEB_FORM", date: "2027-02-27", guests: 320, theme: "Beach Chic", budget: 12500000, city: "Udaipur", status: "AGREEMENT_SENT", createdDaysAgo: 14 },
  // SIGNED x1
  { p1: "Anushka Menon", p2: "Raghav Kulkarni", phone: "9001348852", email: "anushka.menon@example.com", source: "REFERRAL", date: "2026-12-12", guests: 380, theme: "Royal Heritage", budget: 25000000, city: "Jaipur", notes: "Signed and ready for booking payment.", status: "SIGNED", createdDaysAgo: 24 },
  // LOST x2
  { p1: "Zoya Siddiqui", p2: "Imran Qureshi", phone: "8561029374", source: "INSTAGRAM", date: "2027-01-17", guests: 150, theme: "Pastel Garden", budget: 4000000, city: "Udaipur", status: "LOST", createdDaysAgo: 20, lostReason: "Budget too low for the venue they wanted" },
  { p1: "Preeti Solanki", p2: "Manav Trivedi", phone: "9460581129", source: "PHONE", date: "2027-03-02", guests: 200, theme: "Modern Minimal", budget: 8000000, city: "Jodhpur", status: "LOST", createdDaysAgo: 18, lostReason: "Went with another planner" },
];

const FLOW: EnquiryStatus[] = ["NEW", "CONTACTED", "MEETING_BOOKED", "AGREEMENT_SENT", "SIGNED"];

export async function seedEnquiries(db: PrismaClient) {
  const planners = await db.user.findMany({ where: { role: "PLANNER" }, orderBy: { email: "asc" } });
  const actorId = planners[0]?.id ?? null;
  const now = Date.now();

  // Idempotent clean-up: only enquiries matching the seed phone numbers.
  const phones = SEEDS.map((s) => s.phone);
  const existing = await db.enquiry.findMany({ where: { phone: { in: phones } }, select: { id: true } });
  if (existing.length) {
    const ids = existing.map((e) => e.id);
    await db.activityLog.deleteMany({ where: { entity: "enquiry", entityId: { in: ids } } });
    await db.enquiry.deleteMany({ where: { id: { in: ids } } });
  }

  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    const assignedToId = planners.length ? planners[i % planners.length].id : null;
    const createdAt = new Date(now - s.createdDaysAgo * DAY);
    const updatedAt = s.overdue ? createdAt : new Date(now - Math.max(0, s.createdDaysAgo - 1) * DAY);

    let nextFollowUp: Date | null = null;
    if (s.overdue) nextFollowUp = new Date(now - 1 * DAY);
    else if (s.status === "NEW" || s.status === "CONTACTED") nextFollowUp = new Date(now + (2 + (i % 3)) * DAY);

    const enquiry = await db.enquiry.create({
      data: {
        partner1: s.p1,
        partner2: s.p2,
        phone: s.phone,
        email: s.email ?? null,
        source: s.source,
        roughDate: new Date(`${s.date}T00:00:00.000Z`),
        guestCount: s.guests,
        theme: s.theme,
        maxBudget: s.budget,
        city: s.city,
        notes: s.notes ?? null,
        status: s.status,
        lostReason: s.lostReason ?? null,
        nextFollowUp,
        assignedToId,
        createdAt,
        updatedAt,
      },
    });

    const logs: { action: string; payload: object; at: Date }[] = [
      { action: "created", payload: { source: s.source }, at: createdAt },
    ];

    // Walk the status path so the timeline reads naturally.
    const path: EnquiryStatus[] = s.status === "LOST" ? ["NEW", "CONTACTED"] : FLOW.slice(0, FLOW.indexOf(s.status) + 1);
    const span = Math.max(1, s.createdDaysAgo) * DAY;
    for (let k = 1; k < path.length; k++) {
      const at = new Date(createdAt.getTime() + (span * k) / (path.length + 1));
      logs.push({ action: "status", payload: { from: path[k - 1], to: path[k] }, at });
      if (path[k] === "MEETING_BOOKED" && s.meetingInDays != null) {
        logs.push({ action: "meeting", payload: { at: new Date(now + s.meetingInDays * DAY).toISOString() }, at: new Date(at.getTime() + HOUR) });
      }
    }
    if (s.status === "LOST") {
      logs.push({ action: "status", payload: { from: "CONTACTED", to: "LOST" }, at: new Date(now - 2 * DAY) });
    }

    if (s.meetingInDays != null) {
      await db.meeting.create({
        data: {
          enquiryId: enquiry.id,
          scheduledAt: new Date(now + s.meetingInDays * DAY + 11 * HOUR),
          location: s.city === "Udaipur" ? "Studio, Fateh Sagar Road" : "The Royal Knot office, C-Scheme",
          notes: "Discuss venue shortlist, budget split and timeline.",
        },
      });
    }

    if (s.status === "AGREEMENT_SENT" || s.status === "SIGNED") {
      const sentAt = new Date(now - 1 * DAY);
      const signed = s.status === "SIGNED";
      const signedAt = new Date(now - 6 * HOUR);
      await db.agreement.create({
        data: {
          enquiryId: enquiry.id,
          token: randomBytes(18).toString("base64url"),
          body: renderAgreement({
            partner1: s.p1,
            partner2: s.p2,
            phone: s.phone,
            roughDate: enquiry.roughDate,
            guestCount: s.guests,
            theme: s.theme,
            city: s.city,
            maxBudget: s.budget,
          }),
          status: signed ? "SIGNED" : "SENT",
          sentAt,
          signedAt: signed ? signedAt : null,
          signerName: signed ? s.p1 : null,
          signatureUrl: signed ? PNG_1X1 : null,
          signerIp: signed ? "203.0.113.24" : null,
        },
      });
      logs.push({ action: "agreement_sent", payload: {}, at: sentAt });
      if (signed) logs.push({ action: "agreement_signed", payload: { by: s.p1 }, at: signedAt });
    }

    logs.sort((a, b) => a.at.getTime() - b.at.getTime());
    await db.activityLog.createMany({
      data: logs.map((l) => ({
        actorId,
        entity: "enquiry",
        entityId: enquiry.id,
        action: l.action,
        payload: l.payload,
        createdAt: l.at,
      })),
    });
  }

  console.log(`Seeded ${SEEDS.length} enquiries`);
}
