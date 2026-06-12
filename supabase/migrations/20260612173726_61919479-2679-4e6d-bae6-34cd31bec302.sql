
-- 1) Enum: novos tipos de documento
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'ctps';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'titulo_eleitor';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'foto_3x4';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'certidao';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'reservista';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'pis_pasep';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'cartao_sus';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'escolaridade';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'certificado_curso';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'vacinacao_covid';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'dependente_certidao';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'dependente_rg_cpf';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'dependente_vacinacao';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'dependente_escolar';

-- 2) Candidatos: novos campos opcionais estruturados
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS cor_raca TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT;

-- 3) Tabela de dependentes
CREATE TABLE IF NOT EXISTS public.dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT,
  birth_date DATE,
  cpf TEXT,
  rg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependents TO authenticated;
GRANT ALL ON public.dependents TO service_role;

ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH pode ver dependentes"
  ON public.dependents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "RH pode gerenciar dependentes"
  ON public.dependents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_dependents_updated_at
  BEFORE UPDATE ON public.dependents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS dependents_candidate_id_idx ON public.dependents(candidate_id);

-- 4) Documents: suportar múltiplos arquivos por tipo + vínculo com dependente + rótulo
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS dependent_id UUID REFERENCES public.dependents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS label TEXT;

CREATE INDEX IF NOT EXISTS documents_dependent_id_idx ON public.documents(dependent_id);
