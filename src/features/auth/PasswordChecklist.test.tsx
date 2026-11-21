import { screen } from "@testing-library/react-native";
import { renderWithTheme } from "@/test/render";
import { PasswordChecklist } from "./PasswordChecklist";

const LABELS = [
  "At least 8 characters",
  "An uppercase letter (A–Z)",
  "A lowercase letter (a–z)",
  "A number (0–9)",
  "A special character (e.g. ! @ # ?)",
];

describe("PasswordChecklist", () => {
  it("lists every rule as 'not yet' for an empty password", async () => {
    await renderWithTheme(<PasswordChecklist password="" />);
    for (const l of LABELS) expect(screen.getByLabelText(`${l}, not yet`)).toBeOnTheScreen();
  });

  it("ticks only the rules that are met", async () => {
    await renderWithTheme(<PasswordChecklist password="abc1" />);
    expect(screen.getByLabelText("A lowercase letter (a–z), done")).toBeOnTheScreen();
    expect(screen.getByLabelText("A number (0–9), done")).toBeOnTheScreen();
    expect(screen.getByLabelText("At least 8 characters, not yet")).toBeOnTheScreen();
    expect(screen.getByLabelText("An uppercase letter (A–Z), not yet")).toBeOnTheScreen();
    expect(screen.getByLabelText("A special character (e.g. ! @ # ?), not yet")).toBeOnTheScreen();
  });

  it("ticks everything for a strong password", async () => {
    await renderWithTheme(<PasswordChecklist password="Abcdef1!" />);
    for (const l of LABELS) expect(screen.getByLabelText(`${l}, done`)).toBeOnTheScreen();
  });
});
