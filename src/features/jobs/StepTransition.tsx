import { useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";
import { space } from "@/theme";

/**
 * Slides and fades a step's content in when it mounts: from the right when moving forward, from the
 * left when going back. Give it a `key` per step so each step remounts.
 */
export function StepTransition({ direction, children }: { direction: "forward" | "back"; children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);
  const from = direction === "forward" ? space[6] : -space[6];
  return (
    <Animated.View
      style={{
        gap: space[6],
        opacity: progress,
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
