"use client";

import { useTasks } from "@/hooks/use-tasks";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";

export default function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const { role } = useAppStore();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading available tasks...</div>;
  }

  const activeTasks = tasks?.filter(t => t.status === "ACTIVE") || [];

  return (
    <div className="max-w-5xl mx-auto p-8 animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available Tasks</h1>
          <p className="text-muted-foreground mt-1">Browse active campaigns and start earning SOL by booking meetings.</p>
        </div>
        {role === "SALES" && (
          <Link 
            href="/meetings/new"
            className="bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            + Log New Meeting
          </Link>
        )}
      </div>

      {activeTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No active tasks right now</h3>
          <p className="text-muted-foreground">Check back later when businesses post new campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTasks.map(task => (
            <div key={task.id} className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-brand/40 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{task.title}</h3>
                <span className="bg-brand/10 text-brand text-sm font-bold px-3 py-1 rounded-lg">
                  {task.reward_amount} SOL / mtg
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                {task.description || "No description provided."}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border-low">
                <div className="text-xs text-muted-foreground">
                  By: {task.business?.email || "Anonymous Business"}
                </div>
                <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                  Budget left: {(task.budget_total - task.budget_used).toFixed(2)} SOL
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
