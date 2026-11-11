ALTER TABLE public.candidates ADD COLUMN solicitante_vaga text;
COMMENT ON COLUMN public.candidates.solicitante_vaga IS 'Pessoa ou área que solicitou a abertura da vaga; preenchido pelo RH.';