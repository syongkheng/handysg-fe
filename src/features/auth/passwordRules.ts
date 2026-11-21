/**
 * The sign-up password rules, shown as a live checklist. They must match the backend
 * (backend/src/auth/Auth.validator.ts: PASSWORD_MIN_LENGTH, PASSWORD_RULES), which has the final say.
 * "Special" is anything that isn't a letter, a digit or whitespace.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (pw: string) => pw.length >= PASSWORD_MIN_LENGTH },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (pw: string) => /[A-Z]/.test(pw) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (pw: string) => /[a-z]/.test(pw) },
  { id: "digit", label: "A number (0–9)", test: (pw: string) => /\d/.test(pw) },
  { id: "special", label: "A special character (e.g. ! @ # ?)", test: (pw: string) => /[^A-Za-z0-9\s]/.test(pw) },
] as const;

export const passwordMeetsRules = (pw: string) => pw.length <= PASSWORD_MAX_LENGTH && PASSWORD_RULES.every((r) => r.test(pw));

/** Same as the backend's sign-up rule: 3–30 letters, numbers, dots or underscores. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,30}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const POSTAL_CODE_PATTERN = /^\d{6}$/;
export const FLOOR_PATTERN = /^(\d{1,3}|B\d{1,2})$/i;
export const UNIT_PATTERN = /^\d{1,5}[A-Z]?$/i;
