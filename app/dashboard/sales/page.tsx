"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { toast } from "sonner";
import { useMeetings } from "@/hooks/use-meetings";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
import type { Meeting } from "@/types";

export default function SalesDashboardPage() {
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(user?.id);
  const [isClaiming, setIsClaiming] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const myMeetings = meetings ?? [];

  const totalEarned = myMeetings
    .filter((m) => m.payout?.status === "SUCCESS")
    .reduce((acc, m) => acc + (m.payout?.amount ?? 0), 0);

  const pendingPayouts = myMeetings.filter((m) => m.payout?.status === "PENDING");
  const totalClaimable = pendingPayouts.reduce(
    (acc, m) => acc + (m.payout?.amount ?? 0),
    0
  );

  // ── Claim handler ────────────────────────────────────────────────────────────
  async function handleClaim() {
    if (!user?.id || totalClaimable <= 0) return;
    setIsClaiming(true);
    const toastId = toast.loading("Processing claim on-chain…");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");

      const explorerUrl = `https://explorer.solana.com/tx/${data.tx_signature}?cluster=devnet`;
      toast.success("Reward claimed!", {
        id: toastId,
        description: `${data.claimed_amount?.toFixed(4)} SOL received.`,
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["meetings", user.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      toast.error("Claim failed", { id: toastId, description: msg });
    } finally {
      setIsClaiming(false);
    }
  }

  // ── Delete PENDING meeting ───────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Delete failed");
      }
      toast.success("Meeting deleted.");
      queryClient.invalidateQueries({ queryKey: ["meetings", user?.id] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (meetingsLoading) {
    return (
      <ClientOnly>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientOnly>
    );
  }

  const statusColor = {
    PENDING: "bg-warning/10 text-warning",
    APPROVED: "bg-success/10 text-success",
    REJECTED: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <ClientOnly>
      <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your meetings and claim on-chain rewards.
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 bg-secondary hover:bg-accent border border-border text-foreground px-5 py-2.5 rounded-xl font-semibold transition-colors"
          >
            Browse Campaigns →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Wallet Balance
            </div>
            <div className="text-3xl font-bold">
              {balanceLoading ? "…" : `${(balance ?? 0).toFixed(4)} SOL`}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-brand/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Claimable Rewards
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-brand">
                  {totalClaimable.toFixed(4)} SOL
                </div>
                <button
                  onClick={handleClaim}
                  disabled={totalClaimable <= 0 || isClaiming}
                  id="claim-btn"
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "Claiming…" : "Claim"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Total Earned
            </div>
            <div className="text-3xl font-bold text-success">
              {totalEarned.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Meetings List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Submitted Meetings</h2>
            <Link
              href="/tasks"
              className="text-sm text-brand hover:underline font-medium"
            >
              + Submit New Meeting
            </Link>
          </div>

          {myMeetings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse active campaigns and submit your first meeting.
              </p>
              <Link
                href="/tasks"
                className="text-brand hover:underline font-medium"
              >
                Browse campaigns →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myMeetings.map((m) => (
                <div
                  key={m.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-brand/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-base">{m.prospect_name}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            statusColor[m.status as keyof typeof statusColor]
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {(m.campaign as any)?.title}
                        </span>
                        {" · "}
                        {m.prospect_contact}
                        {" · "}
                        {new Date(m.scheduled_at).toLocaleDateString()}
                      </div>
                      {m.notes && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          "{m.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Reward info */}
                      {m.status === "APPROVED" && (
                        <div className="text-right">
                          <div className="text-sm font-bold text-success">
                            +{m.payout?.amount ?? (m.campaign as any)?.reward_per_meeting} SOL
                          </div>
                          {m.payout?.tx_signature && m.payout.status === "SUCCESS" && (
                            <a
                              href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand hover:underline font-mono"
                            >
                              {m.payout.tx_signature.slice(0, 8)}…
                            </a>
                          )}
                          {m.payout?.status === "PENDING" && (
                            <div className="text-xs text-warning">Pending claim</div>
                          )}
                        </div>
                      )}

                      {/* Actions for PENDING meetings */}
                      {m.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingMeeting(m)}
                            className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="text-xs px-3 py-1.5 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium disabled:opacity-50"
                          >
                            {deletingId === m.id ? "…" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSaved={() => {
            setEditingMeeting(null);
            queryClient.invalidateQueries({ queryKey: ["meetings", user?.id] });
          }}
        />
      )}
    </ClientOnly>
  );
}

// ── Inline Edit Modal ─────────────────────────────────────────────────────────
function EditMeetingModal({
  meeting,
  onClose,
  onSaved,
}: {
  meeting: Meeting;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    prospect_name: meeting.prospect_name,
    prospect_contact: meeting.prospect_contact,
    scheduled_at: meeting.scheduled_at
      ? new Date(meeting.scheduled_at).toISOString().slice(0, 16)
      : "",
    notes: meeting.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // We need a PUT/PATCH that handles field updates for PENDING meetings.
      // Since our PATCH only handles status changes, we'll use a direct DB update via a custom approach.
      // For now, delete and re-create (since it's still PENDING, no payout exists).
      // Actually, let's POST to a new meeting update endpoint.
      // We'll add a special PATCH body with fields instead:
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_name: form.prospect_name,
          prospect_contact: form.prospect_contact,
          scheduled_at: form.scheduled_at,
          notes: form.notes,
          _editFields: true,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Update failed");
      }
      toast.success("Meeting updated.");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
        <h3 className="text-xl font-bold mb-6">Edit Meeting</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Prospect Name</label>
            <input
              required
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.prospect_name}
              onChange={(e) => setForm((p) => ({ ...p, prospect_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Contact</label>
            <input
              required
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.prospect_contact}
              onChange={(e) => setForm((p) => ({ ...p, prospect_contact: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Date & Time</label>
            <input
              type="datetime-local"
              required
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.scheduled_at}
              onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-brand text-white rounded-xl font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
