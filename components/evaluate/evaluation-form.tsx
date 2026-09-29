"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud, X, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvaluateProgressEvent, Role, RoleSelection } from "@/types";

interface FileLog {
  filename: string;
  steps: string[];
  status: "pending" | "processing" | "done" | "error" | "duplicate";
  error?: string;
  determinedRole?: Role;
  roleReasoning?: string;
}

const ROLE_OPTIONS: {
  value: RoleSelection;
  title: string;
  description: string;
}[] = [
  {
    value: "PM",
    title: "Product Manager",
    description: "First dedicated PM — building the function from zero",
  },
  {
    value: "SPM",
    title: "Senior Product Manager",
    description: "Owns the integration/data layer — most senior PM",
  },
  {
    value: "AUTO",
    title: "Not sure — let AI decide",
    description: "Each resume is independently routed to PM or SPM, whichever fits better",
  },
];

export function EvaluationForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleSelection>("PM");
  const [files, setFiles] = useState<File[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<Record<string, FileLog>>({});
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const logOrder = useRef<string[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const merged = [...prev, ...accepted.filter((f) => !existingNames.has(f.name))];
      return merged;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    multiple: true,
    disabled: running,
  });

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleEvaluate() {
    if (files.length === 0) return;
    setRunning(true);
    setDoneCount(null);
    setEvaluationId(null);
    logOrder.current = [];
    setLogs({});

    const formData = new FormData();
    formData.append("role", role);
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/evaluate", { method: "POST", body: formData });
      if (!res.body) throw new Error("No response stream from server.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as EvaluateProgressEvent;
          applyEvent(event);
        }
      }
      if (buffer.trim()) {
        applyEvent(JSON.parse(buffer) as EvaluateProgressEvent);
      }
    } catch (err) {
      setLogs((prev) => ({
        ...prev,
        __global__: {
          filename: "__global__",
          steps: [],
          status: "error",
          error: err instanceof Error ? err.message : "Something went wrong.",
        },
      }));
    } finally {
      setRunning(false);
    }
  }

  function applyEvent(event: EvaluateProgressEvent) {
    if (event.type === "all_done") {
      setEvaluationId(event.evaluationId);
      setDoneCount(event.count);
      return;
    }

    setLogs((prev) => {
      const key = event.filename;
      if (!logOrder.current.includes(key)) logOrder.current.push(key);
      const existing: FileLog = prev[key] ?? { filename: key, steps: [], status: "pending" };

      if (event.type === "start") {
        return { ...prev, [key]: { ...existing, status: "processing" } };
      }
      if (event.type === "step") {
        return { ...prev, [key]: { ...existing, status: "processing", steps: [...existing.steps, event.step] } };
      }
      if (event.type === "role_determined") {
        return {
          ...prev,
          [key]: {
            ...existing,
            determinedRole: event.roleMatch.role,
            roleReasoning: event.roleMatch.reasoning,
          },
        };
      }
      if (event.type === "candidate_done") {
        return { ...prev, [key]: { ...existing, status: "done" } };
      }
      if (event.type === "candidate_error") {
        return { ...prev, [key]: { ...existing, status: "error", error: event.error } };
      }
      if (event.type === "duplicate") {
        return { ...prev, [key]: { ...existing, status: "duplicate", error: event.message } };
      }
      return prev;
    });
  }

  const orderedLogs = logOrder.current.map((k) => logs[k]).filter(Boolean);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">1. Hiring Role</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={running}
              onClick={() => setRole(opt.value)}
              className={cn(
                "flex-1 rounded-xl border px-5 py-4 text-left transition-all disabled:opacity-60",
                role === opt.value
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-white hover:border-foreground/40"
              )}
            >
              <div className="font-semibold flex items-center gap-1.5">
                {opt.value === "AUTO" && <Sparkles className="size-3.5 shrink-0" />}
                {opt.title}
              </div>
              <div className={cn("text-xs mt-0.5", role === opt.value ? "text-background/70" : "text-muted-foreground")}>
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">2. Resume Upload</h2>
        <div
          {...getRootProps()}
          className={cn(
            "rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
            isDragActive ? "border-foreground bg-muted" : "border-border bg-white hover:bg-muted/50",
            running && "pointer-events-none opacity-60"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {isDragActive ? "Drop resumes here" : "Drag & drop resumes, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, Word (.docx), or .txt · multiple candidates supported
          </p>
        </div>

        {files.length > 0 && (
          <ul className="divide-y rounded-lg border bg-white">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                </span>
                {!running && (
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button size="lg" disabled={files.length === 0 || running} onClick={handleEvaluate} className="w-full sm:w-auto">
        {running ? <Loader2 className="animate-spin" /> : null}
        {running ? "Evaluating Candidates..." : "Evaluate Candidates"}
      </Button>

      {orderedLogs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Processing</h2>
          <ul className="space-y-2">
            {orderedLogs.map((log) => (
              <li key={log.filename} className="rounded-lg border bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {log.status === "processing" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {log.status === "done" && <CheckCircle2 className="size-4 text-emerald-600" />}
                  {(log.status === "error" || log.status === "duplicate") && (
                    <AlertTriangle className="size-4 text-amber-600" />
                  )}
                  <span className="truncate">{log.filename}</span>
                  {log.determinedRole && (
                    <span className="ml-auto shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-foreground">
                      {log.determinedRole}
                    </span>
                  )}
                </div>
                {log.steps.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{log.steps[log.steps.length - 1]}</p>
                )}
                {log.status === "done" && log.roleReasoning && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Routed to {log.determinedRole}: {log.roleReasoning}
                  </p>
                )}
                {log.error && <p className="text-xs text-amber-700 mt-1 ml-6">{log.error}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {doneCount !== null && evaluationId && (
        <div className="rounded-lg border bg-emerald-50 border-emerald-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <p className="text-sm text-emerald-900">
            Evaluated {doneCount} candidate{doneCount === 1 ? "" : "s"}
            {role === "AUTO" ? " (role auto-detected per candidate)." : ` for ${role}.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            View Dashboard <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
