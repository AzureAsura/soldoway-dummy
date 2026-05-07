"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/use-campaigns";
import { SidebarLayout } from "@/app/components/sidebar-layout";
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
      case "reward_asc": list = [...list].sort((a, b) => a.reward_per_meeting - b.reward_per_meeting); break;
      case "newest": list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "capacity": list = [...list].sort((a, b) => (b.meeting_capacity - b.meetings_used) - (a.meeting_capacity - a.meetings_used)); break;
    }
    return list;
  }, [campaigns, selectedCategory, sortBy, search]);

  return (
    <SidebarLayout role="SALES">
      <div className=" mx-auto p-4 md:p-8 animate-fade-in">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">Campaign Marketplace</h1>
          <p className="text-gray-500 text-base">
            Browse active campaigns and earn SOL for every approved meeting.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <input
            type="text"
            placeholder="Search campaigns…"
            className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="h-10 bg-gray-200 rounded mb-4" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-300 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center">
            <div className="text-5xl mb-4 text-gray-300">🔍</div>
            <h3 className="text-xl font-bold text-black mb-2">No campaigns found</h3>
            <p className="text-gray-500">
              {selectedCategory || search ? "Try adjusting your filters." : "Check back later!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const remaining = campaign.meeting_capacity - campaign.meetings_used;
  const progress = campaign.meeting_capacity > 0
    ? (campaign.meetings_used / campaign.meeting_capacity) * 100
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group flex flex-col">
      {/* Top */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-bold text-lg text-black leading-tight truncate">
            {campaign.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{campaign.company}</p>
        </div>
        <span className="shrink-0 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-1 rounded-md">
          {campaign.reward_per_meeting} SOL
        </span>
      </div>

      {/* Category */}
      <span className="inline-block text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md font-medium mb-3 self-start">
        {campaign.category}
      </span>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-5 flex-1 leading-relaxed">
        {campaign.description || "No description provided."}
      </p>

      {/* Capacity */}
      <div className="mb-5">
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
          <span>{remaining} slots left</span>
          <span>{campaign.meetings_used}/{campaign.meeting_capacity}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mb-5">
        <span className="text-xs text-gray-500 font-medium">
          Budget left: <span className="text-black font-semibold">{(campaign.budget_total - campaign.budget_used).toFixed(2)} SOL</span>
        </span>
        <span className="text-xs text-gray-400">
          by {campaign.business?.email?.split("@")[0] ?? "Anonymous"}
        </span>
      </div>

      <Link
        href={`/tasks/${campaign.id}`}
        className="block text-center bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-semibold text-sm transition-colors w-full"
      >
        View & Submit Meeting →
      </Link>
    </div>
  );
}
