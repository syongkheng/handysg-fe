import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { fontFamily, radius, size, space, text, useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  /** Always visible above the input; also its accessible name. */
  label: string;
  /** Shown under the input in danger colour, and announced to screen readers. Replaces `helper`. */
  error?: string;
  helper?: string;
}

export function TextField({ label, error, helper, onFocus, onBlur, editable = true, ...rest }: TextFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const note = error ?? helper;

  return (
    <View style={{ gap: space[1] }}>
      <AppText variant="sm" weight={600}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        placeholderTextColor={color.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          {
            minHeight: size.inputHeight,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? color.danger : focused ? color.primary : color.borderStrong,
            backgroundColor: editable ? color.surface : color.surfaceMuted,
            paddingHorizontal: space[3],
            color: color.text,
            fontFamily: fontFamily(400),
            fontSize: text.base.fontSize,
          },
          focused && { outlineStyle: "solid", outlineWidth: 3, outlineColor: color.focusRing, outlineOffset: 0 },
        ]}
      />
      {note ? (
        <AppText variant="xs" tone={error ? "danger" : "textMuted"} accessibilityLiveRegion={error ? "polite" : "none"}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
