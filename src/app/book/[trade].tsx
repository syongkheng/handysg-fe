import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/ApiError";
import { authApi, type SavedAddress } from "@/api/auth";
import { jobsApi, type CustomerJob, type JobOptions } from "@/api/jobs";
import { useSession, useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Card, Icon, Screen, TextField, type IconName } from "@/components";
import { SheetInsets } from "@/components/SheetInsets";
import { SignedInOnly } from "@/features/account/SignedInOnly";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { StepHeader } from "@/features/auth/StepHeader";
import { TRADES, type Trade } from "@/features/home/trades";
import { AddressPicker } from "@/features/jobs/AddressPicker";
import { BookingBar } from "@/features/jobs/BookingBar";
import { IssueTiles, pickedIssues, SOMETHING_ELSE, toggleIssue } from "@/features/jobs/IssueTiles";
import { formatAddress, formatFee, whenLabel } from "@/features/jobs/jobFormat";
import { StepTransition } from "@/features/jobs/StepTransition";
import { WhenPicker, type WhenValue } from "@/features/jobs/WhenPicker";
import { radius, size, space, useTheme } from "@/theme";

const STEPS = ["problem", "when", "where", "review"] as const;
type Step = (typeof STEPS)[number];

/**
 * Post a job (wireframe A-Book), one question per screen: what's wrong → when → where → review and
 * confirm, with a progress bar in the App bar. The fixed fee is shown on the review step, before
 * the customer commits. Opened from a Home trade tile as /book/plumber, /book/electrician,
 * /book/locksmith. Photos come later, with private file storage.
 */
export default function BookScreen() {
  const { trade: tradeParam } = useLocalSearchParams<{ trade: string }>();
  const trade = TRADES.find((t) => t.id.toLowerCase() === tradeParam?.toLowerCase());
  const signedIn = useSession().status === "signedIn";

  return (
    <SheetInsets>
      {trade && signedIn ? (
        <BookFlow trade={trade} />
      ) : (
        <Screen header={<AppBar title={trade ? `Request ${trade.withArticle}` : "Book a job"} action="close" fallbackHref="/" />} gap={space[6]}>
          <SignedInOnly reason={trade ? `book ${trade.withArticle}` : "book a job"}>
            <Notice title="We don’t offer that service">Go back and pick a plumber, electrician or locksmith.</Notice>
          </SignedInOnly>
        </Screen>
      )}
    </SheetInsets>
  );
}

function BookFlow({ trade }: { trade: Trade }) {
  const router = useRouter();
  const { getAccessToken } = useSessionActions();
  const [options, setOptions] = useState<JobOptions>();
  const [addresses, setAddresses] = useState<SavedAddress[]>();
  const [loadError, setLoadError] = useState<string>();

  const [step, setStep] = useState<Step>("problem");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  // The description is what gets posted; issue tiles write their sentence into it.
  const [description, setDescription] = useState("");
  const [somethingElse, setSomethingElse] = useState(false);
  // Scheduled by default (urgent costs more); the day defaults to the first bookable one once options load.
  const [when, setWhen] = useState<WhenValue>({ urgency: "SCHEDULED" });
  const [chosenAddressId, setChosenAddressId] = useState<string>();
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [posted, setPosted] = useState<CustomerJob>();

  // Reload on focus: coming back from "Add an address" shows the new one.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const token = getAccessToken();
      Promise.all([jobsApi.options(token), authApi.listAddresses(token)])
        .then(([o, a]) => {
          if (!live) return;
          setOptions(o);
          setAddresses(a);
          setLoadError(undefined);
        })
        .catch((e) => live && setLoadError(authErrorMessage(e)));
      return () => {
        live = false;
      };
    }, [getAccessToken]),
  );

  const index = STEPS.indexOf(step);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const goTo = (next: Step) => {
    setDirection(STEPS.indexOf(next) > index ? "forward" : "back");
    setTried(false);
    setServerError(undefined);
    setStep(next);
  };

  // Each step remounts the screen (key), so it opens scrolled to the top and the progress bar animates.
  const frame = (children: ReactNode, footer?: ReactNode, withStep = true) => (
    <Screen
      key={withStep ? step : "flow"}
      header={
        <AppBar
          title={`Request ${trade.withArticle}`}
          action={withStep && index > 0 ? "back" : "close"}
          onBack={withStep && index > 0 ? () => goTo(STEPS[index - 1]) : close}
          step={withStep ? { current: index + 1, total: STEPS.length } : undefined}
        />
      }
      gap={space[6]}
      edges={footer ? ["left", "right"] : undefined}
      footer={footer}
      footerFlush
    >
      {children}
    </Screen>
  );

  if (posted) {
    return frame(
      <Posted job={posted} trade={trade} onView={() => router.replace({ pathname: "/job/[id]", params: { id: posted.id } })} onHome={() => router.replace("/")} />,
      undefined,
      false,
    );
  }
  if (loadError) return frame(<Notice title="Couldn’t load the booking form">{loadError}</Notice>, undefined, false);
  if (!options || !addresses) return frame(<AppText tone="textMuted">Loading…</AppText>, undefined, false);

  const tradeLower = trade.name.toLowerCase();
  const min = options.descriptionMin;
  const max = options.descriptionMax;
  const posting = description.trim();
  const whenValue: WhenValue = when.urgency === "SCHEDULED" && !when.date ? { ...when, date: options.dates[0]?.date } : when;
  // The chosen address, or the default one until the customer picks.
  const addressId = addresses.some((a) => a.id === chosenAddressId) ? chosenAddressId : (addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id);
  const address = addresses.find((a) => a.id === addressId);

  const problemError = posting.length < min ? `Pick what’s wrong, or describe it (at least ${min} characters).` : undefined;
  const whenError =
    whenValue.urgency === "SCHEDULED" && !whenValue.date ? "Pick a day." : whenValue.urgency === "SCHEDULED" && !whenValue.timeSlot ? "Pick a time." : undefined;
  const whereError = !addressId ? "Add the address where you need help." : undefined;
  const stepError = step === "problem" ? problemError : step === "when" ? whenError : step === "where" ? whereError : undefined;

  function next() {
    setTried(true);
    if (stepError) return;
    goTo(STEPS[index + 1]);
  }

  async function submit() {
    // Every step was checked on the way here; a step that's no longer valid sends the customer back to it.
    if (problemError) return goTo("problem");
    if (whenError) return goTo("when");
    if (whereError || !addressId) return goTo("where");
    setBusy(true);
    setServerError(undefined);
    try {
      const job = await jobsApi.post(
        {
          trade: trade.id,
          description: posting,
          urgency: whenValue.urgency,
          ...(whenValue.urgency === "SCHEDULED" ? { scheduledDate: whenValue.date, timeSlot: whenValue.timeSlot } : {}),
          addressId,
        },
        getAccessToken(),
      );
      setPosted(job);
    } catch (e) {
      const field = e instanceof ApiError ? e.fieldName : undefined;
      if (field === "scheduledDate" || field === "timeSlot") {
        // The window closed while they were filling in: back to When to pick another.
        setWhen({ ...whenValue, timeSlot: undefined });
        goTo("when");
        setTried(true);
      } else {
        setServerError(authErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  const continueBar = <ContinueBar label="Continue" onPress={next} />;
  const error = tried ? stepError : undefined;

  switch (step) {
    case "problem":
      return frame(
        <StepTransition key="problem" direction={direction}>
          <TradeHeader trade={trade} title="What’s wrong?">
            {`${LICENCE_LINE[trade.id]}. Tap what fits, then add details.`}
          </TradeHeader>
          <IssueTiles
            trade={trade}
            picked={pickedIssues(description, somethingElse)}
            onToggle={(label) =>
              label === SOMETHING_ELSE ? setSomethingElse((v) => !v) : setDescription((d) => toggleIssue(d, label).slice(0, max))
            }
          />
          <TextField
            label="Describe the problem"
            placeholder={PLACEHOLDERS[trade.id]}
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, max))}
            multiline
            rows={2}
            maxLength={max}
            error={error}
            helper={`No address or phone number, please. ${description.length}/${max}`}
          />
        </StepTransition>,
        continueBar,
      );

    case "when":
      return frame(
        <StepTransition key="when" direction={direction}>
          <StepHeader icon="calendar" title={`When do you need ${trade.withArticle}?`}>
            Urgent jobs go out now. Or pick a day and time, up to a week ahead.
          </StepHeader>
          <WhenPicker options={options} value={whenValue} tradeName={tradeLower} error={error} onChange={setWhen} />
        </StepTransition>,
        continueBar,
      );

    case "where":
      return frame(
        <StepTransition key="where" direction={direction}>
          <StepHeader icon="pin" title="Where?">
            {`The address where you need the ${tradeLower}.`}
          </StepHeader>
          <AddressPicker addresses={addresses} selectedId={addressId} onSelect={setChosenAddressId} />
          {error ? (
            <AppText variant="xs" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <PrivacyNote>Only shared with the technician after they accept, and hidden again once the job is done.</PrivacyNote>
        </StepTransition>,
        continueBar,
      );

    case "review":
      return frame(
        <StepTransition key="review" direction={direction}>
          <StepHeader icon="checkCircle" title="Check and confirm">
            {`Make sure everything’s right before we find you ${trade.withArticle}.`}
          </StepHeader>
          <Card style={{ gap: 0, paddingVertical: space[1] }}>
            <ReviewRow icon={trade.icon} label="Problem" value={posting} onChange={() => goTo("problem")} />
            <ReviewRow
              icon="calendar"
              label="When"
              value={whenLabel({ urgency: whenValue.urgency, scheduledDate: whenValue.date ?? null, timeSlot: whenValue.timeSlot ?? null })}
              onChange={() => goTo("when")}
            />
            <ReviewRow icon="pin" label="Where" value={address ? formatAddress(address) : ""} onChange={() => goTo("where")} last />
          </Card>
          <PrivacyNote>Your address is only shared with the technician after they accept.</PrivacyNote>
          {serverError ? <Notice title="Couldn’t post your job">{serverError}</Notice> : null}
        </StepTransition>,
        <BookingBar feeCents={options.callOutFeeCents} tradeName={tradeLower} label={`Find ${trade.withArticle}`} onPress={submit} loading={busy} />,
      );
  }
}

const PLACEHOLDERS: Record<Trade["id"], string> = {
  PLUMBER: "e.g. The pipe under the kitchen sink drips all day.",
  ELECTRICIAN: "e.g. The power trips whenever the water heater is on.",
  LOCKSMITH: "e.g. The digital lock’s battery is flat and the key is inside.",
};

/** Step 1's header: the trade's coloured icon chip beside the question, and one line under it. */
function TradeHeader({ trade, title, children }: { trade: Trade; title: string; children: string }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <View
          style={{
            width: size.tapTarget,
            height: size.tapTarget,
            borderRadius: radius.md,
            backgroundColor: color[trade.chip],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={trade.icon} color={color[trade.glyph]} />
        </View>
        <AppText variant="2xl" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </AppText>
      </View>
      <AppText tone="textMuted">{children}</AppText>
    </View>
  );
}

const LICENCE_LINE: Record<Trade["id"], string> = {
  PLUMBER: "PUB-licensed plumbers, checked by HandySG",
  ELECTRICIAN: "EMA-licensed electricians, checked by HandySG",
  LOCKSMITH: "Locksmiths, checked by HandySG",
};

/** A review line: icon, label over value, and "Change" (jumps back to that step). */
function ReviewRow({ icon, label, value, onChange, last = false }: { icon: IconName; label: string; value: string; onChange: () => void; last?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space[3],
        paddingVertical: space[3],
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: color.border,
      }}
    >
      <View style={{ paddingTop: 2 }}>
        <Icon name={icon} size={size.iconMd} color={color.textMuted} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <AppText variant="xs" tone="textMuted">
          {label}
        </AppText>
        <AppText weight={600}>{value}</AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Change ${label.toLowerCase()}`} onPress={onChange} hitSlop={space[3]}>
        <AppText variant="sm" weight={600} tone="link">
          Change
        </AppText>
      </Pressable>
    </View>
  );
}

/** The pinned bottom bar on steps 1–3: one full-width primary button. */
function ContinueBar({ label, onPress }: { label: string; onPress: () => void }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderTopWidth: 1,
        borderTopColor: color.border,
        paddingHorizontal: space[5],
        paddingTop: space[3],
        paddingBottom: Math.max(insets.bottom, space[4]),
      }}
    >
      <Button label={label} onPress={onPress} />
    </View>
  );
}

/** A small muted line with a padlock, for privacy reassurances. */
function PrivacyNote({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space[2] }}>
      <View style={{ paddingTop: 1 }}>
        <Icon name="lock" size={size.iconSm} color={color.textMuted} />
      </View>
      <AppText variant="xs" tone="textMuted" style={{ flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}

/** After posting: what happens next, and the job's summary. */
function Posted({ job, trade, onView, onHome }: { job: CustomerJob; trade: Trade; onView: () => void; onHome: () => void }) {
  return (
    <>
      <StepHeader icon="checkCircle" title="Job posted">
        {job.urgency === "URGENT"
          ? `Nearby ${trade.name.toLowerCase()}s on standby can now accept it.`
          : `Licensed ${trade.name.toLowerCase()}s can now accept it for ${whenLabel(job).replace(/^(Today|Tomorrow)/, (w) => w.toLowerCase())}.`}
      </StepHeader>
      <Card>
        <SummaryRow label="When" value={whenLabel(job)} />
        <SummaryRow label="Where" value={formatAddress(job.address)} />
        <SummaryRow label="Deposit / call-out fee" value={formatFee(job.callOutFeeCents)} />
      </Card>
      <Notice tone="info" title="What happens next">
        {`Once a ${trade.name.toLowerCase()} accepts, the job is theirs and they send you a quote. You approve the quote before any work starts.`}
      </Notice>
      <View style={{ gap: space[3] }}>
        <Button label="View job" onPress={onView} />
        <Button label="Back to Home" variant="secondary" onPress={onHome} />
      </View>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space[3] }}>
      <AppText tone="textMuted">{label}</AppText>
      <AppText weight={600} style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
}
