import { knownReason, LOGIN_REASONS } from "./loginReasons";

describe("knownReason", () => {
  it.each(["book a plumber", "book an electrician", "book a locksmith", "see your notifications", "save your service address", "see your jobs"])(
    "accepts the app's own reason %p",
    (reason) => {
      expect(knownReason(reason)).toBe(reason);
    },
  );

  it("includes one 'book …' reason per trade", () => {
    expect(LOGIN_REASONS.filter((r) => r.startsWith("book "))).toEqual(["book a plumber", "book an electrician", "book a locksmith"]);
  });

  it.each([
    ["an unknown text", "claim your prize"],
    ["a near miss (case)", "Book a plumber"],
    ["a near miss (spaces)", " book a plumber"],
    ["an empty string", ""],
    ["undefined", undefined],
    ["an array (repeated URL param)", ["book a plumber", "book a plumber"]],
    ["a number", 42],
  ])("ignores %s", (_what, reason) => {
    expect(knownReason(reason)).toBeUndefined();
  });
});
