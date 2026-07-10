ALTER TABLE public.lgpd_consents
  ADD COLUMN IF NOT EXISTS terms_text TEXT,
  ADD COLUMN IF NOT EXISTS terms_hash TEXT,
  ADD COLUMN IF NOT EXISTS signature_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_cpf TEXT,
  ADD COLUMN IF NOT EXISTS device_info JSONB,
  ADD COLUMN IF NOT EXISTS geolocation JSONB,
  ADD COLUMN IF NOT EXISTS geo_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS lgpd_consents_candidate_accepted_idx
  ON public.lgpd_consents(candidate_id, accepted_at DESC);