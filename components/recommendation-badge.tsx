import { cn } from "@/lib/utils";
import type { Recommendation } from "@/types";

const STYLES: Record<Recommendation, string> = {
  "Strong Interview": "bg-emerald-100 text-emerald-800 border-emerald-200",
  Interview: "bg-blue-100 text-blue-800 border-blue-200",
  Borderline: "bg-amber-100 text-amber-800 border-amber-200",
  Reject: "bg-rose-100 text-rose-800 border-rose-200",
};

export function RecommendationBadge({
  recommendation,
  className,
}: {
  recommendation: Recommendation | null;
  className?: string;
}) {
  if (!recommendation) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 border-gray-200",
          className
        )}
      >
        Unscored
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[recommendation],
        className
      )}
    >
      {recommendation}
    </span>
  );
}
