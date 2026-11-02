CREATE UNIQUE INDEX IF NOT EXISTS employees_matricula_normalized_unique ON public.employees (lower(btrim(matricula_esocial))) WHERE matricula_esocial IS NOT NULL AND btrim(matricula_esocial) <> '';
CREATE OR REPLACE FUNCTION public.enforce_employee_registration() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.matricula_esocial := btrim(NEW.matricula_esocial);
  IF NEW.matricula_esocial IS NULL OR NEW.matricula_esocial = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Nº de matrícula é obrigatório';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_employee_registration() FROM PUBLIC;
CREATE TRIGGER employees_require_registration BEFORE INSERT OR UPDATE OF matricula_esocial ON public.employees FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_registration();