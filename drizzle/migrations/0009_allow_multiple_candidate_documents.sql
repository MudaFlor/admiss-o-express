ALTER TABLE public.documents DROP CONSTRAINT documents_candidate_id_type_key;
CREATE UNIQUE INDEX documents_single_holder_type_key
ON public.documents (candidate_id, type)
WHERE deleted_at IS NULL
  AND dependent_id IS NULL
  AND type NOT IN ('certificado_curso', 'vacinacao_covid', 'dependente_certidao', 'dependente_rg_cpf', 'dependente_vacinacao', 'dependente_escolar');
COMMENT ON INDEX public.documents_single_holder_type_key IS 'Only active single-file holder documents are unique; courses, vaccination and all dependent document types accept multiple files.';