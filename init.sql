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
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optimistic save helper
create or replace function save_cell(
  p_cell_id uuid,
  p_expected_version integer,
  p_content text
) returns json as $$
declare
  current_version integer;
  current_content text;
begin
  select version, content into current_version, current_content
  from cells where id = p_cell_id for update;
  
  if current_version != p_expected_version then
    return json_build_object(
      'success', false,
      'conflict', true,
      'server_version', current_version,
      'server_content', current_content
    );
  end if;
  
  update cells 
  set content = p_content, version = version + 1, updated_at = now()
  where id = p_cell_id;
  
  return json_build_object('success', true, 'new_version', current_version + 1);
end;
$$ language plpgsql;

-- Flashcard Decks Table
CREATE TABLE flashcard_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'none', -- String ID, can be "none" for anonymous users
    topic TEXT NOT NULL,
    description TEXT DEFAULT '',
    slug TEXT UNIQUE NOT NULL,
    sandbox_slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards Table  
CREATE TABLE flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    times_reviewed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_decks_slug ON flashcard_decks(slug);
CREATE INDEX idx_flashcard_decks_sandbox_slug ON flashcard_decks(sandbox_slug);
CREATE INDEX idx_flashcards_weight ON flashcards(weight);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);

