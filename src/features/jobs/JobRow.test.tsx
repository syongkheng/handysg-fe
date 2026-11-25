import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { CustomerJob, JobStatus } from "@/api/jobs";
import { Icon, type IconName } from "@/components";
import { renderWithTheme } from "@/test/render";
import { color } from "@/theme/tokens.generated";
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
  statusChangedAt: "2026-11-22T11:48:07.749+08:00",
  ...over,
});

describe("JobRow", () => {
  it("shows the title, meta line and status pill, and is a button with a chevron when pressable", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<JobRow job={job()} onPress={onPress} />);
    const row = screen.getByRole("button", { name: /^Leaking pipe\.\. Plumber · Urgent · now\. Finding a plumber\. Step 1 of 4 · Posted\. Since .+, 11:48am\. Waiting for a plumber to accept$/ });
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

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] };
type Root = { queryAll: (pred: (n: Node) => boolean) => Node[] };
const L = color.light;

/** The path data of every SVG icon inside `root`, one array per icon, in render order. */
const iconPaths = (root: Root) =>
  root.queryAll((n) => n.type === "RNSVGSvgView").map((svg) => ({
    size: svg.props.width,
    stroke: svg.props.stroke,
    d: (svg as unknown as Root).queryAll((n) => n.type === "RNSVGPath").map((p) => p.props.d),
  }));

const icons = () => iconPaths(screen.container as unknown as Root);

/** Renders `ui` with a reference <Icon name={glyph}> after it; returns the reference's path data. */
const renderWithReference = async (ui: React.ReactElement, glyph: IconName) => {
  await renderWithTheme(
    <>
      {ui}
      <Icon name={glyph} color={L.text} />
    </>,
  );
  const all = icons();
  return all[all.length - 1].d;
};

/** The four progress segments' background colours. */
const segments = () => {
  const bar = screen.getByTestId("job-progress") as unknown as Node;
  const row = bar.children[bar.children.length - 1] as Node;
  return row.children.map((seg) => StyleSheet.flatten((seg as Node).props.style as never)?.backgroundColor);
};

const textColour = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;

// statusChangedAt in 2020 so the bubble reads "… 22 Nov 2020, 11:48am" whatever today is.
const OLD = "2020-11-22T11:48:07.749+08:00";

describe("JobRow card", () => {
  it("shows the trade's icon on its tinted chip, and allows a two-line title", async () => {
    const bolt = await renderWithReference(<JobRow job={job({ trade: "ELECTRICIAN" })} />, "bolt");
    const title = screen.getByText("Leaking pipe.");
    expect(title.props.numberOfLines).toBe(2);
    expect(textColour("Leaking pipe.")).toBe(L.text);
    const chipIcon = icons()[0];
    expect(chipIcon.d).toEqual(bolt);
    expect(chipIcon.stroke).toBe(L.catElectrician);
  });

  it("mutes a cancelled job: grey chip icon and muted title", async () => {
    await renderWithTheme(<JobRow job={job({ status: "CANCELLED" })} />);
    expect(textColour("Leaking pipe.")).toBe(L.textMuted);
    expect(icons()[0].stroke).toBe(L.textMuted);
    expect(screen.getByText("Cancelled")).toBeOnTheScreen();
  });

  it.each<[JobStatus, string, IconName]>([
    ["OPEN", "Finding a plumber", "activity"],
    ["ACCEPTED", "Accepted", "check"],
    ["QUOTED", "Quote to approve", "alert"],
    ["IN_PROGRESS", "In progress", "tool"],
    ["COMPLETED", "Done", "checkCircle"],
    ["CANCELLED", "Cancelled", "close"],
  ])("the %s pill says %s with a small %s icon", async (status, label, icon) => {
    const expected = await renderWithReference(<JobRow job={job({ status })} />, icon);
    expect(screen.getByText(label)).toBeOnTheScreen();
    const small = icons().filter((i) => i.size === 12);
    expect(small).toHaveLength(1);
    expect(small[0].d).toEqual(expected);
  });
});

describe("JobRow progress bar", () => {
  it.each<[JobStatus, string[]]>([
    ["OPEN", ["success", "warning", "border", "border"]],
    ["ACCEPTED", ["success", "success", "warning", "border"]],
    ["QUOTED", ["success", "success", "warning", "border"]],
    ["IN_PROGRESS", ["success", "success", "success", "warning"]],
    ["COMPLETED", ["success", "success", "success", "success"]],
    ["CANCELLED", ["textMuted", "border", "border", "border"]],
  ])("%s colours the four segments %j", async (status, tokens) => {
    await renderWithTheme(<JobRow job={job({ status })} />);
    expect(segments()).toEqual(tokens.map((t) => L[t as keyof typeof L]));
  });

  it("uses dark tokens in dark mode", async () => {
    await renderWithTheme(<JobRow job={job({ status: "ACCEPTED" })} />, { preference: "dark" });
    expect(segments()).toEqual([color.dark.success, color.dark.success, color.dark.warning, color.dark.border]);
  });

  it("press and hold shows the stage, when it got there and what it's waiting for; release hides it", async () => {
    await renderWithTheme(<JobRow job={job({ status: "ACCEPTED", statusChangedAt: OLD })} onPress={jest.fn()} />);
    expect(screen.queryByText("Step 2 of 4 · Accepted")).toBeNull();
    const bar = screen.getByTestId("job-progress");
    await fireEvent(bar, "longPress");
    expect(screen.getByText("Step 2 of 4 · Accepted")).toBeOnTheScreen();
    expect(screen.getByText("Since 22 Nov 2020, 11:48am")).toBeOnTheScreen();
    expect(screen.getByText("Waiting for the plumber’s quote")).toBeOnTheScreen();
    await fireEvent(bar, "pressOut");
    expect(screen.queryByText("Step 2 of 4 · Accepted")).toBeNull();
    expect(screen.queryByText("Since 22 Nov 2020, 11:48am")).toBeNull();
    expect(screen.queryByText("Waiting for the plumber’s quote")).toBeNull();
  });

  it("a completed job's bubble says Done with no waiting line", async () => {
    await renderWithTheme(<JobRow job={job({ status: "COMPLETED", statusChangedAt: OLD })} />);
    await fireEvent(screen.getByTestId("job-progress"), "longPress");
    expect(screen.getByText("Step 4 of 4 · Done")).toBeOnTheScreen();
    expect(screen.getByText("Done 22 Nov 2020, 11:48am")).toBeOnTheScreen();
    expect(screen.queryByText(/^Waiting for/)).toBeNull();
  });

  it("a cancelled job's bubble says where it stopped and when", async () => {
    await renderWithTheme(<JobRow job={job({ status: "CANCELLED", statusChangedAt: OLD })} />);
    await fireEvent(screen.getByTestId("job-progress"), "longPress");
    expect(screen.getByText("Stopped at step 1 · Posted")).toBeOnTheScreen();
    expect(screen.getByText("Cancelled 22 Nov 2020, 11:48am")).toBeOnTheScreen();
    expect(screen.queryByText(/^Waiting for/)).toBeNull();
  });

  it("the bubble lets touches through (pointerEvents none) and the bar is not a separate accessibility element", async () => {
    await renderWithTheme(<JobRow job={job()} onPress={jest.fn()} />);
    const bar = screen.getByTestId("job-progress");
    expect(bar.props.accessible).toBe(false);
    await fireEvent(bar, "longPress");
    const bubble = (bar as unknown as Node).children[0] as Node;
    expect(bubble.props.pointerEvents).toBe("none");
  });

  it("a short tap on the bar opens the job like the rest of the card, without showing the bubble", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<JobRow job={job()} onPress={onPress} />);
    await fireEvent.press(screen.getByTestId("job-progress"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Step 1 of 4 · Posted")).toBeNull();
  });

  it("a tap on the bar of a card without onPress does nothing, but hold still shows the bubble", async () => {
    await renderWithTheme(<JobRow job={job({ statusChangedAt: OLD })} />);
    const bar = screen.getByTestId("job-progress");
    await fireEvent.press(bar);
    expect(screen.queryByText("Step 1 of 4 · Posted")).toBeNull();
    await fireEvent(bar, "longPress");
    expect(screen.getByText("Step 1 of 4 · Posted")).toBeOnTheScreen();
    expect(screen.getByText("Waiting for a plumber to accept")).toBeOnTheScreen();
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
