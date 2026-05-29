create table if not exists public.integranexti_auth_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.integranexti_auth_store enable row level security;

comment on table public.integranexti_auth_store is
  'Armazena usuários, clientes e permissões do Painel IntegraNexti. A API usa service_role server-side.';
