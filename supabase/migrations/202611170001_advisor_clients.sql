-- Advisor self-registration, client contact details, advisor notes and real check-in reminders.
alter table public.audit_advisors
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists created_at timestamptz not null default now();

alter table public.audit_invitations
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists advisor_note text,
  add column if not exists advisor_note_at timestamptz,
  add column if not exists reminders jsonb not null default '{}'::jsonb;

grant insert, update on public.audit_advisors to service_role;
