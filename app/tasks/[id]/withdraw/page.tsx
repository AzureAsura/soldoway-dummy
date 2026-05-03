import type { Metadata } from "next";

export const metadata: Metadata = { title: "Withdraw Funds" };

type Props = { params: Promise<{ id: string }> };

export default async function WithdrawPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Withdraw from Task</h1>
      <p className="text-muted-foreground">Task ID: {id} — withdraw remaining budget + yield.</p>
    </div>
  );
}
