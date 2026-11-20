import { View, type ViewProps } from "react-native";
import { radius, space, useTheme } from "@/theme";

/** White surface, 1px border, radius-lg, space-4 padding. Separated by borders, not shadows. */
export function Card({ style, ...rest }: ViewProps) {
  const { color } = useTheme();
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: color.surface, borderColor: color.border, borderWidth: 1, borderRadius: radius.lg, padding: space[4], gap: space[3] },
        style,
      ]}
    />
  );
}
