-- Database regression test: all rows are rolled back; no existing documents are changed.
BEGIN;
WITH kinds(type) AS (
  VALUES ('certificado_curso'), ('vacinacao_covid'), ('dependente_certidao'),
         ('dependente_rg_cpf'), ('dependente_vacinacao'), ('dependente_escolar')
), inserted AS (
  INSERT INTO public.documents (candidate_id, type, storage_path)
  SELECT c.id, k.type::public.document_type,
         'regression-test/' || gen_random_uuid()::text || '.pdf'
  FROM (SELECT id FROM public.candidates ORDER BY created_at LIMIT 1) c
  CROSS JOIN kinds k CROSS JOIN generate_series(1, 2)
  RETURNING type
)
SELECT 1 / CASE WHEN count(*) = 12 AND count(DISTINCT type) = 6 THEN 1 ELSE 0 END
  AS multiple_document_uploads_passed FROM inserted;
ROLLBACK;