import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CandidateRecord } from "@/types";

export function StatsCards({ candidates }: { candidates: CandidateRecord[] }) {
  const stats = [
    { label: "Candidates Evaluated", value: candidates.length, accent: "text-foreground" },
    {
      label: "Strong Interview",
      value: candidates.filter((c) => c.recommendation === "Strong Interview").length,
      accent: "text-emerald-700",
    },
    {
      label: "Interview",
      value: candidates.filter((c) => c.recommendation === "Interview").length,
      accent: "text-blue-700",
    },
    {
      label: "Borderline",
      value: candidates.filter((c) => c.recommendation === "Borderline").length,
      accent: "text-amber-700",
    },
    {
      label: "Reject",
      value: candidates.filter((c) => c.recommendation === "Reject").length,
      accent: "text-rose-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="shadow-none border-border/70">
          <CardContent className="px-4 py-3">
            <div className={cn("text-2xl font-semibold tabular-nums", s.accent)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
