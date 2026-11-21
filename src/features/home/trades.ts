import type { IconName } from "@/components/Icon";
import type { ThemeColors } from "@/theme";

/** Matches the backend's TRADES (tb_technician.ts). */
export type TradeId = "PLUMBER" | "ELECTRICIAN" | "LOCKSMITH";

export interface Trade {
  id: TradeId;
  name: string;
  /** For sentences: "book a plumber", "book an electrician". */
  withArticle: string;
  /** One line under the name on the home tile. */
  blurb: string;
  icon: IconName;
  /** Glyph and chip colours (color-cat-*). */
  glyph: keyof ThemeColors;
  chip: keyof ThemeColors;
}

export const TRADES: readonly Trade[] = [
  { id: "PLUMBER", name: "Plumber", withArticle: "a plumber", blurb: "Leaks, choke, taps, heaters", icon: "drop", glyph: "catPlumber", chip: "catPlumberBg" },
  { id: "ELECTRICIAN", name: "Electrician", withArticle: "an electrician", blurb: "Power trips, lights, sockets", icon: "bolt", glyph: "catElectrician", chip: "catElectricianBg" },
  { id: "LOCKSMITH", name: "Locksmith", withArticle: "a locksmith", blurb: "Lockouts, digital locks", icon: "key", glyph: "catLocksmith", chip: "catLocksmithBg" },
];
