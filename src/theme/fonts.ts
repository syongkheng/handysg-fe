import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";

/** Passed to useFonts in the root layout. The keys become the font family names on every platform. */
export const fontAssets = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };

export type FontWeight = 400 | 500 | 600 | 700;

const familyByWeight: Record<FontWeight, keyof typeof fontAssets> = {
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
};

/**
 * Each Inter weight is its own font family. Pick the family instead of setting `fontWeight`:
 * on Android, a custom family plus `fontWeight` falls back to the system font.
 */
export function fontFamily(weight: FontWeight): string {
  return familyByWeight[weight];
}
