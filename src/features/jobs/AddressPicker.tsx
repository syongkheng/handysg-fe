import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import type { SavedAddress } from "@/api/auth";
import { Icon, TextLink } from "@/components";
import { OptionCard } from "@/features/account/OptionCard";
import { AddressChip } from "@/features/home/AddressChip";
import { size, space, useTheme } from "@/theme";
import { formatAddress } from "./jobFormat";

/**
 * Pick one of the customer's saved addresses (option cards, each with a pencil to edit it), or add
 * one. "Add" and the pencil open the address form as a modal; the screen should reload its addresses
 * on focus to show the change.
 */
export function AddressPicker({ addresses, selectedId, onSelect }: { addresses: SavedAddress[]; selectedId?: string; onSelect: (id: string) => void }) {
  const router = useRouter();
  if (addresses.length === 0) return <AddressChip onPress={() => router.push("/register/address")} />;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Address" style={{ gap: space[2] }}>
      {addresses.map((a) => (
        <OptionCard
          key={a.id}
          title={a.label}
          hint={formatAddress(a)}
          selected={selectedId === a.id}
          onPress={() => onSelect(a.id)}
          trailing={<EditPencil label={`Edit ${a.label}`} onPress={() => router.push({ pathname: "/register/address", params: { id: a.id } })} />}
        />
      ))}
      <TextLink label="Add another address" icon="plus" spread onPress={() => router.push("/register/address")} />
    </View>
  );
}

/** A 16px pencil in color-link with its touch area padded to 44px (design system "Edit pencil"). */
function EditPencil({ label, onPress }: { label: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(size.tapTarget - size.iconSm) / 2}
      style={({ pressed }) => ({ paddingTop: space[1], opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="edit" size={size.iconSm} color={color.link} />
    </Pressable>
  );
}
