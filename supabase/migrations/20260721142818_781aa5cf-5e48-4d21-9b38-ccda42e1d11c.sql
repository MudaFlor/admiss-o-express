
-- Stage enum
CREATE TYPE public.candidate_stage AS ENUM (
  'cadastro_iniciado',
  'aceite_lgpd',
  'curriculo_enviado',
  'documentos_enviados',
  'ocr_concluido',
  'em_analise',
  'pendencia_documental',
  'correcao_solicitada',
  'aguardando_aprovacao',
  'aprovado',
  'admitido'
);

-- Add stage columns to candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS stage public.candidate_stage NOT NULL DEFAULT 'cadastro_iniciado',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stage_updated_by uuid,
  ADD COLUMN IF NOT EXISTS stage_note text;

-- Stage history
CREATE TABLE public.candidate_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage public.candidate_stage,
  to_stage public.candidate_stage NOT NULL,
  actor_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.candidate_stage_history TO authenticated;
GRANT ALL ON public.candidate_stage_history TO service_role;
ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH pode ver histórico de estágios"
  ON public.candidate_stage_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "RH pode inserir histórico de estágios"
  ON public.candidate_stage_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_stage_history_candidate ON public.candidate_stage_history(candidate_id, created_at DESC);

-- Document requirements
CREATE TABLE public.document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  document_type public.document_type NOT NULL,
  label text NOT NULL,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_requirements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.document_requirements TO authenticated;
GRANT ALL ON public.document_requirements TO service_role;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requisitos visíveis a todos autenticados"
  ON public.document_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Requisitos leitura pública para portal"
  ON public.document_requirements FOR SELECT TO anon USING (true);
CREATE POLICY "RH gerencia requisitos"
  ON public.document_requirements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_docreq_updated BEFORE UPDATE ON public.document_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default requirements
INSERT INTO public.document_requirements (document_type, label, condition) VALUES
  ('rg', 'RG ou CIN', '{}'),
  ('cpf', 'CPF (se não estiver no RG)', '{}'),
  ('comprovante_residencia', 'Comprovante de Residência (últimos 90 dias)', '{}'),
  ('curriculo', 'Currículo', '{}'),
  ('foto_3x4', 'Foto 3x4', '{}'),
  ('titulo_eleitor', 'Título de Eleitor', '{}'),
  ('pis_pasep', 'PIS/PASEP', '{}'),
  ('cartao_sus', 'Cartão SUS', '{}'),
  ('ctps', 'Carteira de Trabalho', '{}'),
  ('escolaridade', 'Comprovante de Escolaridade', '{}'),
  ('cnh', 'CNH', '{"role_contains":"motorista"}'),
  ('reservista', 'Certificado de Reservista', '{"sexo":"masculino"}'),
  ('certidao', 'Certidão de Casamento', '{"estado_civil":"casado"}');

-- Message templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','both')),
  subject text,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH gerencia templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_msgtpl_updated BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.message_templates (kind, channel, subject, body) VALUES
  ('convite', 'whatsapp', NULL, 'Olá {{nome}}! Bem-vindo(a) à Mudaflor. Para dar início ao seu processo de admissão, acesse: {{link}}'),
  ('solicitacao_documentos', 'whatsapp', NULL, 'Olá {{nome}}, faltam alguns documentos para concluir seu cadastro: {{pendencias}}. Acesse: {{link}}'),
  ('pendencia', 'whatsapp', NULL, 'Olá {{nome}}, identificamos uma pendência no seu cadastro: {{motivo}}. Por favor, acesse {{link}} para corrigir.'),
  ('correcao', 'whatsapp', NULL, 'Olá {{nome}}, precisamos que você revise: {{motivo}}. Link: {{link}}'),
  ('aprovacao', 'whatsapp', NULL, 'Olá {{nome}}! Seu cadastro foi aprovado. Em breve o RH entrará em contato para os próximos passos.'),
  ('reprovacao', 'whatsapp', NULL, 'Olá {{nome}}, agradecemos seu interesse. Após análise, seguiremos com outros candidatos neste momento.'),
  ('confirmacao_recebimento', 'whatsapp', NULL, 'Olá {{nome}}, recebemos seus documentos com sucesso. Nossa equipe fará a análise em breve.');

-- Messages log
CREATE TABLE public.messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  kind text NOT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'enviado',
  error text,
  payload jsonb,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages_log TO authenticated;
GRANT ALL ON public.messages_log TO service_role;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH vê logs de mensagens"
  ON public.messages_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "RH insere logs de mensagens"
  ON public.messages_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_messages_log_candidate ON public.messages_log(candidate_id, created_at DESC);
