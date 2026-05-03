"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useTasks } from "@/hooks/use-tasks";

export default function NewMeetingPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { data: tasks, isLoading } = useTasks();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    task_id: "",
    prospect_name: "",
    scheduled_at: "",
    calendar_event_id: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Not authenticated");
    if (!formData.task_id) return toast.error("Please select a task");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salesId: user.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create meeting");
      }

      toast.success("Meeting logged successfully!");
      router.push("/dashboard/sales");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Log New Meeting</h1>
      <p className="text-muted-foreground mb-8">
        Link a meeting to an active campaign. After the meeting, submit the outcome to get your SOL reward.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-2">Select Task/Campaign</label>
          <select
            required
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
            value={formData.task_id}
            onChange={(e) => setFormData(p => ({ ...p, task_id: e.target.value }))}
            disabled={isLoading}
          >
            <option value="">{isLoading ? "Loading tasks..." : "-- Select a task --"}</option>
            {tasks?.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.reward_amount} SOL reward)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Prospect Name</label>
          <input
            type="text"
            required
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="e.g., John Doe - Acme Corp"
            value={formData.prospect_name}
            onChange={(e) => setFormData(p => ({ ...p, prospect_name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              required
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              value={formData.scheduled_at}
              onChange={(e) => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Calendar Event ID (Optional)</label>
            <input
              type="text"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="cal_... or google_..."
              value={formData.calendar_event_id}
              onChange={(e) => setFormData(p => ({ ...p, calendar_event_id: e.target.value }))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Log Meeting"}
        </button>
      </form>
    </div>
  );
}
