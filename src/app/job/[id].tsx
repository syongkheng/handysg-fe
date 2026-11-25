import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ApiError } from "@/api/ApiError";
import { authApi, type SavedAddress } from "@/api/auth";
import { jobsApi, type CustomerJob, type JobOptions, type UpdateJobInput } from "@/api/jobs";
import { useSessionActions } from "@/auth/SessionProvider";
import { AppBar, AppText, Button, Card, Icon, Screen, StatusPill, TextField } from "@/components";
import { DangerDialog } from "@/features/account/DangerDialog";
import { SignedInOnly } from "@/features/account/SignedInOnly";
import { authErrorMessage } from "@/features/auth/authErrors";
import { Notice } from "@/features/auth/Notice";
import { AddressPicker } from "@/features/jobs/AddressPicker";
import { formatAddress, formatFee, formatPostedAt, JOB_STEPS, jobStatusPill, jobStepIndex, jobWaitingFor, tradeName, whenLabel } from "@/features/jobs/jobFormat";
import { WhenPicker, type WhenValue } from "@/features/jobs/WhenPicker";
import { radius, size, space, useTheme } from "@/theme";

type State = { status: "loading" } | { status: "done"; job: CustomerJob } | { status: "error"; message: string; notFound: boolean };
type EditField = "description" | "when" | "address";

/**
 * One of the customer's jobs: status, what and when, where, and the fee (wireframe A-Job, before a
 * technician accepts). While the job is open (no technician yet), the problem, when and address
 * each have a pencil to edit just that field, and the job can be cancelled. The server refuses
 * both once a technician has accepted.
 */
export default function JobDetailScreen() {
  return (
    <Screen header={<AppBar title="Job details" parent="Jobs" fallbackHref="/jobs" />} gap={space[6]}>
      <SignedInOnly reason="see your jobs">
        <JobDetail />
      </SignedInOnly>
    </Screen>
  );
}

function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAccessToken } = useSessionActions();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // Editing: one field at a time. Options (slots, lengths) and saved addresses load on the first edit.
  const [editing, setEditing] = useState<EditField>();
  const [options, setOptions] = useState<JobOptions>();
  const [addresses, setAddresses] = useState<SavedAddress[]>();
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState<WhenValue>({ urgency: "SCHEDULED" });
  const [addressId, setAddressId] = useState<string>();
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Reload on focus (status may have changed; a new address may have been added for the picker).
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      const token = getAccessToken();
      jobsApi
        .get(id ?? "", token, controller.signal)
        .then((job) => setState({ status: "done", job }))
        .catch((e) => {
          if (controller.signal.aborted) return;
          const notFound = e instanceof ApiError && (e.httpStatus === 404 || e.httpStatus === 400);
          setState({ status: "error", message: authErrorMessage(e), notFound });
        });
      authApi
        .listAddresses(token)
        .then((a) => !controller.signal.aborted && setAddresses(a))
        .catch(() => {});
      return () => controller.abort();
    }, [id, getAccessToken, reloadKey]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (state.status === "loading") return <AppText tone="textMuted">Loading the job…</AppText>;
  if (state.status === "error") {
    return state.notFound ? (
      <Notice title="Job not found">This job doesn’t exist, or it isn’t yours.</Notice>
    ) : (
      <Notice title="Couldn’t load the job">{state.message}</Notice>
    );
  }

  const { job } = state;
  const pill = jobStatusPill(job.status, job.trade);
  const editable = job.status === "OPEN";
  const trade = tradeName(job.trade).toLowerCase();

  function startEdit(field: EditField) {
    setEditing(field);
    setTried(false);
    setError(undefined);
    setDescription(job.description);
    setWhen({ urgency: job.urgency, date: job.scheduledDate ?? undefined, timeSlot: job.timeSlot ?? undefined });
    setAddressId(undefined);
    if (!options) {
      jobsApi
        .options(getAccessToken())
        .then(setOptions)
        .catch((e) => setError(authErrorMessage(e)));
    }
  }

  const min = options?.descriptionMin ?? 1;
  const max = options?.descriptionMax ?? 1000;
  const fieldError =
    editing === "description" && description.trim().length < min
      ? `Tell the ${trade} a bit more (at least ${min} characters).`
      : editing === "when" && when.urgency === "SCHEDULED" && (!when.date || !options?.dates.some((d) => d.date === when.date))
        ? "Pick a day."
        : editing === "when" && when.urgency === "SCHEDULED" && !options?.dates.find((d) => d.date === when.date)?.timeSlots.includes(when.timeSlot!)
          ? "Pick a time."
        : editing === "address" && !addressId
          ? "Pick an address."
          : undefined;

  async function save() {
    setTried(true);
    if (fieldError) return;
    const changes: UpdateJobInput =
      editing === "description"
        ? { description: description.trim() }
        : editing === "when"
          ? { urgency: when.urgency, ...(when.urgency === "SCHEDULED" ? { scheduledDate: when.date, timeSlot: when.timeSlot } : {}) }
          : { addressId };
    setSaving(true);
    setError(undefined);
    try {
      const updated = await jobsApi.update(job.id, changes, getAccessToken());
      setState({ status: "done", job: updated });
      setEditing(undefined);
    } catch (e) {
      setError(authErrorMessage(e));
      // Accepted (or cancelled) meanwhile: reload, so the pencils disappear and the status is current.
      if (e instanceof ApiError && e.httpStatus === 409) {
        setEditing(undefined);
        setReloadKey((k) => k + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  async function cancelJob() {
    setConfirmCancel(false);
    setCancelling(true);
    setError(undefined);
    try {
      setState({ status: "done", job: await jobsApi.cancel(job.id, getAccessToken()) });
      setEditing(undefined);
    } catch (e) {
      setError(authErrorMessage(e));
      if (e instanceof ApiError && e.httpStatus === 409) setReloadKey((k) => k + 1);
    } finally {
      setCancelling(false);
    }
  }

  const editActions = (
    <View style={{ gap: space[2] }}>
      {tried && fieldError ? (
        <AppText variant="xs" tone="danger" accessibilityLiveRegion="polite">
          {fieldError}
        </AppText>
      ) : null}
      <View style={{ flexDirection: "row", gap: space[3] }}>
        <View style={{ flex: 1 }}>
          <Button label="Discard" variant="secondary" height="compact" onPress={() => setEditing(undefined)} disabled={saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Save" height="compact" onPress={save} loading={saving} disabled={!options} />
        </View>
      </View>
    </View>
  );

  return (
    <>
      <View style={{ gap: space[3] }}>
        <StatusPill label={pill.label} tone={pill.tone} />
        <AppText variant="2xl" accessibilityRole="header">
          {`${tradeName(job.trade)} job`}
        </AppText>
        <AppText tone="textMuted">{`Posted ${formatPostedAt(job.createdAt)}`}</AppText>
      </View>

      {job.status === "CANCELLED" ? (
        <Notice tone="info" title="Cancelled">
          This job was cancelled. No technician can accept it.
        </Notice>
      ) : (
        <Card>
          <Timeline current={jobStepIndex(job.status)} waitingFor={jobWaitingFor(job)} />
          {editable ? (
            <AppText variant="xs" tone="textMuted">
              Once one accepts, the job is locked to them and they send you a quote. Until then, you can edit or cancel it.
            </AppText>
          ) : null}
        </Card>
      )}

      {error && !editing ? <Notice title="Couldn’t update the job">{error}</Notice> : null}

      <EditableSection title="The problem" canEdit={editable && !editing} onEdit={() => startEdit("description")}>
        {editing === "description" ? (
          <Card>
            <TextField
              label="Describe the problem"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, max))}
              multiline
              maxLength={max}
              autoFocus
              helper={`Don’t include your address or phone number. ${description.length}/${max}`}
            />
            {error ? <Notice title="Couldn’t save">{error}</Notice> : null}
            {editActions}
          </Card>
        ) : (
          <Card>
            <AppText>{job.description}</AppText>
          </Card>
        )}
      </EditableSection>

      <EditableSection title="When" canEdit={editable && !editing} onEdit={() => startEdit("when")}>
        {editing === "when" ? (
          <Card>
            {options ? (
              <WhenPicker
                options={options}
                value={when}
                tradeName={trade}
                framed={false}
                onChange={setWhen}
              />
            ) : (
              <AppText tone="textMuted">Loading…</AppText>
            )}
            {error ? <Notice title="Couldn’t save">{error}</Notice> : null}
            {editActions}
          </Card>
        ) : (
          <Card>
            <AppText weight={600}>{whenLabel(job)}</AppText>
            {job.urgency === "URGENT" ? (
              <AppText variant="xs" tone="textMuted">
                Urgent jobs go to nearby technicians on standby. The 24h standby rate is part of their quote.
              </AppText>
            ) : null}
          </Card>
        )}
      </EditableSection>

      <EditableSection title="Address" canEdit={editable && !editing} onEdit={() => startEdit("address")}>
        {editing === "address" ? (
          <Card>
            {addresses ? <AddressPicker addresses={addresses} selectedId={addressId} onSelect={setAddressId} /> : <AppText tone="textMuted">Loading…</AppText>}
            {error ? <Notice title="Couldn’t save">{error}</Notice> : null}
            {editActions}
          </Card>
        ) : (
          <Card>
            <View style={{ gap: space[1] }}>
              <AppText weight={600}>{formatAddress(job.address)}</AppText>
              {job.address.line2 ? <AppText tone="textMuted">{job.address.line2}</AppText> : null}
              <AppText tone="textMuted">{`Singapore ${job.address.postalCode}`}</AppText>
            </View>
            <AppText variant="xs" tone="textMuted">
              Only the technician who accepts this job sees the address, and only until the job is done.
            </AppText>
          </Card>
        )}
      </EditableSection>

      <EditableSection title="Cost" canEdit={false}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space[3] }}>
            <AppText>Deposit / call-out fee</AppText>
            <AppText weight={600}>{formatFee(job.callOutFeeCents)}</AppText>
          </View>
          <AppText variant="xs" tone="textMuted">
            The repair cost is quoted by the technician. You approve it before any work starts.
          </AppText>
        </Card>
      </EditableSection>

      {editable && !editing ? <Button label="Cancel job" variant="warning" onPress={() => setConfirmCancel(true)} loading={cancelling} /> : null}
      <DangerDialog
        visible={confirmCancel}
        title="Cancel this job?"
        message={`${tradeName(job.trade)}s will no longer see it. You can post a new job any time.`}
        confirmLabel="Cancel job"
        cancelLabel="Keep job"
        tone="warning"
        onConfirm={cancelJob}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

/**
 * A titled section (like Section). With `canEdit`, a small pencil sits at the right end of the title row, about
 * the size of the heading text, and opens just this field for editing. The pencil is drawn small
 * but its touch area is padded out to 44px.
 */
function EditableSection({ title, canEdit, onEdit, children }: { title: string; canEdit: boolean; onEdit?: () => void; children: ReactNode }) {
  const { color } = useTheme();
  const pad = (size.tapTarget - size.iconSm) / 2; // 44px touch area around a 16px icon
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] }}>
        <AppText variant="md" weight={600} accessibilityRole="header">
          {title}
        </AppText>
        {canEdit && onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title.replace(/^The /, "the ").toLowerCase()}`}
            onPress={onEdit}
            hitSlop={pad}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="edit" size={size.iconSm} color={color.link} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Design system "Job timeline": a vertical line of 12px dots. Steps already done and the current
 * step are green (the current one in weight 600); the next step, the one the job is waiting on, is
 * amber with a line saying what it's waiting for; later steps are grey rings. Every state also has
 * words, so colour is never the only signal.
 */
function Timeline({ current, waitingFor }: { current: number; waitingFor?: string }) {
  const { color } = useTheme();
  const dot = space[3]; // 12px
  return (
    <View accessibilityLabel={`Progress: ${JOB_STEPS[current]}, step ${current + 1} of ${JOB_STEPS.length}`}>
      {JOB_STEPS.map((step, i) => {
        const done = i <= current;
        const next = i === current + 1;
        const last = i === JOB_STEPS.length - 1;
        const dotColor = done ? color.success : next ? color.warning : "transparent";
        return (
          <View key={step} style={{ flexDirection: "row", gap: space[3] }}>
            {/* The dot, and the line down to the next one (green once the next step is reached). */}
            <View style={{ alignItems: "center", width: dot }}>
              <View
                style={{
                  marginTop: space[1] + 2,
                  width: dot,
                  height: dot,
                  borderRadius: radius.full,
                  backgroundColor: dotColor,
                  borderWidth: done || next ? 0 : 2,
                  borderColor: color.borderStrong,
                }}
              />
              {!last ? <View style={{ flex: 1, width: 2, marginVertical: space[1], backgroundColor: i < current ? color.success : color.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space[4], gap: space[1] }}>
              <AppText weight={i === current ? 600 : 400} tone={done ? "text" : next ? "warningText" : "textMuted"}>
                {i === current ? `${step} · current` : step}
              </AppText>
              {next && waitingFor ? (
                <AppText variant="xs" tone="warningText">
                  {waitingFor}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
