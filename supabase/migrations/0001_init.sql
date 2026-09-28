-- Hiring Dashboard schema
-- All access happens server-side via the Supabase service-role key
-- (API routes only). RLS is enabled with no policies, so anon/authenticated
-- clients are denied by default; nothing is exposed directly to the browser.

create extension if not exists "pgcrypto";

create type hiring_role as enum ('PM', 'SPM');
create type recommendation_status as enum ('Strong Interview', 'Interview', 'Borderline', 'Reject');
create type confidence_level as enum ('High', 'Medium', 'Low');
create type email_status as enum ('draft', 'sent', 'failed');

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  role hiring_role not null,
  created_at timestamptz not null default now()
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,

  name text,
  email text,
  phone text,
  current_title text,
  current_company text,

  resume_filename text not null,
  resume_url text,
  role_evaluated hiring_role not null,

  extracted_data jsonb not null default '{}'::jsonb,
  total_experience_years numeric,

  total_score numeric not null default 0,
  max_score numeric not null default 0,
  percentage numeric not null default 0,
  recommendation recommendation_status,
  rank integer,

  strongest_evidence jsonb not null default '[]'::jsonb,
  key_strengths jsonb not null default '[]'::jsonb,
  key_gaps jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  risks_concerns jsonb not null default '[]'::jsonb,
  pre_screen_notes text,

  processing_error text,

  created_at timestamptz not null default now()
);

create index candidates_evaluation_id_idx on candidates(evaluation_id);
create index candidates_percentage_idx on candidates(percentage desc);
create index candidates_email_idx on candidates(lower(email));

create table candidate_scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  criterion text not null,
  max_score numeric not null,
  score numeric not null,
  evidence text not null,
  reasoning text not null,
  confidence confidence_level not null
);

create index candidate_scores_candidate_id_idx on candidate_scores(candidate_id);

create table candidate_outputs (
  candidate_id uuid primary key references candidates(id) on delete cascade,
  interview_brief jsonb not null default '{}'::jsonb,
  email_subject text not null default '',
  email_body text not null default '',
  email_status email_status not null default 'draft',
  email_sent_at timestamptz
);

alter table evaluations enable row level security;
alter table candidates enable row level security;
alter table candidate_scores enable row level security;
alter table candidate_outputs enable row level security;

-- Storage bucket for uploaded resume PDFs (private; accessed via signed URLs
-- generated server-side with the service-role key).
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
