// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// Your addresses, plus where it's opened from (Home's address chip, Profile) and useAddresses.
// Signed in the real way: a saved refresh token is exchanged on launch (authApi.refresh is mocked),
// so getAccessToken() returns "access-1".
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi, type SavedAddress } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { jobsApi } from "@/api/jobs";
import { tokenStore } from "@/auth/tokenStore";
import { tokens } from "@/test/authApiMock";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
jest.mock("@/api/jobs", () => ({
  jobsApi: { options: jest.fn(), post: jest.fn(), list: jest.fn(), get: jest.fn(), update: jest.fn(), cancel: jest.fn() },
}));
const auth = authApi as jest.Mocked<typeof authApi>;
const jobs = jobsApi as jest.Mocked<typeof jobsApi>;

const HOME: SavedAddress = {
  id: "AdHome01",
  label: "Home",
  isDefault: true,
  postalCode: "560406",
  line1: "406 ANG MO KIO AVENUE 10",
  line2: "AMK Court",
  floor: "05",
  unit: "123",
};
const OFFICE: SavedAddress = { id: "AdOffc01", label: "Office", isDefault: false, postalCode: "018989", line1: "1 MARINA BOULEVARD", landed: true };

const URL = "/addresses";
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const open = async (url = URL) => {
  await renderRouter(appRoutes, { initialUrl: url });
  await screen.findByRole("header", { name: "Your addresses" });
};
const signIn = async () => {
  await tokenStore.set("refresh-1");
  auth.refresh.mockResolvedValue(tokens());
};

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(jobs).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  auth.listAddresses.mockResolvedValue([HOME, OFFICE]);
  auth.lookupPostalCode.mockResolvedValue({ postalCode: "560406", matches: [], available: true });
  jobs.list.mockResolvedValue([]);
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Your addresses: guests", () => {
  it("asks a guest to log in, without loading any addresses; Log in opens the log-in screen", async () => {
    await open();
    expect(screen.getByText("Log in to manage your addresses.")).toBeOnTheScreen();
    expect(auth.listAddresses).not.toHaveBeenCalled();
    await press("Log in");
    expect(screen).toHavePathname("/login");
  });

  it("the log-in screen opened from here gives the same reason ('Log in to manage your addresses')", async () => {
    await open();
    await press("Log in");
    expect(await screen.findByRole("header", { name: "Log in to manage your addresses" })).toBeOnTheScreen();
  });
});

describe("Your addresses", () => {
  beforeEach(signIn);

  it("says it's loading while the list is on its way", async () => {
    auth.listAddresses.mockReturnValue(new Promise(() => {}));
    await open();
    expect(await screen.findByText("Loading your addresses…")).toBeOnTheScreen();
  });

  it("loads the list with the token and an abort signal, and shows each card", async () => {
    await open();
    expect(await screen.findByText("Office")).toBeOnTheScreen();
    expect(auth.listAddresses).toHaveBeenCalledWith("access-1", expect.any(AbortSignal));
    // Home: label, Default pill, address with the unit, line 2 and postal code.
    expect(screen.getByText("Home")).toBeOnTheScreen();
    expect(screen.getByText("Default")).toBeOnTheScreen();
    expect(screen.getByText("406 ANG MO KIO AVENUE 10, #05-123")).toBeOnTheScreen();
    expect(screen.getByText("AMK Court")).toBeOnTheScreen();
    expect(screen.getByText("Singapore 560406")).toBeOnTheScreen();
    // Office: landed, so no unit; no line 2.
    expect(screen.getByText("1 MARINA BOULEVARD")).toBeOnTheScreen();
    expect(screen.getByText("Singapore 018989")).toBeOnTheScreen();
    expect(screen.getAllByText("Default")).toHaveLength(1);
  });

  it("shows the cards as radios in a 'Default address' group; only the default is checked", async () => {
    await open();
    await screen.findByText("Office");
    expect(screen.getByLabelText("Default address").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Home, 406 ANG MO KIO AVENUE 10, #05-123, default" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Office, 1 MARINA BOULEVARD" })).not.toBeChecked();
  });

  it("tapping a non-default card makes it the default with the token and shows the returned list", async () => {
    auth.setDefaultAddress.mockResolvedValue([{ ...OFFICE, isDefault: true }, { ...HOME, isDefault: false }]);
    await open();
    await fireEvent.press(await screen.findByRole("radio", { name: /^Office,/ }));
    expect(auth.setDefaultAddress).toHaveBeenCalledWith("AdOffc01", "access-1");
    expect(await screen.findByRole("radio", { name: "Office, 1 MARINA BOULEVARD, default" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Home, 406 ANG MO KIO AVENUE 10, #05-123" })).not.toBeChecked();
    expect(screen.queryByText("Couldn’t change your default")).toBeNull();
  });

  it("tapping the card that's already the default does nothing", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("radio", { name: /^Home,/ }));
    expect(auth.setDefaultAddress).not.toHaveBeenCalled();
  });

  it("shows an error notice if changing the default fails, and keeps the list as it was", async () => {
    auth.setDefaultAddress.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await open();
    await fireEvent.press(await screen.findByRole("radio", { name: /^Office,/ }));
    expect(await screen.findByText("Couldn’t change your default")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /^Home, .*, default$/ })).toBeChecked();
  });

  it("the pencil 'Edit <label>' opens the address form for that address, without changing the default", async () => {
    await open();
    await screen.findByText("Office");
    await press("Edit Office");
    expect(auth.setDefaultAddress).not.toHaveBeenCalled();
    expect(await screen.findByRole("header", { name: "Edit address" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
    expect(screen).toHaveSearchParams({ id: "AdOffc01" });
  });

  it("'Add a new address' opens the empty address form", async () => {
    await open();
    await screen.findByText("Office");
    await press("Add a new address");
    expect(await screen.findByRole("header", { name: "Add an address" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
  });

  it("with no saved addresses, shows the empty state and 'Add an address' opens the form", async () => {
    auth.listAddresses.mockResolvedValue([]);
    await open();
    expect(await screen.findByText("No saved addresses yet")).toBeOnTheScreen();
    expect(screen.getByText("Who sees your address")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Default address")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add a new address" })).toBeNull();
    await press("Add an address");
    expect(await screen.findByRole("header", { name: "Add an address" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/register/address");
  });

  it("shows an error with Try again when loading fails; Try again reloads", async () => {
    auth.listAddresses.mockRejectedValueOnce(new ApiError(500, "internal", "Something broke on our side."));
    await open();
    expect(await screen.findByText("Couldn’t load your addresses")).toBeOnTheScreen();
    expect(screen.getByText("Something broke on our side.")).toBeOnTheScreen();
    await press("Try again");
    expect(await screen.findByText("Office")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn’t load your addresses")).toBeNull();
    expect(auth.listAddresses).toHaveBeenCalledTimes(2);
  });

  it("reloads when it comes back into focus, so an address added in the form shows up", async () => {
    let saved: SavedAddress[] = [HOME];
    auth.listAddresses.mockImplementation(async () => saved);
    auth.addAddress.mockImplementation(async () => {
      saved = [HOME, OFFICE];
      return OFFICE;
    });
    await open();
    await screen.findByText("Home");
    expect(screen.queryByText("Office")).toBeNull();
    await press("Add a new address");
    await screen.findByRole("header", { name: "Add an address" });
    await fireEvent.changeText(screen.getByLabelText("Name"), "Office");
    await fireEvent.changeText(screen.getByLabelText("Postal code"), "018989");
    await fireEvent.changeText(screen.getByLabelText("Address line 1"), "1 Marina Boulevard");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Landed property (house)" }));
    await press("Save address");
    expect(auth.addAddress).toHaveBeenCalledWith({ postalCode: "018989", line1: "1 MARINA BOULEVARD", landed: true }, "access-1", "Office");
    expect(await screen.findByText("Office")).toBeOnTheScreen();
    expect(screen).toHavePathname("/addresses");
  });
});

describe("Home: address chip", () => {
  it("guests see 'Add your address', and no addresses are requested", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    await screen.findByRole("header", { name: "What needs fixing?" });
    expect(screen.getByText("Add your address")).toBeOnTheScreen();
    expect(auth.listAddresses).not.toHaveBeenCalled();
  });

  describe("signed in", () => {
    beforeEach(signIn);

    it("shows the default address (formatted), and tapping it opens Your addresses", async () => {
      auth.listAddresses.mockResolvedValue([OFFICE, HOME]);
      await renderRouter(appRoutes, { initialUrl: "/" });
      const chip = await screen.findByRole("button", { name: "Service address, 406 ANG MO KIO AVENUE 10, #05-123" });
      expect(screen.getByText("406 ANG MO KIO AVENUE 10, #05-123")).toBeOnTheScreen();
      expect(screen.getByText("Change")).toBeOnTheScreen();
      await fireEvent.press(chip);
      expect(await screen.findByRole("header", { name: "Your addresses" })).toBeOnTheScreen();
      expect(screen).toHavePathname("/addresses");
    });

    it("falls back to the first address if none is marked default", async () => {
      auth.listAddresses.mockResolvedValue([{ ...OFFICE, isDefault: false }, { ...HOME, isDefault: false }]);
      await renderRouter(appRoutes, { initialUrl: "/" });
      expect(await screen.findByRole("button", { name: "Service address, 1 MARINA BOULEVARD" })).toBeOnTheScreen();
    });

    it("with no saved address, shows 'Add your address' and still opens Your addresses", async () => {
      auth.listAddresses.mockResolvedValue([]);
      await renderRouter(appRoutes, { initialUrl: "/" });
      await screen.findByText("Hi tan_ah_kow");
      await waitFor(() => expect(auth.listAddresses).toHaveBeenCalled());
      expect(screen.getByText("Add your address")).toBeOnTheScreen();
      await press("Add your service address");
      expect(screen).toHavePathname("/addresses");
    });
  });
});

describe("Profile: Addresses group", () => {
  beforeEach(signIn);

  it.each([
    [[HOME], "1 saved"],
    [[HOME, OFFICE], "2 saved"],
    [[], "None yet"],
  ])("shows the 'Your addresses' link with how many are saved (%#)", async (list, value) => {
    auth.listAddresses.mockResolvedValue(list);
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    expect(await screen.findByRole("link", { name: `Your addresses, ${value}` })).toBeOnTheScreen();
    expect(screen.getByText("Addresses")).toBeOnTheScreen();
  });

  it("opens Your addresses", async () => {
    await renderRouter(appRoutes, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("link", { name: /^Your addresses/ }));
    expect(await screen.findByRole("header", { name: "Your addresses" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/addresses");
  });
});
