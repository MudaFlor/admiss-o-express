
CREATE TYPE public.termination_reason AS ENUM ('pedido_demissao','sem_justa_causa','justa_causa','fim_experiencia','acordo');
CREATE TYPE public.absence_reason AS ENUM ('atestado','falta_justificada','falta_injustificada','licenca');

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  position text,
  department text,
  admission_date date NOT NULL,
  termination_date date,
  termination_reason public.termination_reason,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_owner_select ON public.employees FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));
CREATE POLICY employees_owner_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY employees_owner_update ON public.employees FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));
CREATE POLICY employees_owner_delete ON public.employees FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));

CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX employees_created_by_idx ON public.employees(created_by);
CREATE INDEX employees_admission_idx ON public.employees(admission_date);
CREATE INDEX employees_termination_idx ON public.employees(termination_date);

CREATE TABLE public.absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason public.absence_reason NOT NULL,
  hours_lost numeric(6,2) NOT NULL DEFAULT 8,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.absences TO authenticated;
GRANT ALL ON public.absences TO service_role;

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY absences_owner_select ON public.absences FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));
CREATE POLICY absences_owner_insert ON public.absences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY absences_owner_update ON public.absences FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));
CREATE POLICY absences_owner_delete ON public.absences FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(),'admin'));

CREATE TRIGGER absences_set_updated_at BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX absences_employee_idx ON public.absences(employee_id);
CREATE INDEX absences_start_idx ON public.absences(start_date);
