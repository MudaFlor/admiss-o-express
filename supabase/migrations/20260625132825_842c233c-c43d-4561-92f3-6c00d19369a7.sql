ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_deleted_at_idx ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;