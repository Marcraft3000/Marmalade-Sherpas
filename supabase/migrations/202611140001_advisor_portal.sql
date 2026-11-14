create table public.audit_advisors (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.audit_invitations (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.audit_advisors (user_id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  opened_at timestamptz,
  session jsonb not null,
  revision integer not null default 0
);

create index audit_invitations_by_advisor
  on public.audit_invitations (advisor_id, created_at desc);

alter table public.audit_advisors enable row level security;
alter table public.audit_invitations enable row level security;

revoke all on public.audit_advisors, public.audit_invitations from public, anon, authenticated;
grant select on public.audit_advisors to service_role;
grant select, insert, update on public.audit_invitations to service_role;
