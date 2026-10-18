CREATE TABLE public.disc_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  respondent_name text NOT NULL,
  phone text,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  status text NOT NULL DEFAULT 'enviado',
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb,
  profile text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (candidate_id IS NOT NULL OR employee_id IS NOT NULL)
);
CREATE INDEX disc_candidate_idx ON public.disc_assessments(candidate_id);
CREATE INDEX disc_employee_idx ON public.disc_assessments(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_assessments TO authenticated;
GRANT ALL ON public.disc_assessments TO service_role;
ALTER TABLE public.disc_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY disc_hr_select ON public.disc_assessments FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY disc_hr_insert ON public.disc_assessments FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY disc_hr_update ON public.disc_assessments FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY disc_hr_delete ON public.disc_assessments FOR DELETE TO authenticated USING (public.is_hr(auth.uid()));