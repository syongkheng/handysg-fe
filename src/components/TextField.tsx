import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { fontFamily, radius, size, space, text, useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  /** Always visible above the input; also its accessible name. */
  label: string;
  /** Shown under the input in danger colour, and announced to screen readers. Replaces `helper`. */
  error?: string;
  helper?: string;
  /** Password fields: hides the text, with a Show / Hide button inside the field. */
  secureToggle?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function TextField({ label, error, helper, secureToggle = false, ref, onFocus, onBlur, editable = true, ...rest }: TextFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const note = error ?? helper;

  return (
    <View style={{ gap: space[1] }}>
      <AppText variant="sm" weight={600}>
        {label}
      </AppText>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          ref={ref}
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
          secureTextEntry={secureToggle ? !revealed : rest.secureTextEntry}
          style={[
            {
              minHeight: size.inputHeight,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: error ? color.danger : focused ? color.primary : color.borderStrong,
              backgroundColor: editable ? color.surface : color.surfaceMuted,
              paddingHorizontal: space[3],
              paddingRight: secureToggle ? size.tapTarget + space[6] : space[3],
              color: color.text,
              fontFamily: fontFamily(400),
              fontSize: text.base.fontSize,
            },
            focused && { outlineStyle: "solid", outlineWidth: 3, outlineColor: color.focusRing, outlineOffset: 0 },
          ]}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onPress={() => setRevealed((r) => !r)}
            style={{
              position: "absolute",
              right: 0,
              minWidth: size.tapTarget,
              minHeight: size.tapTarget,
              paddingHorizontal: space[3],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText variant="sm" weight={600} tone="link">
              {revealed ? "Hide" : "Show"}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {note ? (
        <AppText variant="xs" tone={error ? "danger" : "textMuted"} accessibilityLiveRegion={error ? "polite" : "none"}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
