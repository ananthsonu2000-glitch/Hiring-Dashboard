"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { cn } from "@/lib/utils";
import type { CandidateRecord } from "@/types";

type SortKey = "rank" | "name" | "experience" | "score" | "recommendation";
type SortDir = "asc" | "desc";

const RECOMMENDATION_ORDER = { "Strong Interview": 0, Interview: 1, Borderline: 2, Reject: 3 };

function SortHeader({
  label,
  sortKeyName,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === sortKeyName;
  return (
    <button
      onClick={() => onSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  );
}

export function CandidateTable({ candidates }: { candidates: CandidateRecord[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...candidates];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank":
          cmp = (a.rank ?? 999) - (b.rank ?? 999);
          break;
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "experience":
          cmp = (a.total_experience_years ?? -1) - (b.total_experience_years ?? -1);
          break;
        case "score":
          cmp = a.percentage - b.percentage;
          break;
        case "recommendation":
          cmp =
            RECOMMENDATION_ORDER[a.recommendation ?? "Reject"] -
            RECOMMENDATION_ORDER[b.recommendation ?? "Reject"];
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [candidates, sortKey, sortDir]);

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border bg-white py-16 text-center">
        <p className="text-sm text-muted-foreground">No candidates evaluated yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-14">
              <SortHeader label="Rank" sortKeyName="rank" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Candidate" sortKeyName="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>
              <SortHeader label="Experience" sortKeyName="experience" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </TableHead>
            <TableHead>Role Applied</TableHead>
            <TableHead>
              <SortHeader label="Score" sortKeyName="score" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </TableHead>
            <TableHead>
              <SortHeader
                label="Recommendation"
                sortKeyName="recommendation"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/${c.id}`)}
            >
              <TableCell className="text-muted-foreground tabular-nums">
                {c.rank ?? "—"}
              </TableCell>
              <TableCell className="font-medium">{c.name ?? "Not found in resume"}</TableCell>
              <TableCell className="text-muted-foreground">
                {c.current_title ?? "—"}
                {c.current_company ? ` · ${c.current_company}` : ""}
              </TableCell>
              <TableCell className="tabular-nums">
                {c.total_experience_years != null ? `${c.total_experience_years} yrs` : "—"}
              </TableCell>
              <TableCell>{c.role_evaluated ?? "—"}</TableCell>
              <TableCell className={cn("font-medium tabular-nums")}>
                {c.percentage.toFixed(0)}%
                <span className="text-muted-foreground font-normal text-xs">
                  {" "}
                  ({c.total_score}/{c.max_score})
                </span>
              </TableCell>
              <TableCell>
                <RecommendationBadge recommendation={c.recommendation} />
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs text-primary underline underline-offset-2">View</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
