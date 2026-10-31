// Money is stored as integer paise everywhere; these helpers are the only place we convert.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,50,000 — Indian digit grouping. Pass paise. */
export function formatINR(paise: number | null | undefined, opts?: { precise?: boolean }) {
  if (paise == null) return "—";
  const rupees = paise / 100;
  return (opts?.precise ? inrPrecise : inr).format(rupees);
}

/** ₹2.4 Cr / ₹18.5 L / ₹45,000 — for dashboards and tight spaces. */
export function formatINRCompact(paise: number | null | undefined) {
  if (paise == null) return "—";
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)} L`;
  return `${sign}${inr.format(abs)}`;
}

function trim(n: number) {
  return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => paise / 100;

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** 14 Dec 2026 */
export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

/** 7:30 pm */
export function formatTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return timeFmt.format(new Date(d));
}

/** 14 Dec 2026, 7:30 pm */
export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return `${formatDate(d)}, ${formatTime(d)}`;
}

/** "in 3 days" / "2 days ago" / "today" */
export function relativeDays(d: Date | string) {
  const day = 86_400_000;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date(d)) - startOf(new Date())) / day);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function coupleName(p1: string, p2: string) {
  return `${p1} & ${p2}`;
}
