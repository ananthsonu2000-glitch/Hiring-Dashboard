import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CandidateScoreRecord } from "@/types";

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-rose-100 text-rose-700",
};

export function ScoreBreakdown({ scores }: { scores: CandidateScoreRecord[] }) {
  if (scores.length === 0) {
    return <p className="text-sm text-muted-foreground">No score breakdown available.</p>;
  }

  return (
    <div className="space-y-5">
      {scores.map((s) => (
        <div key={s.id} className="rounded-lg border p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">{s.criterion}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  CONFIDENCE_STYLES[s.confidence]
                )}
              >
                {s.confidence} confidence
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {s.score}/{s.max_score}
              </span>
            </div>
          </div>
          <Progress value={(s.score / s.max_score) * 100} className="h-1.5" />
          <div className="text-xs space-y-1.5 pt-1">
            <p>
              <span className="font-medium text-muted-foreground">Evidence: </span>
              {s.evidence}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Reasoning: </span>
              {s.reasoning}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
