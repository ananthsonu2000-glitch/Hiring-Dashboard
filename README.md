## Hiring Dashboard

Upload PM/SPM candidate resumes, score them against a rubric using Gemini,
rank them, and send personalized outreach through Resend — only when you
click Send.

### Flow

Founder uploads resumes + picks PM/SPM → PDF text extracted → Gemini
extracts structured candidate data → Gemini scores it against the rubric →
Gemini writes an interview brief + questions → Gemini drafts a candidate
email → founder reviews the ranked dashboard → founder edits & manually
sends the email via Resend.

### Setup

1. **Supabase** — create a project, then run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the SQL editor. It creates the `evaluations`, `candidates`,
   `candidate_scores`, `candidate_outputs` tables and a private `resumes`
   storage bucket.
2. **Gemini** — grab an API key from [Google AI Studio](https://aistudio.google.com/apikey).
3. **Resend** — grab an API key and verify a sending domain/address.
4. Copy `.env.example` to `.env.local` and fill in the values.
5. `npm install`
6. `npm run dev` — app runs at http://localhost:3000

### Structure

- `app/page.tsx` — New Evaluation (role select, resume upload, live processing log)
- `app/dashboard/page.tsx` — ranked candidate table with stats
- `app/dashboard/[candidateId]/page.tsx` — candidate detail (rubric breakdown, evidence, brief, email)
- `app/api/evaluate/route.ts` — streams progress while running the 4-step Gemini pipeline per resume and writing results to Supabase
- `app/api/send-email/route.ts` — sends the (possibly edited) email via Resend, only on explicit request
- `lib/gemini/` — the 4 Gemini steps: extract → score → brief → email, each with a structured JSON schema
- `lib/rubrics/` — the PM and SPM rubrics + pre-screen patterns, encoded from `rubrics.txt`
- `lib/db.ts` — all Supabase reads/writes (service-role, server-only)
- `supabase/migrations/` — database schema

### Notes

- One failed resume never aborts the batch — errors are shown per file and
  the rest continue processing.
- Duplicate candidates (same email) within one upload batch are skipped.
- Score-affecting fields never use the candidate's name, age, gender, or
  photograph as a signal — see `lib/gemini/score.ts`'s system instruction.
