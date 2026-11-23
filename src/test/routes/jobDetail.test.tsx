// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// Signed in the real way: a saved refresh token is exchanged on launch (authApi.refresh is mocked),
// so the screen's getAccessToken() returns "access-1".
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { StyleSheet } from "react-native";
import { ApiError } from "@/api/ApiError";
import { authApi, type SavedAddress } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { jobsApi, type CustomerJob, type JobOptions } from "@/api/jobs";
import { tokenStore } from "@/auth/tokenStore";
import { tokens } from "@/test/authApiMock";
import { color } from "@/theme/tokens.generated";
import { appRoutes } from "./routes";

jest.mock("@/api/connectivity", () => ({ getConnectivity: jest.fn() }));
jest.mock("@/api/auth", () => jest.requireActual("@/test/authApiMock").authApiMockFactory());
jest.mock("@/api/jobs", () => ({
  jobsApi: { options: jest.fn(), post: jest.fn(), list: jest.fn(), get: jest.fn(), update: jest.fn(), cancel: jest.fn() },
}));
const auth = authApi as jest.Mocked<typeof authApi>;
const jobs = jobsApi as jest.Mocked<typeof jobsApi>;

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
const OFFICE: SavedAddress = { id: "AdOffc01", label: "Office", isDefault: false, postalCode: "018989", line1: "1 MARINA BOULEVARD", floor: "20", unit: "01" };

const job = (over: Partial<CustomerJob> = {}): CustomerJob => ({
  id: "Jb12abCD",
  trade: "PLUMBER",
  description: "Leaking pipe. Under the kitchen sink.",
  urgency: "SCHEDULED",
  scheduledDate: "2030-01-08",
  timeSlot: "MORNING",
  status: "OPEN",
  callOutFeeCents: 100,
  address: HOME,
  createdAt: "2026-11-22T11:48:07.749+08:00",
  ...over,
});

const URL = "/job/Jb12abCD";
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const open = async () => {
  await renderRouter(appRoutes, { initialUrl: URL });
  await screen.findByRole("header", { name: "Plumber job" });
};

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(jobs).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  auth.listAddresses.mockResolvedValue([HOME, OFFICE]);
  jobs.options.mockResolvedValue(OPTIONS);
  jobs.get.mockResolvedValue(job());
  jobs.list.mockResolvedValue([]);
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Job details: guests", () => {
  it("asks a guest to log in to see their jobs, without loading the job", async () => {
    await renderRouter(appRoutes, { initialUrl: URL });
    expect(await screen.findByText("Log in to see your jobs.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Job details" })).toBeOnTheScreen();
    expect(jobs.get).not.toHaveBeenCalled();
  });
});

describe("Job details", () => {
  beforeEach(async () => {
    await tokenStore.set("refresh-1");
    auth.refresh.mockResolvedValue(tokens());
  });

  it("loads the job by id with the token and shows status, problem, when, address and fee", async () => {
    await open();
    expect(jobs.get).toHaveBeenCalledWith("Jb12abCD", "access-1", expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Back to Jobs" })).toBeOnTheScreen();
    expect(screen.getByText("Finding a plumber")).toBeOnTheScreen();
    expect(screen.getByText("Posted 22 Nov 2026, 11:48am")).toBeOnTheScreen();
    expect(screen.getByText("Leaking pipe. Under the kitchen sink.")).toBeOnTheScreen();
    expect(screen.getByText("Tue 8 Jan, 9am – 12pm")).toBeOnTheScreen();
    expect(screen.getByText("406 ANG MO KIO AVENUE 10, #05-123")).toBeOnTheScreen();
    expect(screen.getByText("AMK Court")).toBeOnTheScreen();
    expect(screen.getByText("Singapore 560406")).toBeOnTheScreen();
    expect(screen.getByText("S$1.00")).toBeOnTheScreen();
  });

  it("shows the timeline: the current step, and what the next one is waiting for", async () => {
    await open();
    expect(screen.getByLabelText("Progress: Posted, step 1 of 4")).toBeOnTheScreen();
    expect(screen.getByText("Posted · current")).toBeOnTheScreen();
    expect(screen.getByText("Accepted")).toBeOnTheScreen();
    expect(screen.getByText("Waiting for a plumber to accept")).toBeOnTheScreen();
    expect(screen.getByText("Quote approved")).toBeOnTheScreen();
    expect(screen.getByText("Done")).toBeOnTheScreen();
  });

  it("while open, has a pencil on the problem, when and address (not cost) and a Cancel job button", async () => {
    await open();
    expect(screen.getByRole("button", { name: "Edit the problem" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Edit when" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Edit address" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Edit cost" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel job" })).toBeOnTheScreen();
  });

  it.each([
    ["ACCEPTED", "Accepted", "Accepted · current", "Waiting for the plumber’s quote"],
    ["QUOTED", "Quote to approve", "Accepted · current", "Waiting for you to approve the quote"],
    ["IN_PROGRESS", "In progress", "Quote approved · current", "Waiting for the plumber to finish"],
  ] as const)("once %s, shows no pencils and no Cancel job", async (status, pill, current, waiting) => {
    jobs.get.mockResolvedValue(job({ status }));
    await open();
    expect(screen.getByText(pill)).toBeOnTheScreen();
    expect(screen.getByText(current)).toBeOnTheScreen();
    expect(screen.getByText(waiting)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel job" })).toBeNull();
  });

  it("a completed job has every step done and nothing waiting", async () => {
    jobs.get.mockResolvedValue(job({ status: "COMPLETED" }));
    await open();
    expect(screen.getByText("Done · current")).toBeOnTheScreen();
    expect(screen.queryByText(/^Waiting for/)).toBeNull();
  });

  it("a cancelled job says so instead of the timeline", async () => {
    jobs.get.mockResolvedValue(job({ status: "CANCELLED" }));
    await open();
    expect(screen.getByText("This job was cancelled. No technician can accept it.")).toBeOnTheScreen();
    expect(screen.queryByText("Posted · current")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
  });

  it("an urgent job explains the standby rate", async () => {
    jobs.get.mockResolvedValue(job({ urgency: "URGENT", scheduledDate: null, timeSlot: null }));
    await open();
    expect(screen.getByText("Urgent · now")).toBeOnTheScreen();
    expect(screen.getByText(/The 24h standby rate is part of their quote/)).toBeOnTheScreen();
  });

  it.each([404, 400])("says 'Job not found' on a %i", async (status) => {
    jobs.get.mockRejectedValue(new ApiError(status, "not_found", "Not found"));
    await renderRouter(appRoutes, { initialUrl: URL });
    expect(await screen.findByText("Job not found")).toBeOnTheScreen();
    expect(screen.getByText("This job doesn’t exist, or it isn’t yours.")).toBeOnTheScreen();
  });

  it("shows other load errors as they are", async () => {
    jobs.get.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: URL });
    expect(await screen.findByText("Couldn’t load the job")).toBeOnTheScreen();
    expect(screen.getByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });

  describe("editing the problem", () => {
    it("opens the field with the current text, hides the other pencils, and saves the trimmed text", async () => {
      jobs.update.mockResolvedValue(job({ description: "The kitchen tap drips all day." }));
      await open();
      await press("Edit the problem");
      const field = await screen.findByLabelText("Describe the problem");
      expect(field.props.value).toBe("Leaking pipe. Under the kitchen sink.");
      expect(screen.queryByRole("button", { name: "Edit when" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Cancel job" })).toBeNull();
      expect(jobs.options).toHaveBeenCalledWith("access-1");
      await fireEvent.changeText(field, "  The kitchen tap drips all day.  ");
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      await press("Save");
      expect(jobs.update).toHaveBeenCalledWith("Jb12abCD", { description: "The kitchen tap drips all day." }, "access-1");
      expect(await screen.findByText("The kitchen tap drips all day.")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Describe the problem")).toBeNull();
      expect(screen.getByRole("button", { name: "Edit the problem" })).toBeOnTheScreen();
    });

    it("won't save a description that's too short", async () => {
      await open();
      await press("Edit the problem");
      await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "drip");
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      await press("Save");
      expect(screen.getByText("Tell the plumber a bit more (at least 10 characters).")).toBeOnTheScreen();
      expect(jobs.update).not.toHaveBeenCalled();
    });

    it("Discard closes the field without saving", async () => {
      await open();
      await press("Edit the problem");
      await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "Something completely different");
      await press("Discard");
      expect(screen.queryByLabelText("Describe the problem")).toBeNull();
      expect(screen.getByText("Leaking pipe. Under the kitchen sink.")).toBeOnTheScreen();
      expect(jobs.update).not.toHaveBeenCalled();
    });

    it("shows a save error inside the edit card and stays editing", async () => {
      jobs.update.mockRejectedValue(new ApiError(400, "invalid_request", "No phone numbers, please.", "description"));
      await open();
      await press("Edit the problem");
      await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "Call me on 91234567 please");
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      await press("Save");
      expect(await screen.findByText("Couldn’t save")).toBeOnTheScreen();
      expect(screen.getByText("No phone numbers, please.")).toBeOnTheScreen();
      expect(screen.getByLabelText("Describe the problem")).toBeOnTheScreen();
    });

    it("on a 409 (accepted meanwhile), closes the editor, shows why and reloads the job", async () => {
      jobs.update.mockRejectedValue(new ApiError(409, "job_not_open", "A technician has already accepted this job."));
      await open();
      jobs.get.mockResolvedValue(job({ status: "ACCEPTED" }));
      await press("Edit the problem");
      await fireEvent.changeText(await screen.findByLabelText("Describe the problem"), "The kitchen tap drips all day.");
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      await press("Save");
      expect(await screen.findByText("Couldn’t update the job")).toBeOnTheScreen();
      expect(screen.getByText("A technician has already accepted this job.")).toBeOnTheScreen();
      await waitFor(() => expect(jobs.get).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Accepted · current")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
      expect(screen.queryByLabelText("Describe the problem")).toBeNull();
    });
  });

  describe("editing when", () => {
    it("starts from the job's day and window, and can switch to urgent", async () => {
      jobs.update.mockResolvedValue(job({ urgency: "URGENT", scheduledDate: null, timeSlot: null }));
      await open();
      await press("Edit when");
      expect(await screen.findByRole("radio", { name: "Tue 8 Jan" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "9am – 12pm" })).toBeChecked();
      await fireEvent.press(screen.getByRole("radio", { name: /^Urgent/ }));
      await press("Save");
      expect(jobs.update).toHaveBeenCalledWith("Jb12abCD", { urgency: "URGENT" }, "access-1");
      expect(await screen.findByText("Urgent · now")).toBeOnTheScreen();
    });

    it("sends the whole 'when' for a new day and window", async () => {
      jobs.update.mockResolvedValue(job({ scheduledDate: "2030-01-07", timeSlot: "EVENING" }));
      await open();
      await press("Edit when");
      await fireEvent.press(await screen.findByRole("radio", { name: "Mon 7 Jan" }));
      // Morning isn't open on the 7th, so the window was cleared.
      await press("Save");
      expect(screen.getByText("Pick a time.")).toBeOnTheScreen();
      expect(jobs.update).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole("radio", { name: "3pm – 6pm" }));
      await press("Save");
      expect(jobs.update).toHaveBeenCalledWith("Jb12abCD", { urgency: "SCHEDULED", scheduledDate: "2030-01-07", timeSlot: "EVENING" }, "access-1");
    });

    it("asks for a day when the job's day is no longer bookable", async () => {
      jobs.get.mockResolvedValue(job({ scheduledDate: "2029-12-31" }));
      await open();
      await press("Edit when");
      await screen.findByRole("radio", { name: "Mon 7 Jan" });
      await press("Save");
      expect(screen.getByText("Pick a day.")).toBeOnTheScreen();
      expect(jobs.update).not.toHaveBeenCalled();
    });
  });

  describe("editing the address", () => {
    it("needs an address to be picked, then saves its id", async () => {
      jobs.update.mockResolvedValue(job({ address: OFFICE }));
      await open();
      await press("Edit address");
      await screen.findByRole("radio", { name: /^Office\./ });
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      await press("Save");
      expect(screen.getByText("Pick an address.")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("radio", { name: /^Office\./ }));
      await press("Save");
      expect(jobs.update).toHaveBeenCalledWith("Jb12abCD", { addressId: "AdOffc01" }, "access-1");
      expect(await screen.findByText("1 MARINA BOULEVARD, #20-01")).toBeOnTheScreen();
    });
  });

  describe("cancelling", () => {
    it("asks first; 'Keep job' keeps it", async () => {
      await open();
      await press("Cancel job");
      expect(await screen.findByRole("header", { name: "Cancel this job?" })).toBeOnTheScreen();
      expect(screen.getByText("Plumbers will no longer see it. You can post a new job any time.")).toBeOnTheScreen();
      await press("Keep job");
      expect(screen.queryByRole("header", { name: "Cancel this job?" })).toBeNull();
      expect(jobs.cancel).not.toHaveBeenCalled();
    });

    it("uses the amber warning style (recoverable), not red, for the button and the dialog", async () => {
      const fill = (el: ReturnType<typeof screen.getByRole>) => StyleSheet.flatten(el.props.style).backgroundColor;
      await open();
      expect(fill(screen.getByRole("button", { name: "Cancel job" }))).toBe(color.light.warning);
      await press("Cancel job");
      await screen.findByRole("header", { name: "Cancel this job?" });
      expect(fill(screen.getAllByRole("button", { name: "Cancel job" }).at(-1)!)).toBe(color.light.warning);
      expect(screen.getAllByRole("button", { name: "Cancel job" }).map(fill)).not.toContain(color.light.danger);
    });

    it("tapping the dialog's backdrop (labelled 'Keep job') keeps the job", async () => {
      await open();
      await press("Cancel job");
      await screen.findByRole("header", { name: "Cancel this job?" });
      expect(screen.queryByLabelText("Cancel")).toBeNull();
      await fireEvent.press(screen.getAllByLabelText("Keep job")[0]);
      expect(screen.queryByRole("header", { name: "Cancel this job?" })).toBeNull();
      expect(jobs.cancel).not.toHaveBeenCalled();
    });

    it("'Cancel job' in the dialog cancels it with the token and shows it cancelled", async () => {
      jobs.cancel.mockResolvedValue(job({ status: "CANCELLED" }));
      await open();
      await press("Cancel job");
      await screen.findByRole("header", { name: "Cancel this job?" });
      await fireEvent.press(screen.getAllByRole("button", { name: "Cancel job" }).at(-1)!);
      expect(jobs.cancel).toHaveBeenCalledWith("Jb12abCD", "access-1");
      expect(await screen.findByText("This job was cancelled. No technician can accept it.")).toBeOnTheScreen();
      // The status pill and the notice title.
      expect(screen.getAllByText("Cancelled")).toHaveLength(2);
      expect(screen.queryByRole("button", { name: "Cancel job" })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    });

    it("on a 409, shows why and reloads", async () => {
      jobs.cancel.mockRejectedValue(new ApiError(409, "job_not_open", "A technician has already accepted this job."));
      await open();
      jobs.get.mockResolvedValue(job({ status: "ACCEPTED" }));
      await press("Cancel job");
      await screen.findByRole("header", { name: "Cancel this job?" });
      await fireEvent.press(screen.getAllByRole("button", { name: "Cancel job" }).at(-1)!);
      expect(await screen.findByText("A technician has already accepted this job.")).toBeOnTheScreen();
      expect(await screen.findByText("Accepted · current")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Cancel job" })).toBeNull();
    });
  });
});
