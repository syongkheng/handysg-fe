import { api } from "./client";
import type { SgAddress } from "./auth";
import type { TradeId } from "@/features/home/trades";

export type JobUrgency = "URGENT" | "SCHEDULED";
export type TimeSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type JobStatus = "OPEN" | "ACCEPTED" | "QUOTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/** GET /jobs/options: what the booking screen shows before posting. */
export interface JobOptions {
  callOutFeeCents: number;
  currency: "SGD";
  /** Every time window and its label. */
  timeSlots: { id: TimeSlot; label: string }[];
  /** The days that can be booked ("YYYY-MM-DD", Singapore), from today if any window is still open, each with its open windows. */
  dates: { date: string; timeSlots: TimeSlot[] }[];
  descriptionMin: number;
  descriptionMax: number;
}

export interface PostJobInput {
  trade: TradeId;
  description: string;
  urgency: JobUrgency;
  /** SCHEDULED only: one of the options' dates, and a window open that day. */
  scheduledDate?: string;
  timeSlot?: TimeSlot;
  /** A saved address's id. */
  addressId: string;
}

/** Changes to an open job: any of these. "When" is sent whole: urgency, plus date and slot for SCHEDULED. */
export interface UpdateJobInput {
  description?: string;
  urgency?: JobUrgency;
  scheduledDate?: string;
  timeSlot?: TimeSlot;
  addressId?: string;
}

/** A job as its customer sees it. */
export interface CustomerJob {
  id: string;
  trade: TradeId;
  description: string;
  urgency: JobUrgency;
  scheduledDate: string | null;
  timeSlot: TimeSlot | null;
  status: JobStatus;
  callOutFeeCents: number;
  address: SgAddress;
  /** ISO 8601, Singapore time. */
  createdAt: string;
}

/** The signed-in customer's jobs (backend/src/job). Every call needs the access token. */
export const jobsApi = {
  options: (token: string | null) => api.get<JobOptions>("/jobs/options", { token }),
  post: (input: PostJobInput, token: string | null) => api.post<CustomerJob>("/jobs", input, { token }),
  list: (token: string | null, signal?: AbortSignal) => api.get<CustomerJob[]>("/jobs", { token, signal }),
  /** Only while the job is open; 409 once a technician has accepted it. */
  update: (id: string, changes: UpdateJobInput, token: string | null) => api.patch<CustomerJob>(`/jobs/${encodeURIComponent(id)}`, changes, { token }),
  cancel: (id: string, token: string | null) => api.post<CustomerJob>(`/jobs/${encodeURIComponent(id)}/cancel`, undefined, { token }),
  get: (id: string, token: string | null, signal?: AbortSignal) => api.get<CustomerJob>(`/jobs/${encodeURIComponent(id)}`, { token, signal }),
};
