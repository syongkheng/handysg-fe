import type { SgAddress } from "@/api/auth";
import type { CustomerJob, JobStatus, TimeSlot } from "@/api/jobs";
import type { PillTone } from "@/components";
import { TRADES, type TradeId } from "@/features/home/trades";

/** Matches the backend's TIME_SLOT_LABELS (backend/src/job/Job.ts). */
export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING: "9am – 12pm",
  AFTERNOON: "12pm – 3pm",
  EVENING: "3pm – 6pm",
};

const SG_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Singapore's calendar date as "YYYY-MM-DD", `days` from today. Singapore has no daylight saving. */
export function sgDate(days = 0, now: Date = new Date()): string {
  return new Date(now.getTime() + SG_OFFSET_MS + days * 86_400_000).toISOString().slice(0, 10);
}

/** "2026-11-26" → { weekday: "Thu", day: "26 Nov" } (or "Today" / "Tomorrow" as the weekday), for day chips. */
export function dayChip(date: string, now: Date = new Date()): { weekday: string; day: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = date === sgDate(0, now) ? "Today" : date === sgDate(1, now) ? "Tomorrow" : WEEKDAYS[d.getUTCDay()];
  return { weekday, day: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` };
}

/** "2026-11-23" → "Tomorrow", "Today", or "Mon 23 Nov". */
export function dayLabel(date: string, now: Date = new Date()): string {
  if (date === sgDate(0, now)) return "Today";
  if (date === sgDate(1, now)) return "Tomorrow";
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-11-22T11:48:07.749+08:00" (Singapore time from the API) → "22 Nov 2026, 11:48am". */
export function formatPostedAt(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, h, mi] = m;
  const hour = Number(h);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}, ${h12}:${mi}${hour < 12 ? "am" : "pm"}`;
}

/** The job timeline's steps, and how far a job with this status has got (index of the current step). */
export const JOB_STEPS = ["Posted", "Accepted", "Quote approved", "Done"] as const;
export function jobStepIndex(status: JobStatus): number {
  switch (status) {
    case "OPEN":
    case "CANCELLED":
      return 0;
    case "ACCEPTED":
    case "QUOTED":
      return 1;
    case "IN_PROGRESS":
      return 2;
    case "COMPLETED":
      return 3;
  }
}

/** 100 → "S$1.00", 3050 → "S$30.50". */
export function formatFee(cents: number): string {
  return `S$${(cents / 100).toFixed(2)}`;
}

export function tradeName(id: TradeId): string {
  return TRADES.find((t) => t.id === id)?.name ?? id;
}

/** "Urgent · now" or "Tomorrow, 9am – 12pm". */
export function whenLabel(job: Pick<CustomerJob, "urgency" | "scheduledDate" | "timeSlot">, now: Date = new Date()): string {
  if (job.urgency === "URGENT") return "Urgent · now";
  const day = job.scheduledDate ? dayLabel(job.scheduledDate, now) : "Scheduled";
  return job.timeSlot ? `${day}, ${TIME_SLOT_LABELS[job.timeSlot]}` : day;
}

/** The job's first line, shortened, as its title in lists. */
export function jobTitle(description: string, max = 60): string {
  const first = description.trim().split("\n")[0].trim();
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** "406 Ang Mo Kio Avenue 10, #05-123". */
export function formatAddress(a: SgAddress): string {
  const unit = a.floor && a.unit ? `, #${a.floor}-${a.unit}` : "";
  return `${a.line1}${unit}`;
}

/** The status pill's words and tone. Words always, so colour is never the only signal. */
export function jobStatusPill(status: JobStatus, trade: TradeId): { label: string; tone: PillTone } {
  switch (status) {
    case "OPEN":
      return { label: `Finding ${TRADES.find((t) => t.id === trade)?.withArticle ?? "a technician"}`, tone: "info" };
    case "ACCEPTED":
      return { label: "Accepted", tone: "info" };
    case "QUOTED":
      return { label: "Quote to approve", tone: "warning" };
    case "IN_PROGRESS":
      return { label: "In progress", tone: "info" };
    case "COMPLETED":
      return { label: "Done", tone: "success" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "neutral" };
  }
}
