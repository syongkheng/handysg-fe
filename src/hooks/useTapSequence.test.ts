import { act, renderHook } from "@testing-library/react-native";
import { SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS, useTapSequence } from "./useTapSequence";

describe("useTapSequence", () => {
  let now = 0;
  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  const tap = async (press: () => void, gapMs: number) => {
    now += gapMs;
    await act(async () => press());
  };

  it("unlocks on the 7th quick tap, not before", async () => {
    const onUnlock = jest.fn();
    const { result } = await renderHook(() => useTapSequence(onUnlock));
    for (let i = 0; i < SECRET_TAP_COUNT - 1; i++) await tap(result.current, 200);
    expect(onUnlock).not.toHaveBeenCalled();
    await tap(result.current, 200);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("starts counting again after a slow tap", async () => {
    const onUnlock = jest.fn();
    const { result } = await renderHook(() => useTapSequence(onUnlock));
    for (let i = 0; i < 5; i++) await tap(result.current, 200);
    await tap(result.current, SECRET_TAP_WINDOW_MS + 1); // counts as tap 1 again
    for (let i = 0; i < SECRET_TAP_COUNT - 2; i++) await tap(result.current, 200);
    expect(onUnlock).not.toHaveBeenCalled();
    await tap(result.current, 200);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("needs a fresh run of taps to unlock a second time", async () => {
    const onUnlock = jest.fn();
    const { result } = await renderHook(() => useTapSequence(onUnlock, 3));
    for (let i = 0; i < 4; i++) await tap(result.current, 100);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 2; i++) await tap(result.current, 100);
    expect(onUnlock).toHaveBeenCalledTimes(2);
  });
});
