import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CandidateTable } from "@/components/dashboard/candidate-table";
import { getDashboardCandidates } from "@/lib/db";
import type { CandidateRecord } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let candidates: CandidateRecord[] = [];
  let configError: string | null = null;

  try {
    candidates = await getDashboardCandidates();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Failed to load candidates.";
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hiring Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidates ranked by rubric score, most recent evaluations included.
          </p>
        </div>
        <Button asChild>
          <Link href="/">New Evaluation</Link>
        </Button>
      </div>

      {configError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {configError}
        </div>
      ) : (
        <>
          <StatsCards candidates={candidates} />
          <CandidateTable candidates={candidates} />
        </>
      )}
    </div>
  );
}
