// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = "BUSINESS" | "SALES";

export type CampaignStatus = "ACTIVE" | "CLOSED" | "WITHDRAWN";

export type MeetingStatus = "PENDING" | "APPROVED" | "REJECTED";

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

export type Campaign = {
  id: string;
  business_id: string;
  title: string;
  company: string;
  category: string;
  description: string | null;
  reward_per_meeting: number; // SOL per approved meeting
  meeting_capacity: number;   // Max meetings
  meetings_used: number;      // Approved meetings so far
  budget_total: number;       // Total SOL deposited
  budget_used: number;        // SOL paid out
  escrow_pda: string;
  tx_signature: string | null;
  status: CampaignStatus;
  deposit_timestamp: string;
  created_at: string;
  // Relations
  business?: User;
  meetings?: Meeting[];
  withdrawals?: Withdrawal[];
};

export type Meeting = {
  id: string;
  campaign_id: string;
  sales_id: string;
  prospect_name: string;
  prospect_contact: string;
  scheduled_at: string;
  notes: string | null;
  outcome: Outcome | null;
  status: MeetingStatus;
  created_at: string;
  // Relations
  campaign?: Campaign;
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
  campaign_id: string;
  business_id: string;
  amount: number; // SOL
  tx_signature: string;
  created_at: string;
};

// ─── API Request/Response Types ───────────────────────────────────────────────

export type CreateCampaignInput = {
  title: string;
  company: string;
  category: string;
  description?: string;
  reward_per_meeting: number;
  meeting_capacity: number;
  budget_total: number;
};

export type CreateMeetingInput = {
  campaign_id: string;
  prospect_name: string;
  prospect_contact: string;
  scheduled_at: string; // ISO 8601
  notes?: string;
};

export type UpdateMeetingInput = {
  status: "APPROVED" | "REJECTED";
};

export type PayoutRequest = {
  meeting_id: string;
  business_id: string;
};

export type WithdrawRequest = {
  campaign_id: string;
  business_id: string;
};
