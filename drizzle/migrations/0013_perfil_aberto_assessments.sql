ALTER TABLE public.disc_assessments
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'disc',
  ADD COLUMN IF NOT EXISTS question_set text,
  ADD COLUMN IF NOT EXISTS cycle_reason text,
  ADD COLUMN IF NOT EXISTS analysis jsonb,
  ADD COLUMN IF NOT EXISTS evolution jsonb,
  ADD COLUMN IF NOT EXISTS analysis_status text,
  ADD COLUMN IF NOT EXISTS analysis_error text;
ALTER TABLE public.disc_assessments ADD CONSTRAINT disc_assessments_kind_check CHECK (kind IN ('disc','perfil_aberto'));