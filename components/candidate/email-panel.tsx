"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Pencil, Loader2 } from "lucide-react";
import type { EmailStatus } from "@/types";

export function EmailPanel({
  candidateId,
  candidateEmail,
  initialSubject,
  initialBody,
  initialStatus,
}: {
  candidateId: string;
  candidateEmail: string | null;
  initialSubject: string;
  initialBody: string;
  initialStatus: EmailStatus;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<EmailStatus>(initialStatus);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!candidateEmail) {
      toast.error("This candidate has no email address on file.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      setStatus("sent");
      setEditing(false);
      toast.success(`Email sent to ${candidateEmail}`);
    } catch (err) {
      setStatus("failed");
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          To: <span className="text-foreground">{candidateEmail ?? "No email found on resume"}</span>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          value={subject}
          disabled={!editing || sending}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email-body">Body</Label>
        <Textarea
          id="email-body"
          rows={12}
          value={body}
          disabled={!editing || sending}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)} disabled={sending}>
            <Pencil /> Edit Email
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setEditing(false)} disabled={sending}>
            Done Editing
          </Button>
        )}
        <Button onClick={handleSend} disabled={sending || !candidateEmail}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {status === "sent" ? "Re-send Email" : "Send Email"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Nothing is sent automatically — review the draft above, then click Send.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: EmailStatus }) {
  const map: Record<EmailStatus, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
      {status === "draft" ? "Not sent" : status === "sent" ? "Sent" : "Send failed"}
    </span>
  );
}
