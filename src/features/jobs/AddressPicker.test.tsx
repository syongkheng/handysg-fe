import { fireEvent, screen } from "@testing-library/react-native";
import type { SavedAddress } from "@/api/auth";
import { renderWithTheme } from "@/test/render";
import { AddressPicker } from "./AddressPicker";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush }) }));

const HOME: SavedAddress = { id: "AdHome01", label: "Home", isDefault: true, postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10", floor: "05", unit: "123" };
const OFFICE: SavedAddress = { id: "AdOffc01", label: "Office", isDefault: false, postalCode: "018989", line1: "1 MARINA BOULEVARD", landed: true };

beforeEach(() => mockPush.mockReset());

describe("AddressPicker", () => {
  it("shows each address as a radio (label + formatted address), the selected one checked", async () => {
    await renderWithTheme(<AddressPicker addresses={[HOME, OFFICE]} selectedId="AdOffc01" onSelect={jest.fn()} />);
    expect(screen.getByRole("radio", { name: /^Home\. 406 ANG MO KIO AVENUE 10, #05-123/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /^Office\. 1 MARINA BOULEVARD/ })).toBeChecked();
  });

  it("selecting a card calls onSelect with its id", async () => {
    const onSelect = jest.fn();
    await renderWithTheme(<AddressPicker addresses={[HOME, OFFICE]} selectedId="AdHome01" onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole("radio", { name: /^Office\./ }));
    expect(onSelect).toHaveBeenCalledWith("AdOffc01");
  });

  it("each card has an 'Edit <label>' pencil that opens the address form for that id, without selecting it", async () => {
    const onSelect = jest.fn();
    await renderWithTheme(<AddressPicker addresses={[HOME, OFFICE]} selectedId="AdHome01" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Edit Home" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Edit Office" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/register/address", params: { id: "AdOffc01" } });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("'Add another address' opens the empty address form", async () => {
    await renderWithTheme(<AddressPicker addresses={[HOME]} selectedId="AdHome01" onSelect={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Add another address" }));
    expect(mockPush).toHaveBeenCalledWith("/register/address");
  });

  it("with no addresses, shows the 'Add your service address' chip instead, which opens the form", async () => {
    await renderWithTheme(<AddressPicker addresses={[]} onSelect={jest.fn()} />);
    expect(screen.queryByLabelText("Address")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Add your service address" }));
    expect(mockPush).toHaveBeenCalledWith("/register/address");
  });
});
