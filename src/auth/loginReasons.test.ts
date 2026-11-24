import { knownReason, LOGIN_REASONS } from "./loginReasons";

describe("knownReason", () => {
  it.each(["book a plumber", "book an electrician", "book a locksmith", "see your notifications", "save your service address", "see your jobs", "continue"])(
    "accepts the app's own reason %p",
    (reason) => {
      expect(knownReason(reason)).toBe(reason);
    },
  );

  it("includes one 'book …' reason per trade, plus the general 'book a job'", () => {
    expect(LOGIN_REASONS.filter((r) => r.startsWith("book "))).toEqual(["book a plumber", "book an electrician", "book a locksmith", "book a job"]);
  });

  it.each([
    ["an unknown text", "claim your prize"],
    ["a near miss (case)", "Book a plumber"],
    ["a near miss (spaces)", " book a plumber"],
    ["an empty string", ""],
    ["undefined", undefined],
    ["an array (repeated URL param)", ["book a plumber", "book a plumber"]],
    ["a number", 42],
    ["a near miss of 'continue' (case)", "Continue"],
    ["a near miss of 'continue' (padded)", "continue "],
  ])("ignores %s", (_what, reason) => {
    expect(knownReason(reason)).toBeUndefined();
  });
});
