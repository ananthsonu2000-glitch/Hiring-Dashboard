"use client";

import { useCallback, useState } from "react";
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

const MAX_FILES = 50;

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
  const [requestError, setRequestError] = useState<string | null>(null);
  const [logOrder, setLogOrder] = useState<string[]>([]);

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
    if (files.length > MAX_FILES) {
      setRequestError(`Upload at most ${MAX_FILES} resumes at a time — you have ${files.length} queued.`);
      return;
    }

    setRunning(true);
    setDoneCount(null);
    setEvaluationId(null);
    setRequestError(null);
    setLogOrder([]);
    setLogs({});

    let currentEvaluationId: string | null = null;
    let successCount = 0;

    // One request per resume, sent sequentially: this keeps every request
    // body small (a single file, never a whole batch) so it can't run into
    // request-body-size limits no matter how many resumes are uploaded.
    for (const file of files) {
      const formData = new FormData();
      formData.append("role", role);
      formData.append("file", file);
      if (currentEvaluationId) formData.append("evaluationId", currentEvaluationId);

      try {
        const res = await fetch("/api/evaluate", { method: "POST", body: formData });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Request failed (${res.status}).`);
        }
        if (!res.body) throw new Error("No response stream from server.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleLine = (line: string) => {
          const event = JSON.parse(line) as EvaluateProgressEvent;
          if (event.type === "evaluation_ready") {
            currentEvaluationId = event.evaluationId;
            return;
          }
          if (event.type === "candidate_done") successCount++;
          applyEvent(event);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim()) handleLine(line);
          }
        }
        if (buffer.trim()) handleLine(buffer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";

        if (!currentEvaluationId) {
          // Failed before a batch even started — almost certainly a config
          // or validation problem that would repeat for every remaining
          // file, so stop instead of retrying the whole queue.
          setRequestError(msg);
          break;
        }

        setLogOrder((prev) => (prev.includes(file.name) ? prev : [...prev, file.name]));
        setLogs((prev) => ({
          ...prev,
          [file.name]: { filename: file.name, steps: prev[file.name]?.steps ?? [], status: "error", error: msg },
        }));
      }
    }

    if (currentEvaluationId) {
      try {
        await fetch("/api/evaluate/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluationId: currentEvaluationId }),
        });
      } catch {
        // best-effort; candidates are saved either way, ranks just won't be set
      }
    }

    setEvaluationId(currentEvaluationId);
    setDoneCount(successCount);
    setRunning(false);
  }

  function applyEvent(event: EvaluateProgressEvent) {
    if (event.type === "evaluation_ready") return;

    setLogOrder((prev) => (prev.includes(event.filename) ? prev : [...prev, event.filename]));

    setLogs((prev) => {
      const key = event.filename;
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

  const orderedLogs = logOrder.map((k) => logs[k]).filter(Boolean);

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

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Button size="lg" disabled={files.length === 0 || running} onClick={handleEvaluate} className="w-full sm:w-auto">
          {running ? <Loader2 className="animate-spin" /> : null}
          {running ? "Evaluating Candidates..." : "Evaluate Candidates"}
        </Button>
        {files.length > 5 && !running && (
          <p className="text-xs text-muted-foreground">
            {files.length} resumes — each goes through several AI steps, so this can take a few minutes. Keep this tab open.
          </p>
        )}
      </div>

      {requestError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{requestError}</span>
        </div>
      )}

      {orderedLogs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Processing{running ? ` (${orderedLogs.length} of ${files.length})` : ""}
          </h2>
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
