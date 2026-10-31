import { formatDate, formatINRCompact } from "./format";

/** Polite payment reminder, sent over WhatsApp with the couple's portal link appended. */
export function reminderText(name: string, label: string, amount: number, due: Date | string) {
  return `Namaste ${name}! A gentle reminder from The Royal Knot: your ${label.toLowerCase()} of ${formatINRCompact(amount)} was due on ${formatDate(due)}. You can see your full payment schedule here:`;
}
