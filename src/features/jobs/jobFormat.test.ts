import type { SgAddress } from "@/api/auth";
import type { JobStatus } from "@/api/jobs";
import {
  dayChip,
  dayLabel,
  formatAddress,
  formatFee,
  formatPostedAt,
  formatWhen,
  JOB_STEPS,
  jobStageLabel,
  jobStatusPill,
  jobStatusTime,
  jobStepIndex,
  jobTitle,
  jobWaitingFor,
  sgDate,
  TIME_SLOT_LABELS,
  tradeName,
  whenLabel,
} from "./jobFormat";

// Monday 23 Nov 2026, 10:00 in Singapore (02:00 UTC).
const NOW = new Date("2026-11-23T02:00:00Z");

describe("sgDate", () => {
  it("returns Singapore's calendar date, not UTC's", () => {
    // 20:00 UTC on the 22nd is already 04:00 on the 23rd in Singapore.
    expect(sgDate(0, new Date("2026-11-22T20:00:00Z"))).toBe("2026-11-23");
    // 15:59 UTC is 23:59 Singapore, still the same day.
    expect(sgDate(0, new Date("2026-11-22T15:59:00Z"))).toBe("2026-11-22");
    expect(sgDate(0, new Date("2026-11-22T16:00:00Z"))).toBe("2026-11-23");
  });

  it("adds days, across month and year ends", () => {
    expect(sgDate(1, NOW)).toBe("2026-11-24");
    expect(sgDate(8, NOW)).toBe("2026-12-01");
    expect(sgDate(1, new Date("2026-12-31T02:00:00Z"))).toBe("2027-01-01");
    expect(sgDate(-1, NOW)).toBe("2026-11-22");
  });
});

describe("dayLabel and dayChip", () => {
  it("says Today and Tomorrow for the next two Singapore days", () => {
    expect(dayLabel("2026-11-23", NOW)).toBe("Today");
    expect(dayLabel("2026-11-24", NOW)).toBe("Tomorrow");
    expect(dayChip("2026-11-23", NOW)).toEqual({ weekday: "Today", day: "23 Nov" });
    expect(dayChip("2026-11-24", NOW)).toEqual({ weekday: "Tomorrow", day: "24 Nov" });
  });

  it("uses the weekday and short date for other days", () => {
    expect(dayLabel("2026-11-26", NOW)).toBe("Thu 26 Nov");
    expect(dayLabel("2027-01-01", NOW)).toBe("Fri 1 Jan");
    expect(dayChip("2026-11-26", NOW)).toEqual({ weekday: "Thu", day: "26 Nov" });
    expect(dayChip("2026-11-22", NOW)).toEqual({ weekday: "Sun", day: "22 Nov" });
  });
});

describe("formatPostedAt", () => {
  it.each([
    ["2026-11-22T11:48:07.749+08:00", "22 Nov 2026, 11:48am"],
    ["2026-11-22T00:05:00+08:00", "22 Nov 2026, 12:05am"],
    ["2026-11-22T12:00:00+08:00", "22 Nov 2026, 12:00pm"],
    ["2026-01-02T23:59:00+08:00", "2 Jan 2026, 11:59pm"],
  ])("%s → %s (as given, in Singapore time)", (iso, expected) => {
    expect(formatPostedAt(iso)).toBe(expected);
  });

  it("returns anything it can't parse unchanged", () => {
    expect(formatPostedAt("yesterday")).toBe("yesterday");
  });
});

describe("job timeline", () => {
  it("has four steps", () => {
    expect(JOB_STEPS).toEqual(["Posted", "Accepted", "Quote approved", "Done"]);
  });

  it.each<[JobStatus, number]>([
    ["OPEN", 0],
    ["CANCELLED", 0],
    ["ACCEPTED", 1],
    ["QUOTED", 1],
    ["IN_PROGRESS", 2],
    ["COMPLETED", 3],
  ])("%s is at step %i", (status, index) => {
    expect(jobStepIndex(status)).toBe(index);
  });
});

describe("formatFee", () => {
  it.each([
    [100, "S$1.00"],
    [3050, "S$30.50"],
    [0, "S$0.00"],
    [5, "S$0.05"],
    [123456, "S$1234.56"],
  ])("%i cents → %s", (cents, expected) => {
    expect(formatFee(cents)).toBe(expected);
  });
});

describe("tradeName", () => {
  it("names each trade", () => {
    expect(tradeName("PLUMBER")).toBe("Plumber");
    expect(tradeName("ELECTRICIAN")).toBe("Electrician");
    expect(tradeName("LOCKSMITH")).toBe("Locksmith");
  });
});

describe("whenLabel", () => {
  it("says 'Urgent · now' for urgent jobs, whatever else is set", () => {
    expect(whenLabel({ urgency: "URGENT", scheduledDate: "2026-11-24", timeSlot: "MORNING" }, NOW)).toBe("Urgent · now");
  });

  it("joins the day and the time window", () => {
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: "2026-11-24", timeSlot: "MORNING" }, NOW)).toBe("Tomorrow, 9am – 12pm");
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: "2026-11-23", timeSlot: "EVENING" }, NOW)).toBe("Today, 3pm – 6pm");
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: "2026-11-26", timeSlot: "AFTERNOON" }, NOW)).toBe("Thu 26 Nov, 12pm – 3pm");
  });

  it("copes with a missing day or window", () => {
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: null, timeSlot: null }, NOW)).toBe("Scheduled");
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: "2026-11-26", timeSlot: null }, NOW)).toBe("Thu 26 Nov");
    expect(whenLabel({ urgency: "SCHEDULED", scheduledDate: null, timeSlot: "MORNING" }, NOW)).toBe("Scheduled, 9am – 12pm");
  });

  it("uses the same window labels as the backend", () => {
    expect(TIME_SLOT_LABELS).toEqual({ MORNING: "9am – 12pm", AFTERNOON: "12pm – 3pm", EVENING: "3pm – 6pm" });
  });
});

describe("jobTitle", () => {
  it("uses the first line, trimmed", () => {
    expect(jobTitle("  Leaking pipe.  \nIt drips all day.")).toBe("Leaking pipe.");
  });

  it("keeps a line of exactly max characters, and shortens a longer one with an ellipsis", () => {
    const sixty = "a".repeat(60);
    expect(jobTitle(sixty)).toBe(sixty);
    const long = `${"a".repeat(55)} bbbbbbbbbb`;
    const title = jobTitle(long);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(jobTitle("The tap in the kitchen", 10)).toBe("The tap i…");
    expect(jobTitle("The tap  in the kitchen", 9)).toBe("The tap…");
  });
});

describe("formatAddress", () => {
  const base: SgAddress = { postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10" };

  it("adds #floor-unit when both are set", () => {
    expect(formatAddress({ ...base, floor: "05", unit: "123" })).toBe("406 ANG MO KIO AVENUE 10, #05-123");
  });

  it("is just line 1 for landed property, or when only one of floor/unit is set", () => {
    expect(formatAddress({ ...base, landed: true })).toBe("406 ANG MO KIO AVENUE 10");
    expect(formatAddress({ ...base, floor: "05" })).toBe("406 ANG MO KIO AVENUE 10");
    expect(formatAddress({ ...base, unit: "123" })).toBe("406 ANG MO KIO AVENUE 10");
  });

  it("never includes line 2 or the postal code", () => {
    expect(formatAddress({ ...base, line2: "AMK Hub" })).toBe("406 ANG MO KIO AVENUE 10");
  });
});

describe("jobStatusPill", () => {
  it("says who it's finding while open, per trade", () => {
    expect(jobStatusPill("OPEN", "PLUMBER")).toEqual({ label: "Finding a plumber", tone: "info" });
    expect(jobStatusPill("OPEN", "ELECTRICIAN")).toEqual({ label: "Finding an electrician", tone: "info" });
    expect(jobStatusPill("OPEN", "LOCKSMITH")).toEqual({ label: "Finding a locksmith", tone: "info" });
  });

  it.each<[JobStatus, string, string]>([
    ["ACCEPTED", "Accepted", "info"],
    ["QUOTED", "Quote to approve", "warning"],
    ["IN_PROGRESS", "In progress", "info"],
    ["COMPLETED", "Done", "success"],
    ["CANCELLED", "Cancelled", "neutral"],
  ])("%s → %s (%s)", (status, label, tone) => {
    expect(jobStatusPill(status, "PLUMBER")).toEqual({ label, tone });
  });
});

describe("formatWhen", () => {
  it.each([
    ["2026-11-23T13:05:00+08:00", "today, 1:05pm"],
    ["2026-11-23T00:05:00+08:00", "today, 12:05am"],
    ["2026-11-23T12:00:00.000+08:00", "today, 12:00pm"],
    ["2026-11-22T09:30:00+08:00", "yesterday, 9:30am"],
    ["2026-11-22T23:59:00+08:00", "yesterday, 11:59pm"],
    ["2026-11-21T11:48:07.749+08:00", "21 Nov, 11:48am"],
    ["2026-01-02T08:00:00+08:00", "2 Jan, 8:00am"],
    ["2025-11-22T11:48:00+08:00", "22 Nov 2025, 11:48am"],
  ])("%s → %s (Singapore time, now = Mon 23 Nov 2026 10:00)", (iso, expected) => {
    expect(formatWhen(iso, NOW)).toBe(expected);
  });

  it("uses Singapore's today, not UTC's", () => {
    // 20:00 UTC on the 22nd is 04:00 on the 23rd in Singapore.
    const lateUtc = new Date("2026-11-22T20:00:00Z");
    expect(formatWhen("2026-11-23T03:00:00+08:00", lateUtc)).toBe("today, 3:00am");
    expect(formatWhen("2026-11-22T22:00:00+08:00", lateUtc)).toBe("yesterday, 10:00pm");
  });

  it("handles yesterday across a year end, and shows the year for last year's dates", () => {
    const newYear = new Date("2027-01-01T02:00:00Z"); // 1 Jan 2027, 10:00 in Singapore
    expect(formatWhen("2026-12-31T23:00:00+08:00", newYear)).toBe("yesterday, 11:00pm");
    expect(formatWhen("2026-12-30T15:30:00+08:00", newYear)).toBe("30 Dec 2026, 3:30pm");
    expect(formatWhen("2027-01-01T09:15:00+08:00", newYear)).toBe("today, 9:15am");
  });

  it("returns anything it can't parse unchanged", () => {
    expect(formatWhen("not a date", NOW)).toBe("not a date");
    expect(formatWhen("", NOW)).toBe("");
  });
});

describe("jobStatusTime", () => {
  it.each<[JobStatus, string]>([
    ["OPEN", "Since today, 9:05am"],
    ["ACCEPTED", "Since today, 9:05am"],
    ["QUOTED", "Since today, 9:05am"],
    ["IN_PROGRESS", "Since today, 9:05am"],
    ["COMPLETED", "Done today, 9:05am"],
    ["CANCELLED", "Cancelled today, 9:05am"],
  ])("%s → %s", (status, expected) => {
    expect(jobStatusTime({ status, statusChangedAt: "2026-11-23T09:05:00+08:00" }, NOW)).toBe(expected);
  });

  it("uses statusChangedAt with the same date rules as formatWhen", () => {
    expect(jobStatusTime({ status: "CANCELLED", statusChangedAt: "2026-11-20T11:48:00+08:00" }, NOW)).toBe("Cancelled 20 Nov, 11:48am");
    expect(jobStatusTime({ status: "COMPLETED", statusChangedAt: "2025-03-04T16:00:00+08:00" }, NOW)).toBe("Done 4 Mar 2025, 4:00pm");
  });
});

describe("jobWaitingFor", () => {
  it.each<[JobStatus, string]>([
    ["OPEN", "Waiting for a plumber to accept"],
    ["ACCEPTED", "Waiting for the plumber’s quote"],
    ["QUOTED", "Waiting for you to approve the quote"],
    ["IN_PROGRESS", "Waiting for the plumber to finish"],
  ])("%s → %s", (status, expected) => {
    expect(jobWaitingFor({ status, trade: "PLUMBER" })).toBe(expected);
  });

  it("names the job's trade", () => {
    expect(jobWaitingFor({ status: "ACCEPTED", trade: "LOCKSMITH" })).toBe("Waiting for the locksmith’s quote");
    expect(jobWaitingFor({ status: "IN_PROGRESS", trade: "ELECTRICIAN" })).toBe("Waiting for the electrician to finish");
  });

  it("uses the right article while open ('an electrician', like the status pill)", () => {
    expect(jobWaitingFor({ status: "OPEN", trade: "LOCKSMITH" })).toBe("Waiting for a locksmith to accept");
    expect(jobWaitingFor({ status: "OPEN", trade: "ELECTRICIAN" })).toBe("Waiting for an electrician to accept");
  });

  it("waits for nothing once done or cancelled", () => {
    expect(jobWaitingFor({ status: "COMPLETED", trade: "PLUMBER" })).toBeUndefined();
    expect(jobWaitingFor({ status: "CANCELLED", trade: "PLUMBER" })).toBeUndefined();
  });
});

describe("jobStageLabel", () => {
  it.each<[JobStatus, string]>([
    ["OPEN", "Step 1 of 4 · Posted"],
    ["ACCEPTED", "Step 2 of 4 · Accepted"],
    ["QUOTED", "Step 2 of 4 · Accepted"],
    ["IN_PROGRESS", "Step 3 of 4 · Quote approved"],
    ["COMPLETED", "Step 4 of 4 · Done"],
    ["CANCELLED", "Stopped at step 1 · Posted"],
  ])("%s → %s", (status, expected) => {
    expect(jobStageLabel(status)).toBe(expected);
  });
});
