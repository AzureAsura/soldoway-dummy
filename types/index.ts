// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = "BUSINESS" | "SALES";

export type TaskStatus = "ACTIVE" | "COMPLETED" | "WITHDRAWN";

export type MeetingStatus = "PENDING" | "CONFIRMED" | "DONE" | "REJECTED";

export type Outcome = "PRODUCTIVE" | "NOT_PRODUCTIVE";

export type PayoutStatus = "PENDING" | "SUCCESS" | "FAILED";

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type User = {
  id: string;
  wallet_address: string;
  email: string | null;
  role: Role;
  created_at: string;
};

export type Task = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  reward_amount: number; // SOL per meeting
  budget_total: number; // SOL
  budget_used: number; // SOL
  escrow_pda: string;
  status: TaskStatus;
  created_at: string;
  // Relations (populated when queried with include)
  business?: User;
  meetings?: Meeting[];
  withdrawals?: Withdrawal[];
};

export type Meeting = {
  id: string;
  task_id: string;
  sales_id: string;
  prospect_name: string;
  scheduled_at: string;
  calendar_event_id: string | null;
  outcome: Outcome | null;
  notes: string | null;
  status: MeetingStatus;
  created_at: string;
  // Relations
  task?: Task;
  sales?: User;
  payout?: Payout | null;
};

export type Payout = {
  id: string;
  meeting_id: string;
  sales_id: string;
  amount: number; // SOL
  tx_signature: string;
  status: PayoutStatus;
  created_at: string;
};

export type Withdrawal = {
  id: string;
  task_id: string;
  business_id: string;
  amount: number; // SOL
  tx_signature: string;
  created_at: string;
};

// ─── API Request/Response Types ───────────────────────────────────────────────

export type CreateTaskInput = {
  title: string;
  description?: string;
  reward_amount: number;
  budget_total: number;
};

export type CreateMeetingInput = {
  task_id: string;
  prospect_name: string;
  scheduled_at: string; // ISO 8601
  calendar_event_id?: string;
};

export type UpdateMeetingInput = {
  outcome: Outcome;
  notes?: string;
};

export type PayoutRequest = {
  meeting_id: string;
};

export type WithdrawRequest = {
  task_id: string;
};
