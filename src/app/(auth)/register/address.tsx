import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { ApiError } from "@/api/ApiError";
import { authApi, type AddressMatch, type SgAddress } from "@/api/auth";
import { useSession, useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Icon, Screen, TextField, TextLink } from "@/components";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { FLOOR_PATTERN, POSTAL_CODE_PATTERN, UNIT_PATTERN } from "@/features/auth/passwordRules";
import { registerStep } from "@/features/auth/RegisterDraft";
import { StepHeader } from "@/features/auth/StepHeader";
import { useCloseAuthFlow } from "@/features/auth/useCloseAuthFlow";
import { usePostalLookup } from "@/features/auth/usePostalLookup";
import { radius, size, space, useTheme } from "@/theme";

type Field = "postalCode" | "line1" | "line2" | "floor" | "unit";

type AddressForm = Required<Omit<SgAddress, "line2" | "floor" | "unit">> & { line2: string; floor: string; unit: string; landed: boolean };
const EMPTY: AddressForm = { postalCode: "", line1: "", line2: "", floor: "", unit: "", landed: false };

/**
 * Sign-up step 4 of 4 (the user is already signed in, email verified): the service address, in
 * Singapore's structured format. Typing the 6-digit postal code fills in the street (in capitals)
 * and building from OneMap, both editable. Floor and unit (#05-123) are required for a flat and
 * optional for landed property.
 * Optional: "I’ll add my address later" closes the flow, since the account already works; the
 * address is asked for again when it's needed (Home's address chip, booking).
 */
export default function RegisterAddressStep() {
  const { color } = useTheme();
  const close = useCloseAuthFlow();
  const { getAccessToken } = useSessionActions();
  const signedIn = useSession().status === "signedIn";
  const params = useLocalSearchParams<{ flow?: string; id?: string }>();
  const fromRegister = params.flow === "register";
  // Editing a saved address (from Your addresses): ?id=<public id>. The form is filled in once it loads.
  const editId = params.id;
  const [a, setA] = useState<AddressForm>(EMPTY);
  const [label, setLabel] = useState("Home");
  const [loadState, setLoadState] = useState<"ready" | "loading" | "missing" | "error">(editId ? "loading" : "ready");
  const [savedPostal, setSavedPostal] = useState<string>();
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<{ field?: Field; message: string }>();
  const lookup = usePostalLookup(a.postalCode);
  const filledFor = useRef<string | null>(null);

  const set = (patch: Partial<AddressForm>) => {
    setA((prev) => ({ ...prev, ...patch }));
    setServerError(undefined);
  };

  useEffect(() => {
    // Opened straight onto this page (a link, or a web refresh), the saved session may still be
    // restoring: wait until signed in, so the request carries the access token.
    if (!editId || !signedIn) return;
    let live = true;
    authApi
      .listAddresses(getAccessToken())
      .then((list) => {
        if (!live) return;
        const saved = list.find((x) => x.id === editId);
        if (!saved) return setLoadState("missing");
        // The saved postal code counts as already looked up, so OneMap doesn't overwrite line 1.
        filledFor.current = saved.postalCode;
        setA({
          postalCode: saved.postalCode,
          line1: saved.line1,
          line2: saved.line2 ?? "",
          floor: saved.floor ?? "",
          unit: saved.unit ?? "",
          landed: saved.landed ?? !(saved.floor && saved.unit),
        });
        setLabel(saved.label);
        setSavedPostal(saved.postalCode);
        setLoadState("ready");
      })
      // 404-style "not yours / gone" is handled above; anything else (offline, server error) is a load failure.
      .catch(() => live && setLoadState("error"));
    return () => {
      live = false;
    };
  }, [editId, signedIn, getAccessToken]);

  // One match: fill line 1 (and the building into line 2 if it's empty), once per postal code.
  const matches = lookup.status === "done" ? lookup.result.matches : [];
  useEffect(() => {
    if (lookup.status !== "done" || matches.length !== 1 || filledFor.current === a.postalCode) return;
    filledFor.current = a.postalCode;
    choose(matches[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup]);

  function choose(m: AddressMatch) {
    filledFor.current = a.postalCode;
    setA((prev) => ({ ...prev, line1: m.line1.toUpperCase(), line2: prev.line2 || m.building || "" }));
  }

  const errors = validate(a);
  const shown = (f: Field) => (serverError?.field === f ? serverError.message : tried ? errors[f] : undefined);

  async function onSubmit() {
    setTried(true);
    if (Object.keys(errors).length > 0) return;
    const address: SgAddress = { postalCode: a.postalCode, line1: a.line1.trim().toUpperCase(), landed: a.landed };
    if (a.line2?.trim()) address.line2 = a.line2.trim();
    if (a.floor.trim() && a.unit.trim()) {
      address.floor = a.floor.trim();
      address.unit = a.unit.trim();
    }
    setBusy(true);
    setServerError(undefined);
    try {
      const name = label.trim() || "Home";
      if (editId) await authApi.updateAddress(editId, address, name, getAccessToken());
      else await authApi.addAddress(address, getAccessToken(), name);
      close();
    } catch (e) {
      if (e instanceof ApiError && e.fieldName?.startsWith("address.")) {
        setServerError({ field: e.fieldName.slice("address.".length) as Field, message: "Check this field." });
      } else {
        setServerError({ message: authErrorMessage(e) });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={
        <AppBar
          title={editId ? "Edit address" : fromRegister ? "Create account" : "Add an address"}
          action="close"
          onBack={close}
          step={fromRegister ? registerStep("Address") : undefined}
        />
      }
      gap={space[6]}
    >
      {/* Signed in already: no swiping back to the code or email steps. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      {fromRegister ? (
        <Notice tone="success" title="Email verified">
          Your account is ready. Add your address now, or skip it and add it when you book.
        </Notice>
      ) : null}
      {editId ? (
        <StepHeader icon="pin" title="Edit this address">
          Jobs you’ve already posted keep the address they were posted with.
        </StepHeader>
      ) : (
        <StepHeader icon="pin" title="Where do you need help?">
          An address in Singapore. You can add more later.
        </StepHeader>
      )}

      {loadState === "loading" ? <AppText tone="textMuted">Loading the address…</AppText> : null}
      {loadState === "missing" ? <Notice title="Address not found">It may have been removed. Go back and try again.</Notice> : null}
      {loadState === "error" ? <Notice title="Couldn’t load the address">Check your connection, then go back and try again.</Notice> : null}

      {loadState === "ready" ? (
        <View style={{ gap: space[4] }}>
          <TextField
            label="Name"
            placeholder="e.g. Home, Office, Mum’s place"
            value={label}
            onChangeText={setLabel}
            maxLength={40}
            helper="So you can tell your addresses apart."
          />

          <TextField
            label="Postal code"
            value={a.postalCode}
            onChangeText={(t) => set({ postalCode: t.replace(/\D/g, "").slice(0, 6) })}
            keyboardType="number-pad"
            autoComplete="postal-code"
            textContentType="postalCode"
            maxLength={6}
            error={shown("postalCode")}
            helper={a.postalCode === savedPostal ? "Change the postal code to look up a different address." : lookupHelper(lookup, matches.length)}
            autoFocus={!a.postalCode}
          />

          {matches.length > 1 ? (
            <View accessibilityRole="radiogroup" accessibilityLabel="Matching addresses" style={{ gap: space[2] }}>
              {matches.map((m) => {
                const selected = a.line1 === m.line1.toUpperCase() && (!m.building || a.line2 === m.building);
                return (
                  <Pressable
                    key={`${m.line1}|${m.building ?? ""}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => choose(m)}
                    style={{
                      minHeight: size.tapTarget,
                      padding: space[3],
                      borderRadius: radius.md,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? color.primary : color.border,
                      backgroundColor: selected ? color.primarySubtle : color.surface,
                    }}
                  >
                    <AppText weight={600}>{m.line1}</AppText>
                    {m.building ? (
                      <AppText variant="xs" tone="textMuted">
                        {m.building}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <TextField
            label="Address line 1"
            placeholder="e.g. 123 ANG MO KIO AVENUE 3"
            value={a.line1}
            onChangeText={(t) => set({ line1: t.toUpperCase() })}
            autoCapitalize="characters"
            autoComplete="street-address"
            textContentType="streetAddressLine1"
            maxLength={100}
            error={shown("line1")}
          />

          <TextField
            label="Address line 2 (optional)"
            placeholder="Building or estate name"
            value={a.line2}
            onChangeText={(t) => set({ line2: t })}
            textContentType="streetAddressLine2"
            maxLength={100}
            error={shown("line2")}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: a.landed }}
            onPress={() => set({ landed: !a.landed })}
            style={{ minHeight: size.tapTarget, flexDirection: "row", alignItems: "center", gap: space[3] }}
          >
            <View
              style={{
                width: size.iconLg,
                height: size.iconLg,
                borderRadius: radius.sm / 2,
                borderWidth: 2,
                borderColor: a.landed ? color.primary : color.borderStrong,
                backgroundColor: a.landed ? color.primary : color.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {a.landed ? <Icon name="check" size={size.iconSm} color={color.onPrimary} /> : null}
            </View>
            <AppText style={{ flex: 1 }}>Landed property (house)</AppText>
          </Pressable>

          <View style={{ gap: space[1] }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space[2] }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={a.landed ? "Floor (optional)" : "Floor"}
                  placeholder="05"
                  value={a.floor}
                  onChangeText={(t) =>
                    set({
                      floor: t
                        .toUpperCase()
                        .replace(/[^0-9B]/g, "")
                        .slice(0, 3),
                    })
                  }
                  autoCapitalize="characters"
                  maxLength={3}
                  error={shown("floor")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label={a.landed ? "Unit (optional)" : "Unit"}
                  placeholder="123"
                  value={a.unit}
                  onChangeText={(t) =>
                    set({
                      unit: t
                        .toUpperCase()
                        .replace(/[^0-9A-Z]/g, "")
                        .slice(0, 6),
                    })
                  }
                  autoCapitalize="characters"
                  maxLength={6}
                  error={shown("unit")}
                />
              </View>
            </View>
            <AppText variant="xs" tone="textMuted">
              {a.floor && a.unit
              ? `Shown to your technician as #${padFloor(a.floor)}-${a.unit}`
              : a.landed
                ? "Optional for landed property. Fill in both if your home has one."
                : "As in #05-123: floor 05, unit 123."}
            </AppText>
          </View>

        </View>
      ) : null}

      <Notice tone="info" title="Who sees your address">
        Only the technician who accepts your job, and only until the job is done. It’s stored encrypted.
      </Notice>

      {serverError && !serverError.field ? <Notice title="Couldn’t save your address">{serverError.message}</Notice> : null}
      <View style={{ gap: space[2] }}>
        <Button
          label={editId ? "Save changes" : fromRegister ? "Save and finish" : "Save address"}
          onPress={onSubmit}
          loading={busy}
          disabled={loadState !== "ready"}
        />
        {/* Optional: the account already works. Home's "Add your address" chip asks again later. */}
        {editId ? null : (
          <View style={{ alignItems: "center" }}>
            <TextLink label="I’ll add my address later" onPress={close} disabled={busy} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const padFloor = (f: string) => (/^\d$/.test(f) ? `0${f}` : f);

function validate(a: {
  postalCode: string;
  line1: string;
  floor?: string;
  unit?: string;
  landed: boolean;
}): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (!POSTAL_CODE_PATTERN.test(a.postalCode)) e.postalCode = "Enter the 6-digit postal code.";
  if (!a.line1.trim()) e.line1 = "Enter the block or house number and street.";
  // A flat needs both. Landed property may leave both out, but if one is filled in, so must the other.
  if (!a.landed || a.floor || a.unit) {
    if (!a.floor || !FLOOR_PATTERN.test(a.floor)) e.floor = "Enter the floor, e.g. 05.";
    if (!a.unit || !UNIT_PATTERN.test(a.unit)) e.unit = "Enter the unit, e.g. 123.";
  }
  return e;
}

function lookupHelper(lookup: ReturnType<typeof usePostalLookup>, count: number): string | undefined {
  switch (lookup.status) {
    case "loading":
      return "Looking up this postal code…";
    case "error":
      return "Couldn't look up the address. Type it in below.";
    case "done":
      if (!lookup.result.available) return "Address lookup is unavailable. Type it in below.";
      if (count === 0) return "We couldn't find this postal code. Check it, or type the address below.";
      return count === 1 ? "Address filled in from OneMap. Edit it if needed." : "Pick your building below.";
    default:
      return "We'll fill in the street for you.";
  }
}
