import { useNavigation, useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Closes the whole log-in / sign-up modal from any step inside it, back to whatever screen opened
 * it. The (auth) group is one modal screen on the root stack with its own stack inside, so this
 * goes back on the parent (root) stack. Opened from a deep link with nothing underneath: go Home.
 */
export function useCloseAuthFlow() {
  const navigation = useNavigation();
  const router = useRouter();
  return useCallback(() => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else router.replace("/");
  }, [navigation, router]);
}
