import { fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";
import { renderWithTheme } from "@/test/render";
import { OtpInput, OTP_LENGTH } from "./OtpInput";

/** A controlled OtpInput, like the Verify screen uses it. */
function Harness({ onComplete, initial = "", disabled }: { onComplete?: (d: string) => void; initial?: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return <OtpInput value={value} onChange={setValue} onComplete={onComplete} disabled={disabled} />;
}

const input = () => screen.getByLabelText(`${OTP_LENGTH}-digit code`);

describe("OtpInput", () => {
  it("is announced as a 6-digit code, empty to start", async () => {
    await renderWithTheme(<Harness />);
    expect(input().props.accessibilityValue).toEqual({ text: "empty" });
    expect(input().props.keyboardType).toBe("number-pad");
    expect(input().props.textContentType).toBe("oneTimeCode");
  });

  it("shows each typed digit in its box and doesn't complete early", async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(input(), "123");
    // The boxes are hidden from screen readers (the input announces the value), so include hidden elements.
    expect(screen.getByText("1", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("3", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(input().props.accessibilityValue).toEqual({ text: "1 2 3" });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("auto-submits once the 6th digit is typed", async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} initial="12345" />);
    await fireEvent.changeText(input(), "123456");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it.each([
    ["with a space", "123 456"],
    ["with a dash", "123-456"],
    ["with surrounding text", "Code: 123456"],
  ])("cleans up a pasted code %s and completes", async (_what, pasted) => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(input(), pasted);
    expect(input().props.value).toBe("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("keeps only the first 6 digits of a longer paste", async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(input(), "12345678");
    expect(input().props.value).toBe("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("backspace removes the last digit", async () => {
    await renderWithTheme(<Harness initial="1234" />);
    await fireEvent.changeText(input(), "123");
    expect(input().props.value).toBe("123");
    expect(screen.queryByText("4", { includeHiddenElements: true })).toBeNull();
  });

  it("ignores letters", async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(input(), "abc");
    expect(input().props.value).toBe("");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("is not editable while disabled", async () => {
    await renderWithTheme(<Harness disabled />);
    expect(input().props.editable).toBe(false);
  });
});
