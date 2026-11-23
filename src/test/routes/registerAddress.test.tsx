// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi, type AddressLookup, type SavedAddress } from "@/api/auth";
import { tokenStore } from "@/auth/tokenStore";
import { tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
const api = authApi as jest.Mocked<typeof authApi>;

const URL = "/register/address?flow=register";
const lookup = (over: Partial<AddressLookup> = {}): AddressLookup => ({ postalCode: "560123", matches: [], available: true, ...over });
const field = (label: string) => screen.getByLabelText(label);
const type = (label: string, value: string) => fireEvent.changeText(field(label), value);
const save = () => fireEvent.press(screen.getByRole("button", { name: "Save and finish" }));

beforeEach(async () => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listAddresses.mockResolvedValue([]); // Home and Profile load saved addresses
  api.lookupPostalCode.mockResolvedValue(lookup());
  api.addAddress.mockResolvedValue({ id: "aZ3kP9qL", label: "Home", isDefault: true, postalCode: "560123", line1: "x" });
  await tokenStore.clear();
});

describe("Sign-up step 4: address", () => {
  it("shows step 4 of 4, the verified notice and who sees the address", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    expect(await screen.findByRole("header", { name: "Where do you need help?" })).toBeOnTheScreen();
    expect(screen.getByText("Step 4 of 4")).toBeOnTheScreen();
    expect(screen.getByText("Email verified")).toBeOnTheScreen();
    expect(screen.getByText("Who sees your address")).toBeOnTheScreen();
    expect(screen.getByText("We'll fill in the street for you.")).toBeOnTheScreen();
  });

  it("without the register flow, is titled 'Add an address' and saves with 'Save address'", async () => {
    await renderRouter(appRoutes, { initialUrl: "/register/address" });
    expect(await screen.findByRole("header", { name: "Add an address" })).toBeOnTheScreen();
    expect(screen.queryByText("Email verified")).toBeNull();
    expect(screen.queryByText(/^Step /)).toBeNull();
    expect(screen.getByRole("button", { name: "Save address" })).toBeOnTheScreen();
  });

  it("shows every missing field once Save is pressed, and doesn't call the API", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await screen.findByLabelText("Postal code");
    expect(screen.queryByText("Enter the 6-digit postal code.")).toBeNull();
    await save();
    expect(screen.getByText("Enter the 6-digit postal code.")).toBeOnTheScreen();
    expect(screen.getByText("Enter the block or house number and street.")).toBeOnTheScreen();
    expect(screen.getByText("Enter the floor, e.g. 05.")).toBeOnTheScreen();
    expect(screen.getByText("Enter the unit, e.g. 123.")).toBeOnTheScreen();
    expect(api.addAddress).not.toHaveBeenCalled();
  });

  it("keeps only digits in the postal code (max 6) and cleans floor and unit", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "56a01 23999");
    expect(field("Postal code").props.value).toBe("560123");
    await type("Floor", "b1x");
    expect(field("Floor").props.value).toBe("B1");
    await type("Unit", "12-3a!");
    expect(field("Unit").props.value).toBe("123A");
  });

  it("previews the unit as #05-123, padding a one-digit floor", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Floor", "5");
    await type("Unit", "123");
    expect(await screen.findByText("Shown to your technician as #05-123")).toBeOnTheScreen();
  });

  it("landed property makes floor and unit optional, and line 1 is in capitals", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", " 12 Jalan Bukit ");
    expect(field("Address line 1").props.value).toBe(" 12 JALAN BUKIT ");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (house)" }));
    expect(screen.getByLabelText("Floor (optional)")).toBeOnTheScreen();
    expect(screen.getByLabelText("Unit (optional)")).toBeOnTheScreen();
    await save();
    expect(api.addAddress).toHaveBeenCalledWith({ postalCode: "560123", line1: "12 JALAN BUKIT", landed: true }, null, "Home");
  });

  it("landed property: if floor is filled in, unit is needed too", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "12 Jalan Bukit");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (house)" }));
    await type("Floor (optional)", "1");
    await save();
    expect(api.addAddress).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the unit, e.g. 123.")).toBeOnTheScreen();
  });

  it("orders the fields postal code, line 1, line 2, landed, then floor and unit (always shown)", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await screen.findByLabelText("Postal code");
    const tree = JSON.stringify(screen.toJSON());
    const at = (text: string) => tree.indexOf(`"${text}"`);
    const order = ["Postal code", "Address line 1", "Address line 2 (optional)", "Landed property (house)", "Floor", "Unit"].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).not.toBeChecked();
    expect(screen.getByText("As in #05-123: floor 05, unit 123.")).toBeOnTheScreen();
  });

  it("landed property: unit alone also needs a floor", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "12 Jalan Bukit");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (house)" }));
    expect(screen.getByText("Optional for landed property. Fill in both if your home has one.")).toBeOnTheScreen();
    await type("Unit (optional)", "1");
    await save();
    expect(api.addAddress).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the floor, e.g. 05.")).toBeOnTheScreen();
  });

  it("landed property with both floor and unit sends them, with landed", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "12 Jalan Bukit");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (house)" }));
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).toBeChecked();
    await type("Floor (optional)", "01");
    await type("Unit (optional)", "2A");
    await save();
    expect(api.addAddress).toHaveBeenCalledWith({ postalCode: "560123", line1: "12 JALAN BUKIT", landed: true, floor: "01", unit: "2A" }, null, "Home");
  });

  it("unticking landed makes floor and unit required again", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "12 Jalan Bukit");
    const landed = () => screen.getByRole("checkbox", { name: "Landed property (house)" });
    await fireEvent.press(landed());
    await fireEvent.press(landed());
    expect(landed()).not.toBeChecked();
    expect(screen.getByLabelText("Floor")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Floor (optional)")).toBeNull();
    await save();
    expect(api.addAddress).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the floor, e.g. 05.")).toBeOnTheScreen();
    expect(screen.getByText("Enter the unit, e.g. 123.")).toBeOnTheScreen();
  });
});

describe("Address: postal code lookup", () => {
  it("doesn't look up until all 6 digits are in", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "56012");
    expect(api.lookupPostalCode).not.toHaveBeenCalled();
  });

  it("shows 'Looking up…' while the request is in flight", async () => {
    api.lookupPostalCode.mockReturnValue(new Promise(() => {}));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    expect(api.lookupPostalCode).toHaveBeenCalledWith("560123", expect.any(AbortSignal));
    expect(screen.getByText("Looking up this postal code…")).toBeOnTheScreen();
  });

  it("fills line 1 and line 2 from a single match", async () => {
    api.lookupPostalCode.mockResolvedValue(lookup({ matches: [{ line1: "123 Ang Mo Kio Avenue 3", building: "AMK Hub" }] }));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    expect(await screen.findByText("Address filled in from OneMap. Edit it if needed.")).toBeOnTheScreen();
    expect(field("Address line 1").props.value).toBe("123 ANG MO KIO AVENUE 3");
    expect(field("Address line 2 (optional)").props.value).toBe("AMK Hub");
  });

  it("lets the user pick from several matches", async () => {
    api.lookupPostalCode.mockResolvedValue(
      lookup({ matches: [{ line1: "1 Tampines St", building: "Block A" }, { line1: "3 Tampines St", building: "Block B" }] }),
    );
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "520001");
    expect(await screen.findByText("Pick your building below.")).toBeOnTheScreen();
    expect(field("Address line 1").props.value).toBe("");
    await fireEvent.press(screen.getByRole("radio", { name: /3 Tampines St/ }));
    expect(field("Address line 1").props.value).toBe("3 TAMPINES ST");
    expect(field("Address line 2 (optional)").props.value).toBe("Block B");
    expect(screen.getByRole("radio", { name: /3 Tampines St/ })).toBeChecked();
  });

  it("says when nothing matches", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "999999");
    expect(await screen.findByText("We couldn't find this postal code. Check it, or type the address below.")).toBeOnTheScreen();
  });

  it("says when the lookup service is unavailable", async () => {
    api.lookupPostalCode.mockResolvedValue(lookup({ available: false }));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    expect(await screen.findByText("Address lookup is unavailable. Type it in below.")).toBeOnTheScreen();
  });

  it("says when the lookup fails", async () => {
    api.lookupPostalCode.mockRejectedValue(new ApiError(0, "network_error", "offline"));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    expect(await screen.findByText("Couldn't look up the address. Type it in below.")).toBeOnTheScreen();
  });
});

describe("Address: saving and skipping", () => {
  it("after the code step, saves the address with the access token and closes the flow", async () => {
    api.verifyOtp.mockResolvedValue(tokens({ accessToken: "access-xyz" }));
    await renderRouter(appRoutes, { initialUrl: "/verify?challengeId=ch_reg1&sentTo=n***%40gmail.com&purpose=VERIFY_EMAIL&flow=register" });
    await fireEvent.changeText(await screen.findByLabelText("6-digit code"), "123456");
    await screen.findByText("Email verified");

    await type("Postal code", "560123");
    await type("Address line 1", "123 Ang Mo Kio Avenue 3");
    await type("Floor", "5");
    await type("Unit", "123");
    await type("Address line 2 (optional)", "  ");
    await save();
    expect(api.addAddress).toHaveBeenCalledWith(
      { postalCode: "560123", line1: "123 ANG MO KIO AVENUE 3", landed: false, floor: "5", unit: "123" },
      "access-xyz",
      "Home",
    );
    expect(await screen.findByText("Hi tan_ah_kow")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });

  it("marks the field the server rejects", async () => {
    api.addAddress.mockRejectedValue(new ApiError(400, "invalid_request", "Invalid unit", "address.unit"));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "123 Ang Mo Kio Avenue 3");
    await type("Floor", "05");
    await type("Unit", "123");
    await save();
    expect(await screen.findByText("Check this field.")).toBeOnTheScreen();
    expect(field("Unit").props.accessibilityHint).toBe("Check this field.");
    expect(screen).toHavePathname("/register/address");
  });

  it("shows other save errors in a notice and stays on the page", async () => {
    api.addAddress.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", "123 Ang Mo Kio Avenue 3");
    await type("Floor", "05");
    await type("Unit", "123");
    await save();
    expect(await screen.findByText("Couldn’t save your address")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
  });

  it("'I’ll add my address later' closes the flow without saving", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await fireEvent.press(await screen.findByRole("button", { name: "I’ll add my address later" }));
    expect(api.addAddress).not.toHaveBeenCalled();
    expect(await screen.findByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });
});

describe("Address: name", () => {
  const fillFlat = async () => {
    await type("Postal code", "560123");
    await type("Address line 1", "123 Ang Mo Kio Avenue 3");
    await type("Floor", "05");
    await type("Unit", "123");
  };

  it("has a Name field that starts as 'Home', and sends it as the label", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    expect((await screen.findByLabelText("Name")).props.value).toBe("Home");
    expect(screen.getByText("So you can tell your addresses apart.")).toBeOnTheScreen();
    await fillFlat();
    await save();
    expect(api.addAddress).toHaveBeenCalledWith(expect.objectContaining({ postalCode: "560123" }), null, "Home");
  });

  it("sends a custom name, trimmed", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Name", "  Mum’s place ");
    await fillFlat();
    await save();
    expect(api.addAddress).toHaveBeenCalledWith(expect.objectContaining({ postalCode: "560123" }), null, "Mum’s place");
  });

  it("a blank name is sent as 'Home'", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Name", "   ");
    await fillFlat();
    await save();
    expect(api.addAddress).toHaveBeenCalledWith(expect.objectContaining({ postalCode: "560123" }), null, "Home");
  });
});

describe("Address: editing a saved address (?id=)", () => {
  const OFFICE: SavedAddress = {
    id: "AdOffc01",
    label: "Office",
    isDefault: false,
    postalCode: "018989",
    line1: "1 MARINA BOULEVARD",
    line2: "MBFC Tower 1",
    floor: "20",
    unit: "01",
    landed: false,
  };
  const HOUSE: SavedAddress = { id: "AdHous01", label: "Parents", isDefault: true, postalCode: "459123", line1: "12 JALAN BUKIT", landed: true };
  const EDIT = "/register/address?id=AdOffc01";
  const saveChanges = () => fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  const loaded = async () => {
    await screen.findByRole("header", { name: "Edit address" });
    await screen.findByLabelText("Name");
  };

  beforeEach(async () => {
    await tokenStore.set("refresh-1");
    api.refresh.mockResolvedValue(tokens());
    api.listAddresses.mockResolvedValue([HOUSE, OFFICE]);
    api.updateAddress.mockResolvedValue(OFFICE);
  });

  it("opened directly on launch (session still being restored), loads the address with the access token", async () => {
    // e.g. a web page refresh on /register/address?id=…: the saved session is restored after the screen mounts.
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(api.listAddresses).toHaveBeenCalledWith("access-1");
    expect(api.listAddresses).not.toHaveBeenCalledWith(null);
  });

  it("is titled 'Edit address' and says posted jobs keep their address", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(screen.getByText("Edit this address")).toBeOnTheScreen();
    expect(screen.getByText("Jobs you’ve already posted keep the address they were posted with.")).toBeOnTheScreen();
    expect(screen.queryByText("Where do you need help?")).toBeNull();
    expect(screen.queryByText(/^Step /)).toBeNull();
  });

  it("says it's loading, with Save disabled, until the address arrives", async () => {
    api.listAddresses.mockReturnValue(new Promise(() => {}));
    await renderRouter(appRoutes, { initialUrl: EDIT });
    expect(await screen.findByText("Loading the address…")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Postal code")).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("prefills every field and the name from the saved address", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(field("Name").props.value).toBe("Office");
    expect(field("Postal code").props.value).toBe("018989");
    expect(field("Address line 1").props.value).toBe("1 MARINA BOULEVARD");
    expect(field("Address line 2 (optional)").props.value).toBe("MBFC Tower 1");
    expect(field("Floor").props.value).toBe("20");
    expect(field("Unit").props.value).toBe("01");
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).not.toBeChecked();
  });

  it("prefills landed for a landed address (floor and unit optional and empty)", async () => {
    await renderRouter(appRoutes, { initialUrl: "/register/address?id=AdHous01" });
    await loaded();
    expect(field("Name").props.value).toBe("Parents");
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).toBeChecked();
    expect(field("Floor (optional)").props.value).toBe("");
    expect(field("Unit (optional)").props.value).toBe("");
  });

  it("an older address with no landed flag counts as landed when it has no floor and unit", async () => {
    api.listAddresses.mockResolvedValue([{ id: "AdOld001", label: "Home", isDefault: true, postalCode: "459123", line1: "12 JALAN BUKIT" }]);
    await renderRouter(appRoutes, { initialUrl: "/register/address?id=AdOld001" });
    await loaded();
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).toBeChecked();
  });

  it("an older address with no landed flag but a floor and unit counts as a flat", async () => {
    const { landed: _landed, ...old } = OFFICE;
    api.listAddresses.mockResolvedValue([old]);
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(screen.getByRole("checkbox", { name: "Landed property (house)" })).not.toBeChecked();
  });

  it("while the postal code is unchanged, its helper says to change it to look up another address", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(screen.getByText("Change the postal code to look up a different address.")).toBeOnTheScreen();
    await type("Postal code", "01898");
    expect(screen.queryByText("Change the postal code to look up a different address.")).toBeNull();
  });

  it("doesn't let OneMap overwrite line 1 or line 2 on load", async () => {
    api.lookupPostalCode.mockResolvedValue(lookup({ postalCode: "018989", matches: [{ line1: "8A MARINA BOULEVARD", building: "Marina Bay Financial Centre" }] }));
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await waitFor(() => expect(api.lookupPostalCode).toHaveBeenCalledWith("018989", expect.any(AbortSignal)));
    // Let the lookup settle, then check nothing was replaced.
    await act(async () => {});
    expect(field("Address line 1").props.value).toBe("1 MARINA BOULEVARD");
    expect(field("Address line 2 (optional)").props.value).toBe("MBFC Tower 1");
  });

  it("changing the postal code does look up and fill in the new street", async () => {
    api.lookupPostalCode.mockResolvedValue(lookup({ postalCode: "560123", matches: [{ line1: "123 Ang Mo Kio Avenue 3" }] }));
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await type("Postal code", "560123");
    expect(await screen.findByText("Address filled in from OneMap. Edit it if needed.")).toBeOnTheScreen();
    expect(field("Address line 1").props.value).toBe("123 ANG MO KIO AVENUE 3");
  });

  it("'Save changes' calls updateAddress(id, address, name, token), not addAddress, then closes", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await type("Name", " Work ");
    await type("Unit", "02");
    await saveChanges();
    expect(api.updateAddress).toHaveBeenCalledWith(
      "AdOffc01",
      { postalCode: "018989", line1: "1 MARINA BOULEVARD", line2: "MBFC Tower 1", landed: false, floor: "20", unit: "02" },
      "Work",
      "access-1",
    );
    expect(api.addAddress).not.toHaveBeenCalled();
    // Opened directly (no history): closing goes Home.
    expect(await screen.findByRole("header", { name: "What needs fixing?" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  });

  it("a blank name is saved as 'Home'", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await type("Name", "");
    await saveChanges();
    expect(api.updateAddress).toHaveBeenCalledWith("AdOffc01", expect.any(Object), "Home", "access-1");
  });

  it("shows a save error and stays on the page", async () => {
    api.updateAddress.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await saveChanges();
    expect(await screen.findByText("Couldn’t save your address")).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
  });

  it("still validates before saving", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    await type("Address line 1", "");
    await saveChanges();
    expect(screen.getByText("Enter the block or house number and street.")).toBeOnTheScreen();
    expect(api.updateAddress).not.toHaveBeenCalled();
  });

  it("has no 'I’ll add my address later' link", async () => {
    await renderRouter(appRoutes, { initialUrl: EDIT });
    await loaded();
    expect(screen.queryByRole("button", { name: "I’ll add my address later" })).toBeNull();
  });

  it("an unknown id says 'Address not found', with no form and Save disabled", async () => {
    await renderRouter(appRoutes, { initialUrl: "/register/address?id=Nope1234" });
    expect(await screen.findByText("Address not found")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Postal code")).toBeNull();
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("from Your addresses: the pencil opens the form, and saving returns to the list", async () => {
    await renderRouter(appRoutes, { initialUrl: "/addresses" });
    await fireEvent.press(await screen.findByRole("button", { name: "Edit Office" }));
    await loaded();
    await saveChanges();
    expect(api.updateAddress).toHaveBeenCalledWith("AdOffc01", expect.any(Object), "Office", "access-1");
    expect(await screen.findByRole("header", { name: "Your addresses" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/addresses");
  });
});
