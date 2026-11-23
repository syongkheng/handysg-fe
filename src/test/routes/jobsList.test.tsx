// Route tests live outside src/app/: Expo Router would treat any file there as a screen.
// The Jobs tab and Home's "Your jobs" list the signed-in customer's jobs and open /job/[id].
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { ApiError } from "@/api/ApiError";
import { authApi } from "@/api/auth";
import { getConnectivity } from "@/api/connectivity";
import { jobsApi, type CustomerJob } from "@/api/jobs";
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

const job = (id: string, description: string, over: Partial<CustomerJob> = {}): CustomerJob => ({
  id,
  trade: "PLUMBER",
  description,
  urgency: "URGENT",
  scheduledDate: null,
  timeSlot: null,
  status: "OPEN",
  callOutFeeCents: 100,
  address: { postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10", floor: "05", unit: "123" },
  createdAt: "2026-11-22T11:48:07.749+08:00",
  ...over,
});

const FOUR = [
  job("Jb000001", "Leaking pipe."),
  job("Jb000002", "Power trips.", { trade: "ELECTRICIAN", status: "QUOTED" }),
  job("Jb000003", "Locked out.", { trade: "LOCKSMITH", status: "COMPLETED" }),
  job("Jb000004", "Water heater."),
];

beforeEach(async () => {
  jest.clearAllMocks();
  Object.values(auth).forEach((f) => f.mockReset());
  Object.values(jobs).forEach((f) => f.mockReset());
  auth.logout.mockResolvedValue({ loggedOut: true });
  auth.listAddresses.mockResolvedValue([]);
  (getConnectivity as jest.Mock).mockResolvedValue({ status: "ok", color: "绿", timestamp: "t" });
  await tokenStore.clear();
});

describe("Jobs lists: guests", () => {
  it("never requests jobs for a guest", async () => {
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByText("Track your jobs")).toBeOnTheScreen();
    expect(jobs.list).not.toHaveBeenCalled();
  });
});

describe("Jobs lists: signed in", () => {
  beforeEach(async () => {
    await tokenStore.set("refresh-1");
    auth.refresh.mockResolvedValue(tokens());
  });

  it("the Jobs tab lists every job with its status, and a row opens the job", async () => {
    jobs.list.mockResolvedValue(FOUR);
    jobs.get.mockResolvedValue(FOUR[1]);
    await renderRouter(appRoutes, { initialUrl: "/jobs" });
    expect(await screen.findByText("Leaking pipe.")).toBeOnTheScreen();
    expect(jobs.list).toHaveBeenCalledWith("access-1", expect.any(AbortSignal));
    expect(screen.getByText("Water heater.")).toBeOnTheScreen();
    expect(screen.getByText("Quote to approve")).toBeOnTheScreen();
    expect(screen.getByText("Electrician · Urgent · now")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Power trips\./ }));
    expect(screen).toHavePathname("/job/Jb000002");
    expect(await screen.findByRole("header", { name: "Electrician job" })).toBeOnTheScreen();
  });

  it("the Jobs tab with no jobs offers 'Book a job', which goes Home", async () => {
    jobs.list.mockResolvedValue([]);
    await renderRouter(appRoutes, { initialUrl: "/jobs" });
    expect(await screen.findByText("No jobs yet. Book a plumber, electrician or locksmith from Home.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Book a job" }));
    expect(screen).toHavePathname("/");
  });

  it("the Jobs tab shows a load error with 'Try again', which reloads", async () => {
    jobs.list.mockRejectedValueOnce(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    jobs.list.mockResolvedValue([FOUR[0]]);
    await renderRouter(appRoutes, { initialUrl: "/jobs" });
    expect(await screen.findByText("Couldn’t load your jobs")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Leaking pipe.")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn’t load your jobs")).toBeNull();
    await waitFor(() => expect(jobs.list).toHaveBeenCalledTimes(2));
  });

  it("Home shows the latest three jobs and 'See all jobs' when there are more", async () => {
    jobs.list.mockResolvedValue(FOUR);
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByText("Leaking pipe.")).toBeOnTheScreen();
    expect(screen.getByText("Locked out.")).toBeOnTheScreen();
    expect(screen.queryByText("Water heater.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "See all jobs" }));
    expect(screen).toHavePathname("/jobs");
  });

  it("Home has no 'See all jobs' with three or fewer, and a row opens the job", async () => {
    jobs.list.mockResolvedValue(FOUR.slice(0, 2));
    jobs.get.mockResolvedValue(FOUR[0]);
    await renderRouter(appRoutes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: /^Leaking pipe\./ }));
    expect(screen).toHavePathname("/job/Jb000001");
    expect(await screen.findByRole("header", { name: "Plumber job" })).toBeOnTheScreen();
  });

  it("Home with no jobs says so", async () => {
    jobs.list.mockResolvedValue([]);
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByText("No jobs yet. Pick a trade above to book one.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "See all jobs" })).toBeNull();
  });

  it("Home shows a load error in place of the list", async () => {
    jobs.list.mockRejectedValue(new ApiError(0, "network_error", "Can't reach HandySG. Check your connection and try again."));
    await renderRouter(appRoutes, { initialUrl: "/" });
    expect(await screen.findByText("Can't reach HandySG. Check your connection and try again.")).toBeOnTheScreen();
  });
});
