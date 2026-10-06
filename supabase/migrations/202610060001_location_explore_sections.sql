alter table public.locations
  add column if not exists duration text,
  add column if not exists elevation integer,
  add column if not exists warning text,
  add column if not exists activities jsonb not null default '[]'::jsonb,
  add column if not exists attractions jsonb not null default '[]'::jsonb,
  add column if not exists accommodations jsonb not null default '[]'::jsonb,
  add column if not exists food jsonb not null default '[]'::jsonb;
