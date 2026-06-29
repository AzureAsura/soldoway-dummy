"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/use-campaigns";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import type { Campaign } from "@/types";
import { TrendingUp, ArrowRight, Search } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Highest Reward", value: "reward_desc" },
  { label: "Lowest Reward", value: "reward_asc" },
  { label: "Newest First", value: "newest" },
  { label: "Most Capacity Left", value: "capacity" },
] as const;

/* ─── Neobrutalism style constants ──────────────────────────────────────── */
const neoCard =
  "bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none";
const neoBtnDark =
  "bg-black text-white font-bold border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none";
const neoBtnMain =
  "bg-[#6be1d9] text-black font-bold border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBadge =
  "border-2 border-black rounded-[15px] px-2 py-0.5 text-[12px] font-black";
const neoInput =
  "border-2 border-black rounded-[15px] bg-white px-4 py-3 text-black text-sm font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all w-full";

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
    <SidebarLayout role="SALES">
      <div className="bg-[#f0fdfa] min-h-full animate-fade-in">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <section className="px-6 md:px-8 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                <h1 className="text-[40px] md:text-[48px] leading-none font-black text-black uppercase tracking-tight mb-2">
                  Browse Campaigns
                </h1>
                <p className="text-lg text-black font-bold max-w-2xl">
                  Find high-growth Web3 campaigns that match your professional network and start earning SOL for every successful qualified meeting.
                </p>
              </div>
              {!isLoading && (
                <div className={`${neoBadge} bg-[#6be1d9] flex items-center gap-2 shrink-0 py-2 px-4`}>
                  <TrendingUp size={16} />
                  <span className="text-[11px] font-black uppercase tracking-wide">
                    {filtered.length} Active Deal{filtered.length !== 1 ? "s" : ""} Found
                  </span>
                </div>
              )}
            </div>

            {/* ── Filter Bar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px]">
              <div className="flex-1 min-w-[240px] relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className={`${neoInput} pl-11`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="relative min-w-[160px]">
                <select
                  className={`${neoInput} appearance-none pr-10 cursor-pointer`}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black font-black text-xs">▾</span>
              </div>
              <div className="relative min-w-[160px]">
                <select
                  className={`${neoInput} appearance-none pr-10 cursor-pointer`}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black font-black text-xs">⇅</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Campaign Grid ───────────────────────────────────────────── */}
        <section className="px-6 md:px-8 pb-24">
          <div className="max-w-7xl mx-auto">

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] p-6 animate-pulse">
                    <div className="flex justify-between mb-6">
                      <div className="h-6 bg-[#e0e0e0] border border-black/10 rounded-[15px] w-16" />
                      <div className="h-6 bg-[#e0e0e0] border border-black/10 rounded-[15px] w-16" />
                    </div>
                    <div className="h-6 bg-[#e0e0e0] rounded-[15px] w-3/4 mb-2" />
                    <div className="h-4 bg-[#e0e0e0] rounded-[15px] w-1/2 mb-6" />
                    <div className="h-10 bg-[#e0e0e0] rounded-[15px] mb-3" />
                    <div className="h-10 bg-[#e0e0e0] rounded-[15px] mb-6" />
                    <div className="h-12 bg-[#e0e0e0] rounded-[15px]" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filtered.length === 0 && (
              <div className="py-24 border-2 border-dashed border-black rounded-[15px] bg-white flex flex-col items-center text-center">
                <div className="text-5xl mb-4 opacity-30">🔍</div>
                <h3 className="text-xl font-black text-black mb-2">No campaigns found</h3>
                <p className="text-black/60 text-sm font-bold">
                  {selectedCategory || search ? "Try adjusting your filters." : "Check back later!"}
                </p>
              </div>
            )}

            {/* Cards */}
            {!isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </div>
        </section>
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
    <div className="bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] p-6 flex flex-col h-full transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">

      {/* Top: Category + Active badge */}
      <div className="flex justify-between items-start mb-6">
        <span className="border-2 border-black rounded-[15px] px-2 py-0.5 text-[12px] font-black bg-[#6be1d9] uppercase">
          {campaign.category}
        </span>
        <div className="flex items-center gap-1.5 border-2 border-black rounded-[15px] px-2 text-[10px] font-black uppercase bg-[#6be1d9]">
          <div className="w-2 h-2 bg-black rounded-full" />
          Active
        </div>
      </div>

      {/* Title + Company */}
      <h3 className="text-2xl font-black text-black leading-tight mb-1">
        {campaign.title}
      </h3>
      <p className="text-base text-black font-bold mb-4">{campaign.company}</p>

      {/* Description */}
      <p className="text-sm text-black line-clamp-2 mb-6 leading-relaxed flex-1">
        {campaign.description || "No description provided."}
      </p>

      {/* Divider */}
      <div className="border-t-2 border-black pt-6 mb-6 space-y-4">
        {/* Reward */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-black/60">Reward</span>
          <span className="text-xl font-black text-black leading-none">
            {campaign.reward_per_meeting} SOL{" "}
            <span className="text-[12px] font-bold text-black/60">/ meeting</span>
          </span>
        </div>

        {/* Availability */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-black/60">Availability</span>
          <div className="text-right w-1/2">
            <span className="text-sm font-black text-black">{remaining} slots left</span>
            {/* neo progress: grey track, yellow fill, border-r on fill */}
            <div className="bg-[#e0e0e0] border-2 border-black rounded-[2px] h-3 mt-1 overflow-hidden">
              <div
                className="bg-[#FACC00] h-full border-r-2 border-black transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/tasks/${campaign.id}`}
        className={`mt-auto w-full py-4 flex items-center justify-center gap-2 ${neoBtnMain}`}
      >
        View &amp; Apply
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
