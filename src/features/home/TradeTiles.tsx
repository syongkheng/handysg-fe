import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { Icon } from "@/components/Icon";
import { radius, size, space, text, useTheme } from "@/theme";
import { TRADES, type Trade } from "./trades";

/**
 * The trade grid. With an odd number of trades the first one spans the full width and the rest
 * sit in pairs below, so no tile is left on its own. Every tile has the same layout and height.
 * Pressing a trade starts a booking.
 */
export function TradeTiles({ onSelect }: { onSelect: (trade: Trade) => void }) {
  const wide = TRADES.length % 2 === 1 ? TRADES[0] : undefined;
  const rest = wide ? TRADES.slice(1) : TRADES;
  const rows: Trade[][] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));

  return (
    <View style={{ gap: space[3] }}>
      {wide && <TradeTile trade={wide} onPress={() => onSelect(wide)} />}
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: space[3] }}>
          {row.map((trade) => (
            <TradeTile key={trade.id} trade={trade} onPress={() => onSelect(trade)} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * A trade card: icon chip with a chevron (it opens a booking), name, then the description.
 * The description always reserves two lines, so tiles are the same height whether it wraps or not.
 */
function TradeTile({ trade, onPress }: { trade: Trade; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trade.name}. ${trade.blurb}`}
      accessibilityHint={`Book ${trade.withArticle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed ? color.surfaceMuted : color.surface,
        borderColor: color.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space[4],
        gap: space[3],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <IconChip background={color[trade.chip]}>
          <Icon name={trade.icon} color={color[trade.glyph]} />
        </IconChip>
        <Icon name="chevronRight" size={size.iconSm} color={color.textMuted} />
      </View>
      <View style={{ gap: space[1] }}>
        <AppText variant="lg">{trade.name}</AppText>
        <AppText variant="xs" tone="textMuted" numberOfLines={2} style={{ minHeight: text.xs.lineHeight * 2 }}>
          {trade.blurb}
        </AppText>
      </View>
    </Pressable>
  );
}

function IconChip({ background, children }: { background: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: size.tapTarget,
        height: size.tapTarget,
        borderRadius: radius.md,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}
