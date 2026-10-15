ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'rh';

CREATE POLICY candidates_self_select ON public.candidates FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.save_my_candidate_profile(
  _full_name text, _email text, _phone text, _position text,
  _idade text, _data_nascimento text, _endereco text,
  _resumo text, _palavras text[], _curriculo_texto text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(length(trim(_full_name)),0) < 2 THEN RAISE EXCEPTION 'nome obrigatório'; END IF;
  SELECT id INTO _id FROM public.candidates WHERE user_id = _uid;
  IF _id IS NULL THEN
    INSERT INTO public.candidates (created_by, user_id, origem, full_name, email, phone, position, form_data, stage)
    VALUES (_uid, _uid, 'portal', left(_full_name,160), nullif(left(_email,255),''), nullif(left(_phone,40),''), nullif(left(_position,160),''),
      jsonb_build_object('perfil_recrutamento', jsonb_build_object(
        'idade', nullif(_idade,''), 'data_nascimento', nullif(_data_nascimento,''), 'endereco', nullif(left(_endereco,500),''),
        'resumo_experiencias', nullif(left(_resumo,5000),''), 'palavras_chave', to_jsonb(coalesce(_palavras, '{}'::text[])),
        'curriculo_texto', nullif(left(_curriculo_texto,20000),''))),
      'curriculo_enviado')
    RETURNING id INTO _id;
    INSERT INTO public.notifications(candidate_id, event, payload) VALUES (_id, 'candidate.self_registered', '{}'::jsonb);
  ELSE
    UPDATE public.candidates SET full_name = left(_full_name,160), email = nullif(left(_email,255),''), phone = nullif(left(_phone,40),''),
      position = nullif(left(_position,160),''),
      form_data = coalesce(form_data,'{}'::jsonb) || jsonb_build_object('perfil_recrutamento', jsonb_build_object(
        'idade', nullif(_idade,''), 'data_nascimento', nullif(_data_nascimento,''), 'endereco', nullif(left(_endereco,500),''),
        'resumo_experiencias', nullif(left(_resumo,5000),''), 'palavras_chave', to_jsonb(coalesce(_palavras, '{}'::text[])),
        'curriculo_texto', nullif(left(_curriculo_texto,20000),''))),
      updated_at = now()
    WHERE id = _id;
  END IF;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.save_my_candidate_profile(text,text,text,text,text,text,text,text,text[],text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.save_my_candidate_profile(text,text,text,text,text,text,text,text,text[],text) TO authenticated;