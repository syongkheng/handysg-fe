import { fireEvent, screen } from "@testing-library/react-native";
import { TRADES } from "@/features/home/trades";
import { renderWithTheme } from "@/test/render";
import { COMMON_ISSUES, IssueTiles, pickedIssues, SOMETHING_ELSE, toggleIssue } from "./IssueTiles";

const PLUMBER = TRADES.find((t) => t.id === "PLUMBER")!;

describe("toggleIssue", () => {
  it("writes the issue as a sentence into an empty description", () => {
    expect(toggleIssue("", "Leaking pipe")).toBe("Leaking pipe.");
    expect(toggleIssue("   ", "Leaking pipe")).toBe("Leaking pipe.");
  });

  it("appends after existing text with one space", () => {
    expect(toggleIssue("Kitchen sink.  ", "Leaking pipe")).toBe("Kitchen sink. Leaking pipe.");
  });

  it("takes the sentence out again if it's already there, tidying the spaces", () => {
    expect(toggleIssue("Leaking pipe.", "Leaking pipe")).toBe("");
    expect(toggleIssue("Leaking pipe. Water heater.", "Leaking pipe")).toBe("Water heater.");
    expect(toggleIssue("Kitchen. Leaking pipe. It drips.", "Leaking pipe")).toBe("Kitchen. It drips.");
  });

  it("toggling twice gets back to the trimmed original", () => {
    const start = "The sink under the window.";
    expect(toggleIssue(toggleIssue(start, "Water heater"), "Water heater")).toBe(start);
  });
});

describe("pickedIssues", () => {
  // "Water heater" is a tile for two trades, so it can be listed twice; only membership matters.
  const set = (labels: string[]) => [...new Set(labels)].sort();

  it("is derived from the text, so editing the text unpicks a tile", () => {
    expect(set(pickedIssues("Leaking pipe. Water heater.", false))).toEqual(["Leaking pipe", "Water heater"]);
    expect(set(pickedIssues("Leaking pipe Water heater.", false))).toEqual(["Water heater"]);
    expect(pickedIssues("", false)).toEqual([]);
  });

  it("adds Something else only from its own flag, never from the text", () => {
    expect(pickedIssues("Something else.", false)).toEqual([]);
    expect(pickedIssues("", true)).toEqual([SOMETHING_ELSE]);
  });
});

describe("COMMON_ISSUES", () => {
  it("offers six tiles per trade, ending with Something else", () => {
    for (const issues of Object.values(COMMON_ISSUES)) {
      expect(issues).toHaveLength(6);
      expect(issues.at(-1)?.label).toBe(SOMETHING_ELSE);
    }
  });
});

describe("IssueTiles", () => {
  it("shows the trade's tiles as checkboxes, checked when picked, and reports taps", async () => {
    const onToggle = jest.fn();
    await renderWithTheme(<IssueTiles trade={PLUMBER} picked={["Water heater"]} onToggle={onToggle} />);
    for (const { label } of COMMON_ISSUES.PLUMBER) expect(screen.getByRole("checkbox", { name: label })).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Water heater" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Leaking pipe" })).not.toBeChecked();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Leaking pipe" }));
    expect(onToggle).toHaveBeenCalledWith("Leaking pipe");
  });
});
