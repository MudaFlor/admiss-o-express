DROP POLICY IF EXISTS "Requisitos leitura pública para portal" ON public.document_requirements;
REVOKE SELECT ON public.document_requirements FROM anon;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;