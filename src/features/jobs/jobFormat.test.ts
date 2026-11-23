import type { SgAddress } from "@/api/auth";
import type { JobStatus } from "@/api/jobs";
import {
  dayChip,
  dayLabel,
  formatAddress,
  formatFee,
  formatPostedAt,
  JOB_STEPS,
  jobStatusPill,
  jobStepIndex,
  jobTitle,
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
