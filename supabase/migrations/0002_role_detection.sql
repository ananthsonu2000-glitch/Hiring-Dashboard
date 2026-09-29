-- Supports "auto-detect role" evaluations: the founder can upload a batch
-- without picking PM/SPM up front, and each candidate is independently
-- routed to whichever role their resume fits better.

-- A null evaluations.role means "auto-detect" was used for this batch.
alter table evaluations alter column role drop not null;

-- role_evaluated is null on candidate error rows where processing failed
-- before a role could be determined (e.g. an unreadable resume in an
-- auto-detect batch).
alter table candidates alter column role_evaluated drop not null;

alter table candidates add column role_match_reasoning text;
alter table candidates add column role_match_confidence confidence_level;
