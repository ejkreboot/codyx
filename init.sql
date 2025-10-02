-- Notebooks table
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  owner text not null default 'public',
  created_at timestamptz not null default now()
);

-- Cells table
create table public.cells (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  position text not null,         -- lexicographic ordering key
  type text not null default 'md',-- e.g. 'md', 'py'
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current automatically
create trigger set_cells_updated_at
before update on public.cells
for each row
execute function pg_catalog.set_current_timestamp();
