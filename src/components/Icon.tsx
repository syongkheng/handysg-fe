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
