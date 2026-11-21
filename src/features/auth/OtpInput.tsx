import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Animated, Pressable, TextInput, View } from "react-native";
import { AppText } from "@/components";
import { fontFamily, radius, size, space, text, useTheme } from "@/theme";

export const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (digits: string) => void;
  /** Called once all 6 digits are in (typed, pasted or autofilled). */
  onComplete?: (digits: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six boxes for a 6-digit code. One real (invisible) TextInput sits on top of the boxes and
 * takes all the input, so everything the keyboard does just works: typing moves along,
 * backspace steps back, pasting "123456" (or "123 456") fills every box, and iOS can autofill
 * the code. The boxes only draw the digits; the box being typed into gets the primary border.
 */
export function OtpInput({ value, onChange, onComplete, error = false, disabled = false, autoFocus = false }: OtpInputProps) {
  const { color } = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const [shake] = useState(() => new Animated.Value(0));

  // A wrong code nudges the boxes sideways, so the error is felt as well as read.
  useEffect(() => {
    if (!error) return;
    Animated.sequence([8, -8, 6, -6, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true }))).start();
  }, [error, shake]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(digits);
    if (digits.length === OTP_LENGTH) onComplete?.(digits);
  };

  const active = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <Animated.View style={{ flexDirection: "row", gap: space[2], transform: [{ translateX: shake }] }}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const digit = value[i] ?? "";
          const isActive = focused && i === active && !disabled;
          return (
            <View
              key={i}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                flex: 1,
                aspectRatio: 0.85,
                maxHeight: size.buttonHeight + space[3],
                borderRadius: radius.md,
                borderWidth: isActive || error ? 2 : 1,
                borderColor: error ? color.danger : isActive ? color.primary : digit ? color.borderStrong : color.border,
                backgroundColor: disabled ? color.surfaceMuted : color.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {digit ? (
                <AppText variant="2xl" weight={600}>
                  {digit}
                </AppText>
              ) : isActive ? (
                <View style={{ width: space[1] / 2, height: text["2xl"].fontSize, backgroundColor: color.primary }} />
              ) : null}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH + 2 /* room for a pasted "123 456" before it's cleaned */}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={`${OTP_LENGTH}-digit code`}
        accessibilityValue={{ text: value ? value.split("").join(" ") : "empty" }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.02,
          color: "transparent",
          fontFamily: fontFamily(400),
          fontSize: text.base.fontSize,
        }}
      />
    </Pressable>
  );
}
