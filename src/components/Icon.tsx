import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ReactNode } from "react";
import type { ColorValue } from "react-native";
import { size as sizeTokens } from "@/theme";

/**
 * Outline icons in the design system's style: 24px grid, 2px stroke, round caps and joins
 * (Feather/Lucide). Paths match docs/wireframes/A-*.html.
 *
 * Icons are decorative: the control around them carries the accessible label.
 */
const glyphs = {
  bell: (
    <>
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  pin: (
    <>
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </>
  ),
  /** Plumber */
  drop: <Path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z" />,
  /** Electrician */
  bolt: <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  /** Locksmith */
  key: (
    <>
      <Circle cx="7.5" cy="15.5" r="5.5" />
      <Path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  /** Edit (pencil) */
  edit: <Path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  home: <Path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  jobs: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="2" />
      <Path d="M7 9h10M7 13h6" />
    </>
  ),
  wallet: (
    <>
      <Rect x="2" y="6" width="20" height="14" rx="2" />
      <Path d="M16 13h2M2 10h20" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  lock: (
    <>
      <Rect x="4" y="11" width="16" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  close: <Path d="M18 6L6 18M6 6l12 12" />,
  chevronLeft: <Path d="M15 18l-6-6 6-6" />,
  chevronRight: <Path d="M9 18l6-6-6-6" />,
  check: <Path d="M20 6L9 17l-5-5" />,
  circle: <Circle cx="12" cy="12" r="9" />,
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </>
  ),
  checkCircle: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8 12l3 3 5-6" />
    </>
  ),
  alert: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v4M12 16h.01" />
    </>
  ),
  // Job issue tiles (Feather shapes).
  /** Blocked drain (funnel) */
  filter: <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  /** Pressure / flow */
  activity: <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  /** Water heater */
  thermometer: <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />,
  /** Tap or shower */
  shower: <Path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />,
  /** Power trips */
  power: <Path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />,
  /** Lights */
  sun: (
    <>
      <Circle cx="12" cy="12" r="5" />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  /** Socket or switch */
  toggle: (
    <>
      <Rect x="1" y="5" width="22" height="14" rx="7" />
      <Circle cx="8" cy="12" r="3" />
    </>
  ),
  /** New installation */
  tool: <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  /** Digital lock (keypad) */
  grid: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="14" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  /** Change a lock */
  refresh: <Path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
  /** Gate or grille */
  gate: <Path d="M4 21V5M10 21V5M14 21V5M20 21V5M2 9h20M2 17h20" />,
  /** Calendar (review: when) */
  calendar: (
    <>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

export interface IconProps {
  name: IconName;
  /** Pixels. Defaults to icon-lg (24). */
  size?: number;
  color: ColorValue;
}

export function Icon({ name, size = sizeTokens.iconLg, color }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {glyphs[name]}
    </Svg>
  );
}
