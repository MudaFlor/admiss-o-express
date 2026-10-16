CREATE UNIQUE INDEX IF NOT EXISTS candidates_cpf_unique ON public.candidates (cpf) WHERE cpf IS NOT NULL AND length(cpf) = 11;

CREATE OR REPLACE FUNCTION public._merge_candidates_core(_primary uuid, _dup uuid, _actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.candidates%ROWTYPE;
  d public.candidates%ROWTYPE;
  v_uid uuid;
  v_conflicts int;
  v_name text; v_cpf text; v_birth text; v_mae text; v_pai text;
  v_fd jsonb;
BEGIN
  IF _primary = _dup THEN RAISE EXCEPTION 'Cadastros iguais'; END IF;
  SELECT * INTO p FROM candidates WHERE id = _primary FOR UPDATE;
  SELECT * INTO d FROM candidates WHERE id = _dup FOR UPDATE;
  IF p.id IS NULL OR d.id IS NULL THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;
  IF p.cpf IS NOT NULL AND d.cpf IS NOT NULL AND length(p.cpf)=11 AND length(d.cpf)=11 AND p.cpf <> d.cpf THEN
    RAISE EXCEPTION 'Os CPFs são diferentes. Os cadastros não podem ser unidos.';
  END IF;

  SELECT count(*) INTO v_conflicts FROM documents a JOIN documents b ON a.type = b.type
   WHERE a.candidate_id = _dup AND b.candidate_id = _primary;
  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Os dois cadastros têm documentos do mesmo tipo. Exclua definitivamente a cópia repetida antes de unir.';
  END IF;

  UPDATE documents SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE dependents SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE lgpd_consents SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE correction_requests SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE candidate_stage_history SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE messages_log SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE notifications SET candidate_id = _primary WHERE candidate_id = _dup;
  UPDATE employees SET candidate_id = _primary WHERE candidate_id = _dup;

  v_uid := d.user_id;
  UPDATE candidates SET user_id = NULL, cpf = NULL WHERE id = _dup;

  v_fd := coalesce(d.form_data, '{}'::jsonb) || coalesce((
    SELECT jsonb_object_agg(key, value) FROM jsonb_each(coalesce(p.form_data,'{}'::jsonb))
    WHERE value <> '""'::jsonb AND value <> 'null'::jsonb), '{}'::jsonb);

  -- Dados dos documentos oficiais prevalecem
  SELECT x.v INTO v_name FROM (
    SELECT ocr_data->'values'->>'nome' v, array_position(ARRAY['rg','cpf','cnh','certidao'], type::text) o
    FROM documents WHERE candidate_id=_primary AND deleted_at IS NULL AND dependent_id IS NULL
      AND type::text IN ('rg','cpf','cnh','certidao')) x WHERE coalesce(trim(x.v),'')<>'' ORDER BY x.o LIMIT 1;
  SELECT x.v INTO v_cpf FROM (
    SELECT regexp_replace(ocr_data->'values'->>'cpf','\D','','g') v, array_position(ARRAY['cpf','rg','cnh'], type::text) o
    FROM documents WHERE candidate_id=_primary AND deleted_at IS NULL AND dependent_id IS NULL
      AND type::text IN ('cpf','rg','cnh')) x WHERE length(x.v)=11 ORDER BY x.o LIMIT 1;
  SELECT x.v INTO v_birth FROM (
    SELECT ocr_data->'values'->>'data_nascimento' v, array_position(ARRAY['rg','cpf','cnh','certidao'], type::text) o
    FROM documents WHERE candidate_id=_primary AND deleted_at IS NULL AND dependent_id IS NULL
      AND type::text IN ('rg','cpf','cnh','certidao')) x WHERE coalesce(trim(x.v),'')<>'' ORDER BY x.o LIMIT 1;
  SELECT x.v INTO v_mae FROM (
    SELECT ocr_data->'values'->>'nome_mae' v, array_position(ARRAY['rg','certidao'], type::text) o
    FROM documents WHERE candidate_id=_primary AND deleted_at IS NULL AND dependent_id IS NULL
      AND type::text IN ('rg','certidao')) x WHERE coalesce(trim(x.v),'')<>'' ORDER BY x.o LIMIT 1;
  SELECT x.v INTO v_pai FROM (
    SELECT ocr_data->'values'->>'nome_pai' v, array_position(ARRAY['rg','certidao'], type::text) o
    FROM documents WHERE candidate_id=_primary AND deleted_at IS NULL AND dependent_id IS NULL
      AND type::text IN ('rg','certidao')) x WHERE coalesce(trim(x.v),'')<>'' ORDER BY x.o LIMIT 1;

  IF v_name IS NOT NULL THEN v_fd := v_fd || jsonb_build_object('full_name', v_name); END IF;
  IF v_cpf IS NOT NULL THEN v_fd := v_fd || jsonb_build_object('cpf', v_cpf); END IF;
  IF v_birth IS NOT NULL THEN v_fd := v_fd || jsonb_build_object('data_nascimento', v_birth); END IF;
  IF v_mae IS NOT NULL THEN v_fd := v_fd || jsonb_build_object('nome_mae', v_mae); END IF;
  IF v_pai IS NOT NULL THEN v_fd := v_fd || jsonb_build_object('nome_pai', v_pai); END IF;

  UPDATE candidates SET
    full_name = coalesce(v_name, CASE WHEN p.full_name ILIKE 'Candidato Teste%' THEN d.full_name ELSE p.full_name END),
    cpf = coalesce(v_cpf, nullif(p.cpf,''), nullif(d.cpf,'')),
    email = coalesce(nullif(p.email,''), d.email),
    phone = coalesce(nullif(p.phone,''), d.phone),
    position = coalesce(nullif(p.position,''), d.position),
    sexo = coalesce(nullif(p.sexo,''), d.sexo),
    cor_raca = coalesce(nullif(p.cor_raca,''), d.cor_raca),
    estado_civil = coalesce(nullif(p.estado_civil,''), d.estado_civil),
    lgpd_accepted_at = coalesce(p.lgpd_accepted_at, d.lgpd_accepted_at),
    user_id = coalesce(p.user_id, v_uid),
    form_data = v_fd
  WHERE id = _primary;

  INSERT INTO audit_logs(actor_user_id, action, entity, entity_id, metadata)
  VALUES (_actor, 'merge_candidates', 'candidate', _primary,
          jsonb_build_object('merged_from', _dup, 'snapshot', to_jsonb(d)));

  DELETE FROM candidates WHERE id = _dup;
  RETURN _primary;
END $$;

REVOKE ALL ON FUNCTION public._merge_candidates_core(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.merge_candidates(_primary uuid, _dup uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_hr(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN public._merge_candidates_core(_primary, _dup, auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.merge_candidates(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_candidates(uuid, uuid) TO authenticated;