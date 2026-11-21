// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi, type AddressLookup } from "@/api/auth";
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

  it("without the register flow, is titled 'Add your address' and saves with 'Save address'", async () => {
    await renderRouter(appRoutes, { initialUrl: "/register/address" });
    expect(await screen.findByRole("header", { name: "Add your address" })).toBeOnTheScreen();
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

  it("landed property hides floor and unit, and doesn't require them", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    await type("Postal code", "560123");
    await type("Address line 1", " 12 Jalan Bukit ");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (no unit number)" }));
    expect(screen.queryByLabelText("Floor")).toBeNull();
    expect(screen.queryByLabelText("Unit")).toBeNull();
    await save();
    expect(api.addAddress).toHaveBeenCalledWith({ postalCode: "560123", line1: "12 Jalan Bukit" }, null);
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
    expect(field("Address line 1").props.value).toBe("123 Ang Mo Kio Avenue 3");
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
    expect(field("Address line 1").props.value).toBe("3 Tampines St");
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
      { postalCode: "560123", line1: "123 Ang Mo Kio Avenue 3", floor: "5", unit: "123" },
      "access-xyz",
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
