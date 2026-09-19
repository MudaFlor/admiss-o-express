-- Restaura os GRANTs do Data API (PostgREST). Sem eles, mesmo com RLS correta,
-- toda leitura/escrita do app autenticado retorna 403 (permission denied).

-- Tabelas de uso do RH/Admin (RLS já restringe por papel)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.correction_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;

-- Tabelas somente leitura / inserção controlada
GRANT SELECT, INSERT ON public.candidate_stage_history TO authenticated;
GRANT SELECT, INSERT ON public.messages_log TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.lgpd_consents TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Perfil e papéis do próprio usuário
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Acesso administrativo do backend
GRANT ALL ON public.candidates TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.dependents TO service_role;
GRANT ALL ON public.employees TO service_role;
GRANT ALL ON public.absences TO service_role;
GRANT ALL ON public.correction_requests TO service_role;
GRANT ALL ON public.document_requirements TO service_role;
GRANT ALL ON public.message_templates TO service_role;
GRANT ALL ON public.candidate_stage_history TO service_role;
GRANT ALL ON public.messages_log TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.lgpd_consents TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.rate_limits TO service_role;

-- Funções usadas pelo app
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, timestamptz) TO service_role;
