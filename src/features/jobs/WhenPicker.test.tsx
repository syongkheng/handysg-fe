import { fireEvent, screen } from "@testing-library/react-native";
import type { JobOptions } from "@/api/jobs";
import { renderWithTheme } from "@/test/render";
import { WhenPicker, type WhenValue } from "./WhenPicker";

// Dates far from "today" so the labels never turn into Today / Tomorrow.
const OPTIONS: Pick<JobOptions, "dates" | "timeSlots"> = {
  timeSlots: [
    { id: "MORNING", label: "9am – 12pm" },
    { id: "AFTERNOON", label: "12pm – 3pm" },
    { id: "EVENING", label: "3pm – 6pm" },
  ],
  dates: [
    { date: "2030-01-07", timeSlots: ["EVENING"] },
    { date: "2030-01-08", timeSlots: ["MORNING", "AFTERNOON", "EVENING"] },
    { date: "2030-01-09", timeSlots: ["MORNING", "AFTERNOON"] },
  ],
};

const render = (value: WhenValue, extra: Partial<Parameters<typeof WhenPicker>[0]> = {}) => {
  const onChange = jest.fn();
  return renderWithTheme(<WhenPicker options={OPTIONS} value={value} onChange={onChange} tradeName="plumber" {...extra} />).then(() => onChange);
};

describe("WhenPicker", () => {
  it("urgent: shows the standby note and no day or time rows", async () => {
    await render({ urgency: "URGENT" });
    expect(screen.getByRole("radio", { name: /^Urgent · now/ })).toBeChecked();
    expect(screen.getByText("We’ll send it to every nearby plumber now. The 24h standby rate is part of their quote.")).toBeOnTheScreen();
    expect(screen.queryByText("Day")).toBeNull();
  });

  it("Schedule says how far ahead you can book, and picking it keeps the day or defaults to the first", async () => {
    const onChange = await render({ urgency: "URGENT" });
    expect(screen.getByRole("radio", { name: "Schedule. Up to Wed 9 Jan" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: /^Schedule/ }));
    expect(onChange).toHaveBeenLastCalledWith({ urgency: "SCHEDULED", date: "2030-01-07", timeSlot: undefined });
  });

  it("picking Urgent clears the day and window", async () => {
    const onChange = await render({ urgency: "SCHEDULED", date: "2030-01-08", timeSlot: "MORNING" });
    await fireEvent.press(screen.getByRole("radio", { name: /^Urgent · now/ }));
    expect(onChange).toHaveBeenLastCalledWith({ urgency: "URGENT" });
  });

  it("shows a day chip per bookable date, with the chosen one checked", async () => {
    await render({ urgency: "SCHEDULED", date: "2030-01-08" });
    expect(screen.getByRole("radio", { name: "Mon 7 Jan" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Tue 8 Jan" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Wed 9 Jan" })).toBeOnTheScreen();
  });

  it("disables the windows that aren't open that day and explains why", async () => {
    const onChange = await render({ urgency: "SCHEDULED", date: "2030-01-07" });
    const morning = screen.getByRole("radio", { name: "9am – 12pm, too soon to book today" });
    expect(morning).toBeDisabled();
    expect(screen.getByRole("radio", { name: "3pm – 6pm" })).toBeEnabled();
    expect(screen.getByText(/Times starting within the next hour can’t be booked for today/)).toBeOnTheScreen();
    await fireEvent.press(morning);
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("radio", { name: "3pm – 6pm" }));
    expect(onChange).toHaveBeenLastCalledWith({ urgency: "SCHEDULED", date: "2030-01-07", timeSlot: "EVENING" });
  });

  it("has no explanation line on a day with every window open", async () => {
    await render({ urgency: "SCHEDULED", date: "2030-01-08" });
    expect(screen.queryByText(/Times starting within the next hour/)).toBeNull();
  });

  it("changing the day keeps the window if it's open on the new day, otherwise clears it", async () => {
    const onChange = await render({ urgency: "SCHEDULED", date: "2030-01-08", timeSlot: "MORNING" });
    await fireEvent.press(screen.getByRole("radio", { name: "Wed 9 Jan" }));
    expect(onChange).toHaveBeenLastCalledWith({ urgency: "SCHEDULED", date: "2030-01-09", timeSlot: "MORNING" });
    await fireEvent.press(screen.getByRole("radio", { name: "Mon 7 Jan" }));
    expect(onChange).toHaveBeenLastCalledWith({ urgency: "SCHEDULED", date: "2030-01-07", timeSlot: undefined });
  });

  it("shows the error instead of the explanation line", async () => {
    await render({ urgency: "SCHEDULED", date: "2030-01-07" }, { error: "Pick a time." });
    expect(screen.getByText("Pick a time.")).toBeOnTheScreen();
    expect(screen.queryByText(/Times starting within the next hour/)).toBeNull();
  });

  it("works unframed too (inside an existing card)", async () => {
    await render({ urgency: "SCHEDULED", date: "2030-01-08", timeSlot: "AFTERNOON" }, { framed: false });
    expect(screen.getByRole("radio", { name: "12pm – 3pm" })).toBeChecked();
  });
});
