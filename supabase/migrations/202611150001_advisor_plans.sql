create table public.audit_plans (
  id text primary key,
  advisor_id uuid not null references public.audit_advisors (user_id) on delete cascade,
  name text not null,
  couple_mode boolean not null,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

create index audit_plans_by_advisor
  on public.audit_plans (advisor_id, created_at desc);

alter table public.audit_plans enable row level security;
revoke all on public.audit_plans from public, anon, authenticated;
grant select, insert on public.audit_plans to service_role;
