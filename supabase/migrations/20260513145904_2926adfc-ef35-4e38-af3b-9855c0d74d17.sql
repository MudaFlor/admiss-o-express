
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'rh');
CREATE TYPE public.candidate_status AS ENUM ('pendente', 'em_analise', 'aprovado', 'rejeitado');
CREATE TYPE public.document_type AS ENUM ('rg', 'cpf', 'cnh', 'comprovante_residencia');
CREATE TYPE public.document_status AS ENUM ('pendente', 'processado', 'aprovado', 'rejeitado');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Candidates
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  status public.candidate_status NOT NULL DEFAULT 'pendente',
  access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidates_created_by ON public.candidates(created_by);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_access_token ON public.candidates(access_token);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  type public.document_type NOT NULL,
  storage_path TEXT NOT NULL,
  ocr_data JSONB DEFAULT '{}'::jsonb,
  ocr_confidence NUMERIC,
  status public.document_status NOT NULL DEFAULT 'pendente',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, type)
);

CREATE INDEX idx_documents_candidate ON public.documents(candidate_id);

-- Notifications log
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'company_name'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rh');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Candidates policies
CREATE POLICY "candidates_owner_select" ON public.candidates FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "candidates_owner_insert" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "candidates_owner_update" ON public.candidates FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "candidates_owner_delete" ON public.candidates FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Documents policies (mirror candidates ownership)
CREATE POLICY "documents_owner_select" ON public.documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "documents_owner_modify" ON public.documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Notifications
CREATE POLICY "notifications_owner_select" ON public.notifications FOR SELECT TO authenticated
  USING (candidate_id IS NULL OR EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-documents', 'candidate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only authenticated owners/admins can read; uploads via service role from server fn
CREATE POLICY "storage_owner_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'candidate-documents'
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
