-- 1) Auditoria: somente o servidor escreve
DROP POLICY IF EXISTS "Authenticated users can insert their own audit logs" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE ALL ON public.audit_logs FROM anon;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 2) Funções SECURITY DEFINER não devem ser chamáveis pela API
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_hr(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;

-- 3) Rate limiting persistente (somente servidor)
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Sem policies: nenhum acesso via API pública (fail-closed). Apenas service_role acessa.

CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

CREATE TRIGGER rate_limits_set_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Incremento atômico da janela (executado só pelo servidor via service_role)
CREATE OR REPLACE FUNCTION public.bump_rate_limit(_key TEXT, _window_start TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c INTEGER;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, window_start, count)
  VALUES (_key, _window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1, updated_at = now()
  RETURNING count INTO c;

  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 day';
  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(TEXT, TIMESTAMPTZ) TO service_role;