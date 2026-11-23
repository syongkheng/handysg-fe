import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { SessionProvider } from "@/auth/SessionProvider";
import { fontAssets, ThemeProvider, useTheme } from "@/theme";

// Whatever URL the app opens at, the tabs sit underneath, so modals like log-in always have something to close back to.
export const unstable_settings = { anchor: "(tabs)" };

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
      <SessionProvider>
        <AppStack />
      </SessionProvider>
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
          // No native headers anywhere: every page draws its own <AppBar /> (see CLAUDE.md, App rules).
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* Log-in and sign-up: one modal with its own stack inside (src/app/(auth)/_layout.tsx). */}
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
        <Stack.Screen name="diagnostics" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="data-usage" />
        <Stack.Screen name="language" />
        <Stack.Screen name="account/export" />
        <Stack.Screen name="account/delete" options={{ gestureEnabled: false }} />
        {/* Post a job: a modal over Home, like the wireframe's full-screen booking sheet. */}
        <Stack.Screen name="book/[trade]" options={{ presentation: "modal" }} />
        <Stack.Screen name="job/[id]" />
        <Stack.Screen name="addresses" />
      </Stack>
    </NavigationThemeProvider>
  );
}
