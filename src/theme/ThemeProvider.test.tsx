import { render, screen } from "@testing-library/react-native";
import { AppText } from "@/components";
import { color, shadow } from "./tokens.generated";
import { ThemeProvider, useTheme } from "./ThemeProvider";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({ __esModule: true, default: jest.fn(() => "light") }));
// useColorScheme from "react-native" resolves to this module, so mocking it controls the "phone setting".
const useColorSchemeMock = jest.requireMock<{ default: jest.Mock }>("react-native/Libraries/Utilities/useColorScheme").default;

function Probe() {
  const theme = useTheme();
  return <AppText>{`${theme.preference}:${theme.scheme}:${theme.color.bg}:${theme.shadow === shadow[theme.scheme]}`}</AppText>;
}

describe("ThemeProvider", () => {
  beforeEach(() => useColorSchemeMock.mockReturnValue("light"));

  it("follows the phone's dark setting by default", async () => {
    useColorSchemeMock.mockReturnValue("dark");
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`system:dark:${color.dark.bg}:true`)).toBeOnTheScreen();
  });

  it.each([null, undefined, "unspecified", "light"])("falls back to light when the system reports %p", async (system) => {
    useColorSchemeMock.mockReturnValue(system);
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`system:light:${color.light.bg}:true`)).toBeOnTheScreen();
  });

  it("lets a forced preference override the system setting", async () => {
    useColorSchemeMock.mockReturnValue("dark");
    await render(
      <ThemeProvider initialPreference="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`light:light:${color.light.bg}:true`)).toBeOnTheScreen();
  });

  it("throws a clear error when useTheme is used outside the provider", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(render(<Probe />)).rejects.toThrow("useTheme must be used inside <ThemeProvider>");
    } finally {
      spy.mockRestore();
    }
  });
});
