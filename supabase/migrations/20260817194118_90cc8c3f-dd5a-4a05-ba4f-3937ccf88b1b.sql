-- 1) Promote current sole user to admin (workspace owner)
INSERT INTO public.user_roles (user_id, role)
SELECT 'a212eb34-415b-4534-90d7-8d6dc563f3ec'::uuid, 'admin'::app_role
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');

-- 2) New signups are pending until an admin approves (first ever user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name'
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$function$;

-- helper: is the caller part of the HR team?
CREATE OR REPLACE FUNCTION public.is_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('rh','admin')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_hr(uuid) TO authenticated;

-- 3) Shared workspace RLS (role based instead of created_by)
DROP POLICY IF EXISTS candidates_owner_select ON public.candidates;
DROP POLICY IF EXISTS candidates_owner_insert ON public.candidates;
DROP POLICY IF EXISTS candidates_owner_update ON public.candidates;
DROP POLICY IF EXISTS candidates_owner_delete ON public.candidates;
CREATE POLICY candidates_hr_select ON public.candidates FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY candidates_hr_insert ON public.candidates FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY candidates_hr_update ON public.candidates FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY candidates_admin_delete ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS employees_owner_select ON public.employees;
DROP POLICY IF EXISTS employees_owner_insert ON public.employees;
DROP POLICY IF EXISTS employees_owner_update ON public.employees;
DROP POLICY IF EXISTS employees_owner_delete ON public.employees;
CREATE POLICY employees_hr_select ON public.employees FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY employees_hr_insert ON public.employees FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY employees_hr_update ON public.employees FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY employees_admin_delete ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS absences_owner_select ON public.absences;
DROP POLICY IF EXISTS absences_owner_insert ON public.absences;
DROP POLICY IF EXISTS absences_owner_update ON public.absences;
DROP POLICY IF EXISTS absences_owner_delete ON public.absences;
CREATE POLICY absences_hr_select ON public.absences FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY absences_hr_insert ON public.absences FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY absences_hr_update ON public.absences FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY absences_hr_delete ON public.absences FOR DELETE TO authenticated USING (public.is_hr(auth.uid()));

DROP POLICY IF EXISTS documents_owner_select ON public.documents;
DROP POLICY IF EXISTS documents_owner_modify ON public.documents;
CREATE POLICY documents_hr_select ON public.documents FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY documents_hr_modify ON public.documents FOR ALL TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

DROP POLICY IF EXISTS lgpd_consents_owner_select ON public.lgpd_consents;
CREATE POLICY lgpd_consents_hr_select ON public.lgpd_consents FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));

DROP POLICY IF EXISTS notifications_owner_select ON public.notifications;
CREATE POLICY notifications_hr_select ON public.notifications FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));

-- 4) Document requirements: restricted to HR/admin
DROP POLICY IF EXISTS "Requisitos visíveis a todos autenticados" ON public.document_requirements;
CREATE POLICY docreq_hr_select ON public.document_requirements FOR SELECT TO authenticated USING (public.is_hr(auth.uid()));

-- 5) Storage: no direct client access to candidate documents (app uses signed URLs only)
DROP POLICY IF EXISTS "candidate_documents_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "candidate documents read" ON storage.objects;
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND qual ILIKE '%candidate-documents%' OR with_check ILIKE '%candidate-documents%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- 6) Internal trigger functions must not be callable through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;