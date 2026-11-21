import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithTheme } from "@/test/render";
import { AddressChip } from "./AddressChip";

describe("AddressChip", () => {
  it("asks to add an address when there is none", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AddressChip onPress={onPress} />);
    expect(screen.getByText("Add your address")).toBeOnTheScreen();
    expect(screen.getByText("Add")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Add your service address" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the saved address with a Change action", async () => {
    await renderWithTheme(<AddressChip address="Blk 123 Ang Mo Kio Ave 3" onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Service address, Blk 123 Ang Mo Kio Ave 3" })).toBeOnTheScreen();
    expect(screen.getByText("Change")).toBeOnTheScreen();
    expect(screen.queryByText("Add your address")).toBeNull();
  });
});
