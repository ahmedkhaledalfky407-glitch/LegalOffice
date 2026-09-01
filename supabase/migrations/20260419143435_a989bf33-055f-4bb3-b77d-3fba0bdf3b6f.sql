-- Update timestamp function (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  nid TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  addr TEXT,
  poa_n TEXT,
  poa_t TEXT DEFAULT 'general',
  poa_d DATE,
  poa_a TEXT,
  arch TEXT,
  case_codes TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Courts
CREATE TABLE public.courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gov TEXT,
  type TEXT,
  addr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cases
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  client_code TEXT,
  court_code TEXT,
  type TEXT DEFAULT 'مدنية',
  status TEXT DEFAULT 'active',
  opp TEXT,
  opp_id TEXT,
  next_date DATE,
  fee NUMERIC DEFAULT 0,
  notes TEXT,
  docs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  case_code TEXT,
  cat TEXT DEFAULT 'أخرى',
  status TEXT DEFAULT 'uploaded',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  appt_date DATE NOT NULL,
  appt_time TIME DEFAULT '09:00',
  client_code TEXT,
  type TEXT DEFAULT 'meet',
  loc TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finances
CREATE TABLE public.finances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'income',
  amount NUMERIC NOT NULL DEFAULT 0,
  client_code TEXT,
  fin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings (single row)
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_name TEXT DEFAULT 'مكتب العدل للمحاماة',
  user_name TEXT DEFAULT 'أحمد خالد الفقي',
  user_role TEXT DEFAULT 'مدير النظام',
  user_phone TEXT DEFAULT '01012345678',
  user_email TEXT DEFAULT 'admin@office.com',
  lock_password TEXT DEFAULT 'admin123',
  accent_primary TEXT DEFAULT '#b8963e',
  accent_secondary TEXT DEFAULT '#d4af5a',
  bg_color TEXT DEFAULT '#07101f',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_courts_updated BEFORE UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finances_updated BEFORE UPDATE ON public.finances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth, single-office app protected by client-side lock)
CREATE POLICY "Public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public write clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Public delete clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Public read courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Public write courts" ON public.courts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update courts" ON public.courts FOR UPDATE USING (true);
CREATE POLICY "Public delete courts" ON public.courts FOR DELETE USING (true);

CREATE POLICY "Public read cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Public write cases" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cases" ON public.cases FOR UPDATE USING (true);
CREATE POLICY "Public delete cases" ON public.cases FOR DELETE USING (true);

CREATE POLICY "Public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Public write documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Public delete documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Public read appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Public write appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Public delete appointments" ON public.appointments FOR DELETE USING (true);

CREATE POLICY "Public read finances" ON public.finances FOR SELECT USING (true);
CREATE POLICY "Public write finances" ON public.finances FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update finances" ON public.finances FOR UPDATE USING (true);
CREATE POLICY "Public delete finances" ON public.finances FOR DELETE USING (true);

CREATE POLICY "Public read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public write settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update settings" ON public.app_settings FOR UPDATE USING (true);

-- Seed initial settings row
INSERT INTO public.app_settings DEFAULT VALUES;

-- Seed initial sample data
INSERT INTO public.courts (code, name, gov, type, addr) VALUES
  ('CRT-001','محكمة القاهرة الابتدائية','القاهرة','ابتدائية','ميدان باب الخلق'),
  ('CRT-002','محكمة استئناف القاهرة','القاهرة','استئناف','كورنيش النيل'),
  ('CRT-003','محكمة الجيزة للأسرة','الجيزة','أسرة','الجيزة');

INSERT INTO public.clients (code, name, nid, phone, email, addr, poa_n, poa_t, poa_d, poa_a, arch, case_codes) VALUES
  ('CLT-001','محمد أحمد السيد','29901150105432','01012345678','m.ahmed@email.com','القاهرة','12345/2024','general','2024-01-15','الشهر العقاري','ARC-2024-001', ARRAY['CASE-001','CASE-002']),
  ('CLT-002','سمر علي حسن','30005240303216','01198765432',NULL,'الجيزة','67890/2024','special','2024-03-10','توثيق القاهرة','ARC-2024-002', ARRAY['CASE-003']),
  ('CLT-003','خالد إبراهيم نور','28812010204871','01234567890',NULL,'مدينة نصر','11223/2023','general','2023-11-20','الشهر العقاري','ARC-2024-003', ARRAY['CASE-004']);

INSERT INTO public.cases (code, client_code, court_code, type, status, opp, opp_id, next_date, fee, notes, docs) VALUES
  ('CASE-001','CLT-001','CRT-001','مدنية','active','شركة النيل',NULL,'2025-04-15',15000,'قضية تعويض', ARRAY['صحيفة الدعوى']),
  ('CASE-002','CLT-001','CRT-002','تجارية','pending','محمود الطويل','29905120103456',NULL,20000,NULL, ARRAY['التوكيل']),
  ('CASE-003','CLT-002','CRT-003','أسرة','active',NULL,NULL,'2025-04-20',8000,NULL, '{}'),
  ('CASE-004','CLT-003','CRT-001','جنائية','closed','علي سالم',NULL,NULL,12000,NULL, '{}');

INSERT INTO public.documents (code, name, case_code, cat, status) VALUES
  ('DOC-001','صحيفة دعوى مدنية.pdf','CASE-001','صحيفة دعوى','verified'),
  ('DOC-002','توكيل رسمي.pdf','CASE-002','توكيل','missing');

INSERT INTO public.appointments (code, title, appt_date, appt_time, client_code, type, loc) VALUES
  ('APT-001','جلسة محكمة CASE-001','2025-04-01','10:00','CLT-001','court','محكمة القاهرة'),
  ('APT-002','اجتماع مع محمد أحمد','2025-04-01','14:00','CLT-001','meet','مكتب المحاماة'),
  ('APT-003','جلسة طلاق','2025-04-03','09:00','CLT-002','court','محكمة الجيزة'),
  ('APT-004','استشارة قانونية','2025-04-08','15:00','CLT-003','consult','مكتب المحاماة'),
  ('APT-005','جلسة تحكيم','2025-04-10','11:00',NULL,'arbitration','غرفة التجارة');

INSERT INTO public.finances (code, type, amount, client_code, fin_date, description) VALUES
  ('FIN-001','income',15000,'CLT-001','2025-03-31','دفعة أتعاب — محمد أحمد'),
  ('FIN-002','income',12000,'CLT-003','2025-03-29','أتعاب — خالد نور'),
  ('FIN-003','expense',3500,NULL,'2025-03-28','إيجار المكتب'),
  ('FIN-004','income',8000,'CLT-002','2025-03-25','دفعة أولى — سمر حسن'),
  ('FIN-005','expense',1200,NULL,'2025-03-20','مستلزمات مكتبية');