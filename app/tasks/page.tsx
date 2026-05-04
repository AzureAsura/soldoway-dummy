"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/use-campaigns";
import type { Campaign } from "@/types";

const SORT_OPTIONS = [
  { label: "Highest Reward", value: "reward_desc" },
  { label: "Lowest Reward", value: "reward_asc" },
  { label: "Newest First", value: "newest" },
  { label: "Most Capacity Left", value: "capacity" },
] as const;

export default function TasksPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const cats = [...new Set((campaigns ?? []).map((c) => c.category))];
    return cats.sort();
  }, [campaigns]);

  const filtered = useMemo(() => {
    let list = (campaigns ?? []).filter((c) => c.status === "ACTIVE");
    if (selectedCategory) list = list.filter((c) => c.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "reward_desc": list = [...list].sort((a, b) => b.reward_per_meeting - a.reward_per_meeting); break;
      case "reward_asc":  list = [...list].sort((a, b) => a.reward_per_meeting - b.reward_per_meeting); break;
      case "newest":      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "capacity":    list = [...list].sort((a, b) => (b.meeting_capacity - b.meetings_used) - (a.meeting_capacity - a.meetings_used)); break;
    }
    return list;
  }, [campaigns, selectedCategory, sortBy, search]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Campaign Marketplace</h1>
        <p className="text-muted-foreground">
          Browse active campaigns and earn SOL for every approved meeting.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search campaigns…"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-border rounded w-3/4 mb-3" />
              <div className="h-3 bg-border rounded w-1/2 mb-6" />
              <div className="h-10 bg-border rounded mb-4" />
              <div className="h-9 bg-border rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-muted-foreground">
            {selectedCategory || search ? "Try adjusting your filters." : "Check back later!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const remaining = campaign.meeting_capacity - campaign.meetings_used;
  const progress = campaign.meeting_capacity > 0
    ? (campaign.meetings_used / campaign.meeting_capacity) * 100
    : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-brand/40 hover:shadow-md transition-all group flex flex-col">
      {/* Top */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight group-hover:text-brand transition-colors truncate">
            {campaign.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{campaign.company}</p>
        </div>
        <span className="shrink-0 ml-3 bg-brand/10 text-brand text-sm font-bold px-3 py-1 rounded-xl">
          {campaign.reward_per_meeting} SOL
        </span>
      </div>

      {/* Category */}
      <span className="inline-block text-xs bg-secondary px-2 py-0.5 rounded font-medium mb-3 self-start">
        {campaign.category}
      </span>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
        {campaign.description || "No description provided."}
      </p>

      {/* Capacity */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{remaining} slots left</span>
          <span>{campaign.meetings_used}/{campaign.meeting_capacity}</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-border mb-4">
        <span className="text-xs text-muted-foreground">
          Budget left: {(campaign.budget_total - campaign.budget_used).toFixed(2)} SOL
        </span>
        <span className="text-xs text-muted-foreground">
          by {campaign.business?.email?.split("@")[0] ?? "Anonymous"}
        </span>
      </div>

      <Link
        href={`/tasks/${campaign.id}`}
        className="block text-center bg-brand hover:bg-brand-dark text-white py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-md"
      >
        View & Submit Meeting →
      </Link>
    </div>
  );
}
