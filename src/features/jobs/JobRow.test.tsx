import { fireEvent, screen } from "@testing-library/react-native";
import type { CustomerJob } from "@/api/jobs";
import { renderWithTheme } from "@/test/render";
import { BookingBar } from "./BookingBar";
import { JobRow } from "./JobRow";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const job = (over: Partial<CustomerJob> = {}): CustomerJob => ({
  id: "Jb12abCD",
  trade: "PLUMBER",
  description: "Leaking pipe.\nUnder the kitchen sink.",
  urgency: "URGENT",
  scheduledDate: null,
  timeSlot: null,
  status: "OPEN",
  callOutFeeCents: 100,
  address: { postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10", floor: "05", unit: "123" },
  createdAt: "2026-11-22T11:48:07.749+08:00",
  ...over,
});

describe("JobRow", () => {
  it("shows the title, meta line and status pill, and is a button with a chevron when pressable", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<JobRow job={job()} onPress={onPress} />);
    const row = screen.getByRole("button", { name: "Leaking pipe.. Plumber · Urgent · now. Finding a plumber" });
    expect(row.props.accessibilityHint).toBe("Opens the job");
    expect(screen.getByText("Leaking pipe.")).toBeOnTheScreen();
    expect(screen.getByText("Plumber · Urgent · now")).toBeOnTheScreen();
    expect(screen.getByText("Finding a plumber")).toBeOnTheScreen();
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is not a button without onPress", async () => {
    await renderWithTheme(<JobRow job={job({ status: "COMPLETED", urgency: "SCHEDULED", scheduledDate: "2030-01-08", timeSlot: "MORNING" })} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Plumber · Tue 8 Jan, 9am – 12pm")).toBeOnTheScreen();
    expect(screen.getByText("Done")).toBeOnTheScreen();
  });
});

describe("BookingBar", () => {
  it("shows the fee, the quote line and the button, and reports presses", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<BookingBar feeCents={3050} tradeName="plumber" label="Find a plumber" onPress={onPress} loading={false} />);
    expect(screen.getByText("Deposit / call-out fee")).toBeOnTheScreen();
    expect(screen.getByText("S$30.50")).toBeOnTheScreen();
    expect(screen.getByText("Repair cost is quoted by the plumber. You approve it before any work starts.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Find a plumber" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
