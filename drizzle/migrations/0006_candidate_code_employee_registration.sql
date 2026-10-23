CREATE SEQUENCE IF NOT EXISTS public.candidates_code_seq START 1;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS codigo integer;
ALTER TABLE public.candidates ALTER COLUMN codigo SET DEFAULT nextval('public.candidates_code_seq');
ALTER SEQUENCE public.candidates_code_seq OWNED BY public.candidates.codigo;
CREATE UNIQUE INDEX IF NOT EXISTS candidates_codigo_key ON public.candidates(codigo);
GRANT USAGE, SELECT ON SEQUENCE public.candidates_code_seq TO authenticated, service_role;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS matricula_esocial text;