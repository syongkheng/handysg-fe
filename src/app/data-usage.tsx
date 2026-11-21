import { useRouter } from "expo-router";
import { View } from "react-native";
import { AppBar, AppText, Card, Screen } from "@/components";
import { space } from "@/theme";

/**
 * Data Usage Guide, opened from Profile: a plain-language summary of how HandySG handles
 * personal data. It only states rules the app already follows (CLAUDE.md, PDPA rules for code).
 * It is not a legal document; the privacy policy holds the full terms. Never add retention
 * periods or other promises here until they are decided.
 */
const SECTIONS: readonly { title: string; body: string }[] = [
  {
    title: "What we collect",
    body: "Your account details, the service address you save, and the details and photos you add to a job. Technicians also upload their licence for approval.",
  },
  {
    title: "Who sees your address",
    body: "Only the technician who accepts your job, and only after they accept. It is hidden from them again once the job is complete.",
  },
  {
    title: "Contacting your technician",
    body: "You talk through in-app chat. Phone numbers are never shared between customers and technicians.",
  },
  {
    title: "How we protect it",
    body: "Your address and phone number are encrypted. Licence documents and job photos are kept in private storage and only opened through short-lived links.",
  },
  {
    title: "Where it is kept",
    body: "Your data is stored in Singapore.",
  },
  {
    title: "Your choices",
    body: "You can ask us to delete your account or send you a copy of your personal data.",
  },
];

export default function DataUsageScreen() {
  const router = useRouter();
  return (
    <Screen header={<AppBar title="Data Usage Guide" parent="Profile" fallbackHref="/profile" />}>
      <AppText tone="textMuted">A plain-language summary of how HandySG uses your personal data.</AppText>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: space[1] }}>
          <AppText variant="md" weight={600} accessibilityRole="header">
            {s.title}
          </AppText>
          <AppText variant="sm" tone="textMuted">
            {s.body}
          </AppText>
        </Card>
      ))}
      <View style={{ gap: space[1] }}>
        <AppText variant="xs" tone="textMuted">
          This guide is a summary. The privacy policy sets out the full terms.
        </AppText>
        <AppText variant="sm" weight={600} tone="link" accessibilityRole="link" onPress={() => router.push({ pathname: "/privacy", params: { from: "data-usage" } })}>
          Read the privacy policy
        </AppText>
      </View>
    </Screen>
  );
}
