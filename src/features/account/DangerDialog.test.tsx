import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { renderWithTheme } from "@/test/render";
import { color } from "@/theme/tokens.generated";
import { DangerDialog } from "./DangerDialog";

const props = (over: Partial<Parameters<typeof DangerDialog>[0]> = {}) => ({
  visible: true,
  title: "Are you sure?",
  message: "This can't be undone.",
  confirmLabel: "Yes, continue",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  ...over,
});

describe("DangerDialog", () => {
  it("shows the title, message and both buttons when visible", async () => {
    await renderWithTheme(<DangerDialog {...props()} />);
    expect(screen.getByRole("header", { name: "Are you sure?" })).toBeOnTheScreen();
    expect(screen.getByText("This can't be undone.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Yes, continue" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
  });

  it("renders nothing when not visible", async () => {
    await renderWithTheme(<DangerDialog {...props({ visible: false })} />);
    expect(screen.queryByText("Are you sure?")).toBeNull();
  });

  it("calls onConfirm from the red button and onCancel from Cancel", async () => {
    const p = props();
    await renderWithTheme(<DangerDialog {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Yes, continue" }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    expect(p.onCancel).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses a custom label for the safe choice", async () => {
    const p = props({ confirmLabel: "Cancel job", cancelLabel: "Keep job" });
    await renderWithTheme(<DangerDialog {...p} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Keep job" }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it("cancels when the scrim behind the card is tapped, but not when the card itself is", async () => {
    const p = props();
    await renderWithTheme(<DangerDialog {...p} />);
    await fireEvent.press(screen.getByRole("alert"));
    expect(p.onCancel).not.toHaveBeenCalled();
    // The scrim is the outermost element labelled "Cancel" (the Cancel button is inside the card).
    await fireEvent.press(screen.getAllByLabelText("Cancel")[0]);
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it("the scrim is labelled with the custom safe-choice label, and tapping it cancels", async () => {
    const p = props({ confirmLabel: "Cancel job", cancelLabel: "Keep job" });
    await renderWithTheme(<DangerDialog {...p} />);
    expect(screen.queryByLabelText("Cancel")).toBeNull();
    const keep = screen.getAllByLabelText("Keep job");
    expect(keep).toHaveLength(2); // the scrim and the button
    await fireEvent.press(keep[0]);
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  const fill = (name: string) => StyleSheet.flatten(screen.getByRole("button", { name }).props.style).backgroundColor;

  it("by default (danger tone) the confirm button is red", async () => {
    await renderWithTheme(<DangerDialog {...props()} />);
    expect(fill("Yes, continue")).toBe(color.light.danger);
  });

  it.each([
    ["light", "light" as const],
    ["dark", "dark" as const],
  ])("tone 'warning' makes the confirm button amber (warning variant) in %s mode, and still confirms", async (_n, preference) => {
    const p = props({ tone: "warning", confirmLabel: "Cancel job", cancelLabel: "Keep job" });
    await renderWithTheme(<DangerDialog {...p} />, { preference });
    expect(fill("Cancel job")).toBe(color[preference].warning);
    expect(fill("Cancel job")).not.toBe(color[preference].danger);
    expect(fill("Keep job")).toBe(color[preference].surface);
    await fireEvent.press(screen.getByRole("button", { name: "Cancel job" }));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
  });
});
