import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { fontAssets, fontFamily, ThemeProvider, useTheme } from "@/theme";

// Keep the splash screen up until Inter has loaded, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // If the fonts fail to load, carry on with the system font rather than a blank screen.
  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}

function AppStack() {
  const { scheme, color } = useTheme();

  // React Navigation draws headers and screen backgrounds from its own theme: feed it our tokens.
  const navTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: color.primary, background: color.bg, card: color.surface, text: color.text, border: color.border },
    };
  }, [scheme, color]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: color.bg },
          headerTitleStyle: { fontFamily: fontFamily(600) },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
