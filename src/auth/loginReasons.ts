import { TRADES } from "@/features/home/trades";

/**
 * The only texts the log-in screen will show after "Log in to …". `reason` arrives as a URL
 * param, so anyone could put any text there with a deep link; unknown values are ignored.
 */
export const LOGIN_REASONS: readonly string[] = [
  ...TRADES.map((t) => `book ${t.withArticle}`),
  "see your notifications",
  "save your service address",
  "see your jobs",
  "see your jobs, quotes and technician updates",
  "see your jobs and quotes",
  "see your wallet and credits",
  "manage your account and addresses",
  "manage your addresses",
  "book a job",
];

export function knownReason(reason: unknown): string | undefined {
  return typeof reason === "string" && LOGIN_REASONS.includes(reason) ? reason : undefined;
}
