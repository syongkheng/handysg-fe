import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithTheme } from "@/test/render";
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
});
