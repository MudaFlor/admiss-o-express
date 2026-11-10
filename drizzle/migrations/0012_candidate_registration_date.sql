ALTER TABLE public.candidates ADD COLUMN data_cadastro date DEFAULT (timezone('America/Sao_Paulo', now())::date);
UPDATE public.candidates SET data_cadastro = timezone('America/Sao_Paulo', created_at)::date;
CREATE INDEX candidates_data_cadastro_idx ON public.candidates (data_cadastro);
COMMENT ON COLUMN public.candidates.data_cadastro IS 'Data de cadastro informada pelo RH; registros anteriores usam a data original de criação em São Paulo.';