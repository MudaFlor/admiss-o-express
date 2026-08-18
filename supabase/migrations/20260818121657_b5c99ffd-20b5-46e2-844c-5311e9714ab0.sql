CREATE TABLE public.correction_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  status text NOT NULL DEFAULT 'aberta',
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_correction_requests_candidate ON public.correction_requests(candidate_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.correction_requests TO authenticated;
GRANT ALL ON public.correction_requests TO service_role;

ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "correction_requests_hr_select" ON public.correction_requests
  FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY "correction_requests_hr_insert" ON public.correction_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY "correction_requests_hr_update" ON public.correction_requests
  FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY "correction_requests_admin_delete" ON public.correction_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_correction_requests_updated
  BEFORE UPDATE ON public.correction_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.message_templates (kind, channel, subject, body, is_active)
VALUES ('correcao', 'whatsapp', NULL,
'Olá {{nome}}! 👋

Revisamos seu cadastro de admissão e precisamos de alguns ajustes:

{{itens}}

{{observacao}}

Acesse seu link para corrigir e reenviar:
{{link}}

Qualquer dúvida, é só responder por aqui.', true)
ON CONFLICT DO NOTHING;