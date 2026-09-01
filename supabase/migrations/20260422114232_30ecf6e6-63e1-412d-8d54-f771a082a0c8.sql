
-- 1. Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'lawyer', 'assistant', 'viewer');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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

-- 5. Helper: current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 6. Helper: current user can write (admin/lawyer/assistant)
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'lawyer')
      OR public.has_role(auth.uid(), 'assistant')
$$;

-- 7. RLS for profiles
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile or admin"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin delete profiles"
  ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- 8. RLS for user_roles
CREATE POLICY "Users see own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin manages roles insert"
  ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin manages roles update"
  ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin manages roles delete"
  ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- 9. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  -- Default role: viewer (admin must promote later)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Lawyers table
CREATE TABLE public.lawyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  address TEXT,
  national_id TEXT,
  phone TEXT,
  bar_number TEXT,
  join_date DATE,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers readable by authenticated"
  ON public.lawyers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lawyers insert by writers"
  ON public.lawyers FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Lawyers update by writers"
  ON public.lawyers FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Lawyers delete by admin"
  ON public.lawyers FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_lawyers_updated_at
  BEFORE UPDATE ON public.lawyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Add supervising lawyer to cases
ALTER TABLE public.cases ADD COLUMN lawyer_code TEXT;

-- 13. Tighten RLS on existing tables — replace permissive policies
-- Clients
DROP POLICY IF EXISTS "Public read clients" ON public.clients;
DROP POLICY IF EXISTS "Public write clients" ON public.clients;
DROP POLICY IF EXISTS "Public update clients" ON public.clients;
DROP POLICY IF EXISTS "Public delete clients" ON public.clients;
CREATE POLICY "Auth read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update clients" ON public.clients FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin());

-- Cases
DROP POLICY IF EXISTS "Public read cases" ON public.cases;
DROP POLICY IF EXISTS "Public write cases" ON public.cases;
DROP POLICY IF EXISTS "Public update cases" ON public.cases;
DROP POLICY IF EXISTS "Public delete cases" ON public.cases;
CREATE POLICY "Auth read cases" ON public.cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert cases" ON public.cases FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update cases" ON public.cases FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete cases" ON public.cases FOR DELETE TO authenticated USING (public.is_admin());

-- Courts
DROP POLICY IF EXISTS "Public read courts" ON public.courts;
DROP POLICY IF EXISTS "Public write courts" ON public.courts;
DROP POLICY IF EXISTS "Public update courts" ON public.courts;
DROP POLICY IF EXISTS "Public delete courts" ON public.courts;
CREATE POLICY "Auth read courts" ON public.courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert courts" ON public.courts FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update courts" ON public.courts FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete courts" ON public.courts FOR DELETE TO authenticated USING (public.is_admin());

-- Documents
DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public write documents" ON public.documents;
DROP POLICY IF EXISTS "Public update documents" ON public.documents;
DROP POLICY IF EXISTS "Public delete documents" ON public.documents;
CREATE POLICY "Auth read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update documents" ON public.documents FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete documents" ON public.documents FOR DELETE TO authenticated USING (public.is_admin());

-- Appointments
DROP POLICY IF EXISTS "Public read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public write appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public delete appointments" ON public.appointments;
CREATE POLICY "Auth read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.is_admin());

-- Finances
DROP POLICY IF EXISTS "Public read finances" ON public.finances;
DROP POLICY IF EXISTS "Public write finances" ON public.finances;
DROP POLICY IF EXISTS "Public update finances" ON public.finances;
DROP POLICY IF EXISTS "Public delete finances" ON public.finances;
CREATE POLICY "Auth read finances" ON public.finances FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lawyer'));
CREATE POLICY "Admin/Lawyer insert finances" ON public.finances FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lawyer'));
CREATE POLICY "Admin/Lawyer update finances" ON public.finances FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lawyer'));
CREATE POLICY "Admin delete finances" ON public.finances FOR DELETE TO authenticated USING (public.is_admin());

-- Case files
DROP POLICY IF EXISTS "Public read case_files" ON public.case_files;
DROP POLICY IF EXISTS "Public write case_files" ON public.case_files;
DROP POLICY IF EXISTS "Public update case_files" ON public.case_files;
DROP POLICY IF EXISTS "Public delete case_files" ON public.case_files;
CREATE POLICY "Auth read case_files" ON public.case_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert case_files" ON public.case_files FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update case_files" ON public.case_files FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete case_files" ON public.case_files FOR DELETE TO authenticated USING (public.is_admin());

-- Petitions
DROP POLICY IF EXISTS "Public read petitions" ON public.petitions;
DROP POLICY IF EXISTS "Public write petitions" ON public.petitions;
DROP POLICY IF EXISTS "Public update petitions" ON public.petitions;
DROP POLICY IF EXISTS "Public delete petitions" ON public.petitions;
CREATE POLICY "Auth read petitions" ON public.petitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert petitions" ON public.petitions FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update petitions" ON public.petitions FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete petitions" ON public.petitions FOR DELETE TO authenticated USING (public.is_admin());

-- Petition templates
DROP POLICY IF EXISTS "Public read petition_templates" ON public.petition_templates;
DROP POLICY IF EXISTS "Public write petition_templates" ON public.petition_templates;
DROP POLICY IF EXISTS "Public update petition_templates" ON public.petition_templates;
DROP POLICY IF EXISTS "Public delete petition_templates" ON public.petition_templates;
CREATE POLICY "Auth read petition_templates" ON public.petition_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writer insert petition_templates" ON public.petition_templates FOR INSERT TO authenticated WITH CHECK (public.can_write());
CREATE POLICY "Writer update petition_templates" ON public.petition_templates FOR UPDATE TO authenticated USING (public.can_write());
CREATE POLICY "Admin delete petition_templates" ON public.petition_templates FOR DELETE TO authenticated USING (public.is_admin());

-- App settings: only admin
DROP POLICY IF EXISTS "Public read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public write settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public update settings" ON public.app_settings;
CREATE POLICY "Auth read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.is_admin());

-- 14. Storage bucket for avatars (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars publicly viewable"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Authenticated update own avatars"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated delete own avatars"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
