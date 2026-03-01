-- ============================================================
-- Skill Issue — Supabase Schema Backup
-- Project: dbrjnrgfuxvdmrzbhnru (ap-south-1)
-- Exported: 2026-02-27
-- ============================================================
-- Run this SQL in your NEW Supabase project's SQL Editor to
-- recreate the entire schema from scratch.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
-- uuid_generate_v4() is used for default IDs (available via
-- the pgcrypto / uuid-ossp extension on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: public.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID         NOT NULL,
  username     TEXT         NOT NULL UNIQUE,
  email        TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ  DEFAULT now(),
  bio          TEXT,
  display_name TEXT,

  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users USING btree (username);
-- Note: the UNIQUE constraint already creates users_username_key index automatically

-- RLS Policies
CREATE POLICY "Usernames are public"
  ON public.users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users manage own profile"
  ON public.users
  FOR ALL
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- TABLE: public.skills
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id             UUID         NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id        UUID         NOT NULL,
  title          TEXT         NOT NULL,
  content        TEXT         NOT NULL,
  tags           TEXT[]       DEFAULT '{}'::text[],
  visibility     TEXT         NOT NULL DEFAULT 'private'
                   CONSTRAINT skills_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  copy_count     INTEGER      NOT NULL DEFAULT 0,
  download_count INTEGER      NOT NULL DEFAULT 0,
  star_count     INTEGER      NOT NULL DEFAULT 0,
  description    TEXT,
  category       TEXT,

  CONSTRAINT skills_pkey PRIMARY KEY (id),
  CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- Enable Row Level Security
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS skills_created_at_idx  ON public.skills USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS skills_user_id_idx     ON public.skills USING btree (user_id);
CREATE INDEX IF NOT EXISTS skills_visibility_idx  ON public.skills USING btree (visibility);

-- RLS Policies
CREATE POLICY "Public skills are visible to everyone"
  ON public.skills
  FOR SELECT
  TO public
  USING (visibility = 'public'::text);

CREATE POLICY "Users can manage their own skills"
  ON public.skills
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- FUNCTION: set_updated_at()
-- Automatically keeps updated_at in sync on every UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ============================================================
-- TRIGGER: skills_set_updated_at
-- ============================================================
CREATE TRIGGER skills_set_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- FUNCTION: rls_auto_enable  (event trigger — informational)
-- This is a Supabase-managed event trigger that auto-enables
-- RLS on new tables created in the public schema.
-- It is managed by Supabase internally; you do NOT need to
-- recreate it manually — new Supabase projects already have
-- this in place.
-- Keeping it here for documentation purposes only.
-- ============================================================
/*
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public')
        AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
        AND cmd.schema_name NOT LIKE 'pg_toast%'
        AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;
*/


-- ============================================================
-- DONE
-- To apply this to a new project:
--   1. Open your new Supabase project's SQL Editor
--   2. Paste the contents of this file and run it
--   3. Update your .env (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
--      with the new project's credentials
-- ============================================================
