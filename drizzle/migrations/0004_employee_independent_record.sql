ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS pis text,
  ADD COLUMN IF NOT EXISTS ctps text,
  ADD COLUMN IF NOT EXISTS salary numeric,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS work_schedule text,
  ADD COLUMN IF NOT EXISTS bank_info text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.employee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'anotacao',
  description text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.employee_history TO authenticated;
GRANT ALL ON public.employee_history TO service_role;
ALTER TABLE public.employee_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_history_hr_select ON public.employee_history FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY employee_history_hr_insert ON public.employee_history FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()));
CREATE INDEX employee_history_emp_idx ON public.employee_history(employee_id, created_at DESC);

CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text,
  storage_path text NOT NULL,
  source text NOT NULL DEFAULT 'admissao',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_documents_hr_select ON public.employee_documents FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY employee_documents_hr_insert ON public.employee_documents FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY employee_documents_admin_delete ON public.employee_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX employee_documents_emp_idx ON public.employee_documents(employee_id);