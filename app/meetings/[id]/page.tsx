"use client";

import { useParams, useRouter } from "next/navigation";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/app/components/client-only";
import Link from "next/link";

// /meetings/[id] — redirect to tasks/[id] or show campaign detail
// This page now shows the campaign detail for the given meeting's campaign.
export default function MeetingDetailRedirect() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Redirect to dashboard since the old meeting detail flow is now handled in tasks/[id]
  return (
    <ClientOnly>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-4xl mb-4">🔄</div>
          <h1 className="text-2xl font-bold mb-2">Flow Updated</h1>
          <p className="text-muted-foreground mb-6">
            Meeting submission is now part of the campaign detail page.
            Go to your dashboard or browse campaigns.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/sales"
              className="bg-brand text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-dark transition-colors"
            >
              My Dashboard
            </Link>
            <Link
              href="/tasks"
              className="border border-border px-5 py-2.5 rounded-xl font-semibold hover:bg-accent transition-colors"
            >
              Browse Campaigns
            </Link>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
