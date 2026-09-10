ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS token_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- rate_limits: acesso apenas pelo servidor (service_role). Política explícita nega clientes.
DROP POLICY IF EXISTS rate_limits_no_client_access ON public.rate_limits;
CREATE POLICY rate_limits_no_client_access
  ON public.rate_limits
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.bump_rate_limit(text, timestamptz) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon;

DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;
  BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net nao pode ser movido: %', SQLERRM;
  END;
END $$;