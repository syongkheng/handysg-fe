/**
 * The design system in code. Import from "@/theme", never hard-code hex values, font sizes or spacing.
 *
 *   const { color } = useTheme();             // colours for the current light/dark theme
 *   padding: space[5], borderRadius: radius.md, minHeight: size.tapTarget
 */
export { radius, size, space, text } from "./tokens.generated";
export { fontAssets, fontFamily, type FontWeight } from "./fonts";
export { ThemeProvider, useTheme, type ColorScheme, type Theme, type ThemeColors, type ThemePreference } from "./ThemeProvider";
