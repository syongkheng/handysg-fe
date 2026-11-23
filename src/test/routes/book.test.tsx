// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// Signed in the real way: a saved refresh token is exchanged on launch (authApi.refresh is mocked),
// so the screen's getAccessToken() returns "access-1".
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi, type SavedAddress } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { jobsApi, type CustomerJob, type JobOptions } from "@/api/jobs";
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

// Dates far from "today" so the labels never turn into Today / Tomorrow.
const OPTIONS: JobOptions = {
  callOutFeeCents: 100,
  currency: "SGD",
  timeSlots: [
    { id: "MORNING", label: "9am – 12pm" },
    { id: "AFTERNOON", label: "12pm – 3pm" },
    { id: "EVENING", label: "3pm – 6pm" },
  ],
  dates: [
    { date: "2030-01-07", timeSlots: ["EVENING"] },
    { date: "2030-01-08", timeSlots: ["MORNING", "AFTERNOON", "EVENING"] },
  ],
  descriptionMin: 10,
  descriptionMax: 1000,
};

const HOME: SavedAddress = { id: "AdHome01", label: "Home", isDefault: true, postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10", floor: "05", unit: "123" };
const OFFICE: SavedAddress = { id: "AdOffc01", label: "Office", isDefault: false, postalCode: "018989", line1: "1 MARINA BOULEVARD", floor: "20", unit: "01" };

const posted = (over: Partial<CustomerJob> = {}): CustomerJob => ({
  id: "Jb12abCD",
  trade: "PLUMBER",
  description: "Leaking pipe.",
  urgency: "SCHEDULED",
  scheduledDate: "2030-01-07",
  timeSlot: "EVENING",
  status: "OPEN",
  callOutFeeCents: 100,
  address: HOME,
  createdAt: "2026-11-23T10:00:00.000+08:00",
  ...over,
});

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const cont = () => press("Continue");

async function signedIn() {
  await tokenStore.set("refresh-1");
  auth.refresh.mockResolvedValue(tokens());
}

/** Opens the form and fills steps 1–3 with a picked tile, Mon 7 Jan 3pm – 6pm and the default address. */
async function toReview() {
  await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
  await fireEvent.press(await screen.findByRole("checkbox", { name: "Leaking pipe" }));
  await cont();
  await fireEvent.press(await screen.findByRole("radio", { name: "3pm – 6pm" }));
  await cont();
  await screen.findByRole("header", { name: "Where?" });
  await cont();
  await screen.findByRole("header", { name: "Check and confirm" });
}

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(jobs).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  auth.listAddresses.mockResolvedValue([HOME, OFFICE]);
  jobs.options.mockResolvedValue(OPTIONS);
  jobs.list.mockResolvedValue([]);
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Book a job: guests and unknown trades", () => {
  it("asks a guest to log in to book, and Log in opens the log-in screen", async () => {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    expect(await screen.findByText("Log in to book a plumber.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Request a plumber" })).toBeOnTheScreen();
    expect(jobs.options).not.toHaveBeenCalled();
    await press("Log in");
    expect(screen).toHavePathname("/login");
  });

  it("tells a signed-in user when the trade doesn't exist", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/book/gardener" });
    expect(await screen.findByText("We don’t offer that service")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Book a job" })).toBeOnTheScreen();
    expect(jobs.options).not.toHaveBeenCalled();
  });

  it("matches the trade in any case", async () => {
    await signedIn();
    await renderRouter(appRoutes, { initialUrl: "/book/ELECTRICIAN" });
    expect(await screen.findByRole("header", { name: "Request an electrician" })).toBeOnTheScreen();
    expect(await screen.findByRole("checkbox", { name: "Power trips" })).toBeOnTheScreen();
  });

  it("shows an error if the form can't load", async () => {
    await signedIn();
    jobs.options.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    expect(await screen.findByText("Couldn’t load the booking form")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });
});

describe("Book a job: step 1, the problem", () => {
  beforeEach(signedIn);

  it("is step 1 of 4, with a Close button and the token sent for options and addresses", async () => {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    expect(await screen.findByRole("header", { name: "What’s wrong?" })).toBeOnTheScreen();
    expect(screen.getByText("Step 1 of 4")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(jobs.options).toHaveBeenCalledWith("access-1");
    expect(auth.listAddresses).toHaveBeenCalledWith("access-1");
  });

  it("won't continue until the description is long enough", async () => {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    await screen.findByRole("header", { name: "What’s wrong?" });
    expect(screen.queryByText(/Pick what’s wrong/)).toBeNull();
    await cont();
    expect(screen.getByText("Pick what’s wrong, or describe it (at least 10 characters).")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Describe the problem"), "  short   ");
    await cont();
    expect(screen.getByRole("header", { name: "What’s wrong?" })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Describe the problem"), "The kitchen tap drips.");
    await cont();
    expect(await screen.findByRole("header", { name: "When do you need a plumber?" })).toBeOnTheScreen();
    expect(screen.getByText("Step 2 of 4")).toBeOnTheScreen();
  });

  it("tiles write sentences into the description and follow the text", async () => {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    const field = () => screen.getByLabelText("Describe the problem");
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Leaking pipe" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Water heater" }));
    expect(field().props.value).toBe("Leaking pipe. Water heater.");
    expect(screen.getByRole("checkbox", { name: "Leaking pipe" })).toBeChecked();
    expect(screen.getByText("No address or phone number, please. 27/1000")).toBeOnTheScreen();
    // Untick one.
    await fireEvent.press(screen.getByRole("checkbox", { name: "Leaking pipe" }));
    expect(field().props.value).toBe("Water heater.");
    expect(screen.getByRole("checkbox", { name: "Leaking pipe" })).not.toBeChecked();
    // Editing the text unpicks the tile too.
    await fireEvent.changeText(field(), "Water heater is cold");
    expect(screen.getByRole("checkbox", { name: "Water heater" })).not.toBeChecked();
  });

  it("'Something else' is picked on its own, without writing anything", async () => {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Something else" }));
    expect(screen.getByRole("checkbox", { name: "Something else" })).toBeChecked();
    expect(screen.getByLabelText("Describe the problem").props.value).toBe("");
    await cont();
    expect(screen.getByText(/at least 10 characters/)).toBeOnTheScreen();
  });

  it("caps the description at the maximum length", async () => {
    jobs.options.mockResolvedValue({ ...OPTIONS, descriptionMax: 20 });
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "x".repeat(30));
    expect(screen.getByLabelText("Describe the problem").props.value).toBe("x".repeat(20));
  });
});

describe("Book a job: steps 2 and 3", () => {
  beforeEach(signedIn);

  async function toWhen() {
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "The kitchen tap drips.");
    await cont();
    await screen.findByRole("header", { name: "When do you need a plumber?" });
  }

  it("defaults to Schedule on the first day, and needs a time before continuing", async () => {
    await toWhen();
    expect(screen.getByRole("radio", { name: /^Schedule/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mon 7 Jan" })).toBeChecked();
    await cont();
    expect(screen.getByText("Pick a time.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "When do you need a plumber?" })).toBeOnTheScreen();
  });

  it("Urgent needs no day or time", async () => {
    await toWhen();
    await fireEvent.press(screen.getByRole("radio", { name: /^Urgent · now/ }));
    await cont();
    expect(await screen.findByRole("header", { name: "Where?" })).toBeOnTheScreen();
    expect(screen.getByText("Step 3 of 4")).toBeOnTheScreen();
  });

  it("Back goes to the previous step and keeps what was entered", async () => {
    await toWhen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    await press("Back");
    expect(await screen.findByRole("header", { name: "What’s wrong?" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Describe the problem").props.value).toBe("The kitchen tap drips.");
    expect(screen).toHavePathname("/book/plumber");
  });

  it("Where preselects the default address, and lets the customer pick another", async () => {
    auth.listAddresses.mockResolvedValue([OFFICE, HOME]);
    await toWhen();
    await fireEvent.press(screen.getByRole("radio", { name: "3pm – 6pm" }));
    await cont();
    await screen.findByRole("header", { name: "Where?" });
    expect(screen.getByRole("radio", { name: "Home. 406 ANG MO KIO AVENUE 10, #05-123" })).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: /^Office\./ }));
    expect(screen.getByRole("radio", { name: /^Office\./ })).toBeChecked();
    await cont();
    expect(await screen.findByText("1 MARINA BOULEVARD, #20-01")).toBeOnTheScreen();
  });

  it("Where with no saved addresses asks to add one, and won't continue", async () => {
    auth.listAddresses.mockResolvedValue([]);
    await toWhen();
    await fireEvent.press(screen.getByRole("radio", { name: /^Urgent/ }));
    await cont();
    await screen.findByRole("header", { name: "Where?" });
    await cont();
    expect(screen.getByText("Add the address where you need help.")).toBeOnTheScreen();
    await press("Add your service address");
    expect(screen).toHavePathname("/register/address");
  });
});

describe("Book a job: review and post", () => {
  beforeEach(signedIn);

  it("shows the problem, when, where and the fee, each with a Change link", async () => {
    await toReview();
    expect(screen.getByText("Step 4 of 4")).toBeOnTheScreen();
    expect(screen.getByText("Leaking pipe.")).toBeOnTheScreen();
    expect(screen.getByText("Mon 7 Jan, 3pm – 6pm")).toBeOnTheScreen();
    expect(screen.getByText("406 ANG MO KIO AVENUE 10, #05-123")).toBeOnTheScreen();
    expect(screen.getByText("S$1.00")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Change problem" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Change where" })).toBeOnTheScreen();
    await press("Change when");
    expect(await screen.findByRole("header", { name: "When do you need a plumber?" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "3pm – 6pm" })).toBeChecked();
  });

  it("'Find a plumber' posts the job with the token and shows 'Job posted'", async () => {
    jobs.post.mockResolvedValue(posted());
    await toReview();
    await press("Find a plumber");
    expect(jobs.post).toHaveBeenCalledWith(
      { trade: "PLUMBER", description: "Leaking pipe.", urgency: "SCHEDULED", scheduledDate: "2030-01-07", timeSlot: "EVENING", addressId: "AdHome01" },
      "access-1",
    );
    expect(await screen.findByRole("header", { name: "Job posted" })).toBeOnTheScreen();
    expect(screen.getByText("Licensed plumbers can now accept it for Mon 7 Jan, 3pm – 6pm.")).toBeOnTheScreen();
    expect(screen.getByText("S$1.00")).toBeOnTheScreen();
    expect(screen.queryByText(/^Step /)).toBeNull();
  });

  it("posts an urgent job without a day or time", async () => {
    jobs.post.mockResolvedValue(posted({ urgency: "URGENT", scheduledDate: null, timeSlot: null }));
    await renderRouter(appRoutes, { initialUrl: "/book/plumber" });
    await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "  The kitchen tap drips.  ");
    await cont();
    await fireEvent.press(await screen.findByRole("radio", { name: /^Urgent/ }));
    await cont();
    await screen.findByRole("header", { name: "Where?" });
    await cont();
    expect(await screen.findByText("Urgent · now")).toBeOnTheScreen();
    await press("Find a plumber");
    expect(jobs.post).toHaveBeenCalledWith({ trade: "PLUMBER", description: "The kitchen tap drips.", urgency: "URGENT", addressId: "AdHome01" }, "access-1");
    expect(await screen.findByText("Nearby plumbers on standby can now accept it.")).toBeOnTheScreen();
  });

  it("'View job' opens the posted job", async () => {
    jobs.post.mockResolvedValue(posted());
    jobs.get.mockResolvedValue(posted());
    await toReview();
    await press("Find a plumber");
    await fireEvent.press(await screen.findByRole("button", { name: "View job" }));
    expect(screen).toHavePathname("/job/Jb12abCD");
    expect(await screen.findByRole("header", { name: "Plumber job" })).toBeOnTheScreen();
  });

  it("'Back to Home' goes home after posting", async () => {
    jobs.post.mockResolvedValue(posted());
    await toReview();
    await press("Find a plumber");
    await fireEvent.press(await screen.findByRole("button", { name: "Back to Home" }));
    expect(screen).toHavePathname("/");
  });

  it.each(["timeSlot", "scheduledDate"])("a server error on %s sends the customer back to When, with the time cleared", async (fieldName) => {
    jobs.post.mockRejectedValue(new ApiError(400, "invalid_request", "That window is closed.", fieldName));
    await toReview();
    await press("Find a plumber");
    expect(await screen.findByRole("header", { name: "When do you need a plumber?" })).toBeOnTheScreen();
    expect(screen.getByText("Pick a time.")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "3pm – 6pm" })).not.toBeChecked();
  });

  it("other server errors stay on review in a notice", async () => {
    jobs.post.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await toReview();
    await press("Find a plumber");
    expect(await screen.findByText("Couldn’t post your job")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Check and confirm" })).toBeOnTheScreen();
  });
});
