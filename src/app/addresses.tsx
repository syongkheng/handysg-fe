import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { authApi, type SavedAddress } from "@/api/auth";
import { useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Icon, Screen, StatusPill } from "@/components";
import { SignedInOnly } from "@/features/account/SignedInOnly";
import { useAddresses } from "@/features/address/useAddresses";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { StepHeader } from "@/features/auth/StepHeader";
import { formatAddress } from "@/features/jobs/jobFormat";
import { radius, size, space, useTheme } from "@/theme";

/**
 * Your addresses: every saved service address, default first. Tap one to make it the default (the
 * one Home shows and booking preselects); "Add a new address" opens the address form, and the new
 * address appears here when it closes. Opened from Home's address chip and from Profile.
 */
export default function AddressesScreen() {
  return (
    <Screen header={<AppBar title="Your addresses" fallbackHref="/" />} gap={space[6]}>
      <SignedInOnly reason="manage your addresses">
        <Addresses />
      </SignedInOnly>
    </Screen>
  );
}

function Addresses() {
  const router = useRouter();
  const { getAccessToken } = useSessionActions();
  const list = useAddresses();
  const [saving, setSaving] = useState<string>();
  const [error, setError] = useState<string>();
  const add = () => router.push("/register/address");

  async function makeDefault(a: SavedAddress) {
    if (a.isDefault || saving) return;
    setSaving(a.id);
    setError(undefined);
    try {
      list.replace(await authApi.setDefaultAddress(a.id, getAccessToken()));
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSaving(undefined);
    }
  }

  if (list.status === "loading") return <AppText tone="textMuted">Loading your addresses…</AppText>;
  if (list.status === "error") {
    return (
      <>
        <Notice title="Couldn’t load your addresses">{list.message}</Notice>
        <Button label="Try again" variant="secondary" onPress={list.reload} />
      </>
    );
  }

  if (list.addresses.length === 0) {
    return (
      <>
        <StepHeader icon="pin" title="No saved addresses yet">
          Add the places you’d like help at, like home or your parents’ place. You pick one each time you book.
        </StepHeader>
        <Notice tone="info" title="Who sees your address">
          Only the technician who accepts your job, and only until the job is done. It’s stored encrypted.
        </Notice>
        <Button label="Add an address" onPress={add} />
      </>
    );
  }

  return (
    <>
      <View style={{ gap: space[2] }}>
        <AppText tone="textMuted">Your default address is shown on Home and picked first when you book. Tap another to make it the default, or the pencil to edit it.</AppText>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Default address" style={{ gap: space[3] }}>
        {list.addresses.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            busy={saving === a.id}
            onPress={() => makeDefault(a)}
            onEdit={() => router.push({ pathname: "/register/address", params: { id: a.id } })}
          />
        ))}
      </View>
      {error ? <Notice title="Couldn’t change your default">{error}</Notice> : null}
      <Button label="Add a new address" variant="secondary" onPress={add} />
    </>
  );
}

/**
 * A saved address: pin, label with a "Default" pill, the address lines, and a pencil (top right) that
 * opens it for editing. Tapping the card makes it the default; the default has a primary border.
 */
function AddressCard({ address: a, busy, onPress, onEdit }: { address: SavedAddress; busy: boolean; onPress: () => void; onEdit: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: a.isDefault, busy }}
      accessibilityLabel={`${a.label}, ${formatAddress(a)}${a.isDefault ? ", default" : ""}`}
      accessibilityHint={a.isDefault ? undefined : "Makes this your default address"}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: space[3],
        padding: a.isDefault ? space[4] - 1 : space[4],
        borderRadius: radius.lg,
        borderWidth: a.isDefault ? 2 : 1,
        borderColor: a.isDefault ? color.primary : color.border,
        backgroundColor: a.isDefault ? color.primarySubtle : pressed ? color.surfaceMuted : color.surface,
        opacity: busy ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: size.tapTarget,
          height: size.tapTarget,
          borderRadius: radius.md,
          backgroundColor: a.isDefault ? color.surface : color.primarySubtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="pin" size={size.iconMd} color={color.link} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
          <AppText weight={600}>{a.label}</AppText>
          {a.isDefault ? <StatusPill label="Default" tone="info" /> : null}
        </View>
        <AppText>{formatAddress(a)}</AppText>
        {a.line2 ? (
          <AppText variant="sm" tone="textMuted">
            {a.line2}
          </AppText>
        ) : null}
        <AppText variant="sm" tone="textMuted">{`Singapore ${a.postalCode}`}</AppText>
      </View>
      {/* A 16px pencil, its touch area padded out to 44px (design system "Edit pencil"). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${a.label}`}
        onPress={onEdit}
        hitSlop={(size.tapTarget - size.iconSm) / 2}
        style={({ pressed }) => ({ paddingTop: space[1], opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name="edit" size={size.iconSm} color={color.link} />
      </Pressable>
    </Pressable>
  );
}
