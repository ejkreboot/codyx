-- Notebooks table
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sandbox_slug text unique not null, 
  is_public boolean not null default true, -- future me says 'hi'
  owner text not null default 'public',
  created_at timestamptz not null default now(),
  UNIQUE (slug, sandbox_slug)
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

