import { EMAIL_PATTERN, FLOOR_PATTERN, PASSWORD_RULES, passwordMeetsRules, POSTAL_CODE_PATTERN, UNIT_PATTERN, USERNAME_PATTERN } from "./passwordRules";

const failing = (pw: string) => PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.id);

describe("password rules", () => {
  it("accepts a password that meets every rule", () => {
    expect(failing("Abcdef1!")).toEqual([]);
    expect(passwordMeetsRules("Abcdef1!")).toBe(true);
  });

  it.each([
    ["too short", "Abc1!", ["length"]],
    ["no uppercase", "abcdef1!", ["upper"]],
    ["no lowercase", "ABCDEF1!", ["lower"]],
    ["no digit", "Abcdefg!", ["digit"]],
    ["no special", "Abcdefg1", ["special"]],
    ["empty", "", ["length", "upper", "lower", "digit", "special"]],
  ])("flags %s", (_what, pw, ids) => {
    expect(failing(pw)).toEqual(ids);
    expect(passwordMeetsRules(pw)).toBe(false);
  });

  it("does not count whitespace as a special character", () => {
    expect(failing("Abcdef1 ")).toEqual(["special"]);
  });

  it("counts non-ASCII symbols as special", () => {
    expect(failing("Abcdef1€")).toEqual([]);
  });

  it("accepts exactly 8 and 64 characters, rejects 65", () => {
    const base = "Aa1!";
    expect(passwordMeetsRules(base + "x".repeat(4))).toBe(true);
    expect(passwordMeetsRules(base + "x".repeat(60))).toBe(true);
    expect(passwordMeetsRules(base + "x".repeat(61))).toBe(false);
  });
});

describe("field patterns", () => {
  it("username: 3–30 letters, digits, dots, underscores", () => {
    for (const ok of ["tan", "tan_ah.kow", "A1_", "x".repeat(30)]) expect(USERNAME_PATTERN.test(ok)).toBe(true);
    for (const bad of ["ta", "x".repeat(31), "tan ah", "tan-ah", "tan@kow", ""]) expect(USERNAME_PATTERN.test(bad)).toBe(false);
  });

  it("email", () => {
    for (const ok of ["a@b.co", "tan.ah+1@gmail.com"]) expect(EMAIL_PATTERN.test(ok)).toBe(true);
    for (const bad of ["a@b", "a b@c.d", "@b.co", "a@.", ""]) expect(EMAIL_PATTERN.test(bad)).toBe(false);
  });

  it("postal code: exactly 6 digits", () => {
    expect(POSTAL_CODE_PATTERN.test("560123")).toBe(true);
    for (const bad of ["56012", "5601234", "56012a"]) expect(POSTAL_CODE_PATTERN.test(bad)).toBe(false);
  });

  it("floor: 1–3 digits or B + 1–2 digits", () => {
    for (const ok of ["5", "05", "123", "B1", "b12"]) expect(FLOOR_PATTERN.test(ok)).toBe(true);
    for (const bad of ["1234", "B", "B123", "A1", ""]) expect(FLOOR_PATTERN.test(bad)).toBe(false);
  });

  it("unit: 1–5 digits with an optional letter", () => {
    for (const ok of ["1", "123", "12345", "123A"]) expect(UNIT_PATTERN.test(ok)).toBe(true);
    for (const bad of ["123456", "A123", "12AB", ""]) expect(UNIT_PATTERN.test(bad)).toBe(false);
  });
});
