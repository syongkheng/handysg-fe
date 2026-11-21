import { fireEvent, screen } from "@testing-library/react-native";
import { createRef, type ComponentRef } from "react";
import type { TextInput } from "react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color, size } from "@/theme/tokens.generated";
import { TextField } from "./TextField";

const inputStyle = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style);

describe("TextField", () => {
  it("shows a visible label that is also the input's accessible name, and reports typing", async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(<TextField label="Username" onChangeText={onChangeText} />);
    expect(screen.getByText("Username")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Username"), "tan");
    expect(onChangeText).toHaveBeenCalledWith("tan");
    expect(inputStyle("Username").minHeight).toBe(size.inputHeight);
  });

  it("shows helper text in the muted colour", async () => {
    await renderWithTheme(<TextField label="Email" helper="We'll send a code" />);
    const helper = screen.getByText("We'll send a code");
    expect(StyleSheet.flatten(helper.props.style).color).toBe(color.light.textMuted);
    expect(helper.props.accessibilityLiveRegion).toBe("none");
  });

  it("replaces the helper with an announced error and a danger border", async () => {
    await renderWithTheme(<TextField label="Password" helper="At least 8 characters" error="Password is too short" />);
    expect(screen.queryByText("At least 8 characters")).toBeNull();
    const err = screen.getByText("Password is too short");
    expect(StyleSheet.flatten(err.props.style).color).toBe(color.light.danger);
    expect(err.props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByLabelText("Password").props.accessibilityHint).toBe("Password is too short");
    expect(inputStyle("Password").borderColor).toBe(color.light.danger);
  });

  it("renders no note when there is neither helper nor error", async () => {
    await renderWithTheme(<TextField label="Name" />);
    // Only the label renders as text.
    expect(screen.getAllByText(/.+/).map((t) => t.props.children)).toEqual(["Name"]);
  });

  it("highlights the border on focus, calls the caller's handlers, and resets on blur", async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderWithTheme(<TextField label="Phone-free note" onFocus={onFocus} onBlur={onBlur} />);
    expect(inputStyle("Phone-free note").borderColor).toBe(color.light.borderStrong);

    await fireEvent(screen.getByLabelText("Phone-free note"), "focus", {});
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(inputStyle("Phone-free note")).toMatchObject({ borderColor: color.light.primary, outlineColor: color.light.focusRing, outlineWidth: 3 });

    await fireEvent(screen.getByLabelText("Phone-free note"), "blur", {});
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(inputStyle("Phone-free note").borderColor).toBe(color.light.borderStrong);
    expect(inputStyle("Phone-free note").outlineWidth).toBeUndefined();
  });

  it("keeps the danger border while focused if there is an error", async () => {
    await renderWithTheme(<TextField label="Code" error="Wrong code" />);
    await fireEvent(screen.getByLabelText("Code"), "focus", {});
    expect(inputStyle("Code").borderColor).toBe(color.light.danger);
  });

  it("marks a read-only field disabled with the muted surface", async () => {
    await renderWithTheme(<TextField label="Locked" editable={false} />);
    const input = screen.getByLabelText("Locked");
    expect(input).toBeDisabled();
    expect(input.props.editable).toBe(false);
    expect(inputStyle("Locked").backgroundColor).toBe(color.light.surfaceMuted);
  });

  it("uses the dark token set in dark mode", async () => {
    await renderWithTheme(<TextField label="Dark" />, { preference: "dark" });
    expect(inputStyle("Dark")).toMatchObject({ backgroundColor: color.dark.surface, color: color.dark.text });
    expect(screen.getByLabelText("Dark").props.placeholderTextColor).toBe(color.dark.textMuted);
  });

  it("hides a secureToggle field's text until Show is pressed, then Hide hides it again", async () => {
    await renderWithTheme(<TextField label="Password" secureToggle />);
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
    expect(screen.getByText("Hide")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("names the toggle after the field's label", async () => {
    await renderWithTheme(<TextField label="Confirm password" secureToggle />);
    expect(screen.getByRole("button", { name: "Show confirm password" })).toBeOnTheScreen();
  });

  it("has no Show button without secureToggle and keeps the caller's secureTextEntry", async () => {
    await renderWithTheme(<TextField label="PIN" secureTextEntry />);
    expect(screen.queryByRole("button", { name: /^Show/ })).toBeNull();
    expect(screen.getByLabelText("PIN").props.secureTextEntry).toBe(true);
  });

  it("forwards ref to the underlying TextInput so screens can focus it", async () => {
    const ref = createRef<ComponentRef<typeof TextInput>>();
    await renderWithTheme(<TextField label="Password" ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe("function");
  });
});

