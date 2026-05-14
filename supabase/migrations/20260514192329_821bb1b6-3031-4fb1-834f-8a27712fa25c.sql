
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'curriculo';

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS lgpd_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT NOT NULL DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS lgpd_consents_candidate_idx ON public.lgpd_consents(candidate_id);

ALTER TABLE public.lgpd_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lgpd_consents_owner_select"
ON public.lgpd_consents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = lgpd_consents.candidate_id
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);
