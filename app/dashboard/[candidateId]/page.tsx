import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RecommendationBadge } from "@/components/recommendation-badge";
import { ScoreBreakdown } from "@/components/candidate/score-breakdown";
import { BulletList } from "@/components/candidate/bullet-list";
import { EmailPanel } from "@/components/candidate/email-panel";
import { getCandidateDetail } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: PageProps<"/dashboard/[candidateId]">) {
  const { candidateId } = await params;
  const detail = await getCandidateDetail(candidateId);
  if (!detail) notFound();

  const { candidate, scores, outputs } = detail;
  const extracted = candidate.extracted_data;
  const brief = outputs?.interview_brief;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Dashboard
      </Link>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {candidate.name ?? "Not found in resume"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {candidate.current_title ?? "Current role not found in resume"}
              {candidate.current_company ? ` at ${candidate.current_company}` : ""}
            </p>
          </div>
          <RecommendationBadge recommendation={candidate.recommendation} className="text-sm px-3 py-1" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
          <Stat label="Applied Role" value={candidate.role_evaluated} />
          <Stat
            label="Score"
            value={`${candidate.total_score}/${candidate.max_score}`}
          />
          <Stat label="Percentage" value={`${candidate.percentage.toFixed(0)}%`} />
          <Stat label="Rank" value={candidate.rank ? `#${candidate.rank}` : "—"} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rubric">Rubric Breakdown</TabsTrigger>
          <TabsTrigger value="evidence">Resume Evidence</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="gaps">Concerns / Gaps</TabsTrigger>
          <TabsTrigger value="questions">Interview Questions</TabsTrigger>
          <TabsTrigger value="brief">Interview Brief</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <Section title="Contact">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Email" value={candidate.email} />
              <Field label="Phone" value={candidate.phone} />
              <Field label="Location" value={extracted.location} />
              <Field
                label="Experience"
                value={
                  extracted.total_experience_years != null
                    ? `${extracted.total_experience_years} years`
                    : null
                }
              />
            </dl>
          </Section>
          <Section title="Pre-Screen Notes">
            <p className="text-sm">{candidate.pre_screen_notes || "Not evaluated."}</p>
          </Section>
          <Section title="Missing Information">
            <BulletList items={candidate.missing_information} emptyText="Nothing flagged as missing." />
          </Section>
          <Section title="Risks / Concerns">
            <BulletList items={candidate.risks_concerns} emptyText="No risks flagged." dotClassName="bg-amber-500" />
          </Section>
        </TabsContent>

        <TabsContent value="rubric">
          <ScoreBreakdown scores={scores} />
        </TabsContent>

        <TabsContent value="evidence" className="space-y-5">
          <Section title="Strongest Evidence">
            <BulletList items={candidate.strongest_evidence} dotClassName="bg-emerald-500" />
          </Section>
          <Section title="Resume Evidence (extracted)">
            <BulletList items={extracted.resume_evidence} />
          </Section>
        </TabsContent>

        <TabsContent value="strengths">
          <Section title="Key Strengths">
            <BulletList items={candidate.key_strengths} dotClassName="bg-emerald-500" />
          </Section>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-5">
          <Section title="Key Gaps">
            <BulletList
              items={candidate.key_gaps}
              emptyText="No gaps identified."
              dotClassName="bg-rose-500"
            />
          </Section>
          <Section title="Missing Information">
            <BulletList items={candidate.missing_information} emptyText="Nothing flagged as missing." />
          </Section>
        </TabsContent>

        <TabsContent value="questions">
          <Section title="Questions to Validate During Interview">
            <BulletList items={brief?.interview_questions ?? []} emptyText="Not generated." />
          </Section>
        </TabsContent>

        <TabsContent value="brief" className="space-y-5">
          <Section title="Candidate Summary">
            <p className="text-sm">{brief?.candidate_summary || "Not generated."}</p>
          </Section>
          <Section title="Why This Candidate May Be Worth Interviewing">
            <p className="text-sm">{brief?.why_worth_interviewing || "Not generated."}</p>
          </Section>
          <Section title="Top Areas to Probe">
            <BulletList items={brief?.top_areas_to_probe ?? []} />
          </Section>
          <Section title="Potential Red Flags">
            <BulletList
              items={brief?.potential_red_flags ?? []}
              emptyText="None flagged."
              dotClassName="bg-amber-500"
            />
          </Section>
        </TabsContent>

        <TabsContent value="email">
          {outputs ? (
            <EmailPanel
              candidateId={candidate.id}
              candidateEmail={candidate.email}
              initialSubject={outputs.email_subject}
              initialBody={outputs.email_body}
              initialStatus={outputs.email_status}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No email draft generated.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value ?? "Not found in resume"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
