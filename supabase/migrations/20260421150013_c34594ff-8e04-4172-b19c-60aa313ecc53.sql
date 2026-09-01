-- 1. Add residence to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS residence text;

-- 2. Add appeal number to cases
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS appeal_no text;

-- 3. Case files (per-case attachments/notes)
CREATE TABLE IF NOT EXISTS public.case_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code text NOT NULL,
  name text NOT NULL,
  file_type text DEFAULT 'document',
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read case_files" ON public.case_files FOR SELECT USING (true);
CREATE POLICY "Public write case_files" ON public.case_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update case_files" ON public.case_files FOR UPDATE USING (true);
CREATE POLICY "Public delete case_files" ON public.case_files FOR DELETE USING (true);
CREATE TRIGGER update_case_files_updated_at BEFORE UPDATE ON public.case_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Petition templates (reusable)
CREATE TABLE IF NOT EXISTS public.petition_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  category text DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  is_builtin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.petition_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read petition_templates" ON public.petition_templates FOR SELECT USING (true);
CREATE POLICY "Public write petition_templates" ON public.petition_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update petition_templates" ON public.petition_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete petition_templates" ON public.petition_templates FOR DELETE USING (true);
CREATE TRIGGER update_petition_templates_updated_at BEFORE UPDATE ON public.petition_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Saved petitions (instances)
CREATE TABLE IF NOT EXISTS public.petitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  template_code text,
  client_code text,
  case_code text,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read petitions" ON public.petitions FOR SELECT USING (true);
CREATE POLICY "Public write petitions" ON public.petitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update petitions" ON public.petitions FOR UPDATE USING (true);
CREATE POLICY "Public delete petitions" ON public.petitions FOR DELETE USING (true);
CREATE TRIGGER update_petitions_updated_at BEFORE UPDATE ON public.petitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Settings: language preference + custom icons map (JSON)
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS custom_icons jsonb DEFAULT '{}'::jsonb;

-- 7. Seed built-in petition templates
INSERT INTO public.petition_templates (code, title, category, body, is_builtin) VALUES
('TPL-001', 'صحيفة دعوى مدنية', 'civil',
'بسم الله الرحمن الرحيم

محكمة {{court_name}} الموقرة

السيد/ {{client_name}} - المقيم في: {{client_residence}}
رقم البطاقة: {{client_nid}} - هاتف: {{client_phone}}

ضد

السيد/ {{opponent_name}} - رقم البطاقة: {{opponent_id}}

الموضوع: دعوى مدنية برقم {{case_code}}

تحية طيبة وبعد،
أتقدم أنا الموكل بصفتي المدعي إلى عدالتكم بالدعوى المذكورة أعلاه ضد المدعى عليه للأسباب الآتية:

[نص الدعوى يُكتب هنا]

الأسانيد القانونية:
- تطبيقاً لأحكام القانون المدني
- بناءً على ما يثبت بالمستندات المرفقة

الطلبات:
1. قبول الدعوى شكلاً وموضوعاً
2. إلزام المدعى عليه بما يلي: ...

تحريراً في {{today}}

مقدمه للعدالة
المحامي: {{lawyer_name}}', true),

('TPL-002', 'صحيفة دعوى أحوال شخصية', 'family',
'بسم الله الرحمن الرحيم

محكمة الأسرة {{court_name}}

السيد/ {{client_name}} - المقيم في: {{client_residence}}
رقم البطاقة: {{client_nid}}

الموضوع: دعوى أحوال شخصية رقم {{case_code}}

[تفاصيل الدعوى]

الطلبات:
[الطلبات المقدمة للمحكمة]

تحريراً في {{today}}
المحامي: {{lawyer_name}}', true),

('TPL-003', 'مذكرة دفاع', 'criminal',
'بسم الله الرحمن الرحيم

محكمة {{court_name}}
في القضية رقم {{case_code}}

مذكرة بدفاع المتهم/ {{client_name}}
المقيم: {{client_residence}}

الوقائع:
[سرد الوقائع]

الدفوع:
أولاً: [الدفع الأول]
ثانياً: [الدفع الثاني]

لذا نلتمس من عدالة المحكمة:
- براءة المتهم مما هو منسوب إليه

تحريراً في {{today}}
المحامي: {{lawyer_name}}', true),

('TPL-004', 'طلب استئناف', 'general',
'بسم الله الرحمن الرحيم

محكمة الاستئناف {{court_name}}

المستأنف/ {{client_name}} - المقيم: {{client_residence}}
رقم القضية الأصلية: {{case_code}}
رقم الاستئناف: {{appeal_no}}

الموضوع: طلب استئناف الحكم الصادر بتاريخ ...

[أسباب الاستئناف]

الطلبات:
- قبول الاستئناف شكلاً
- إلغاء الحكم المستأنف والقضاء بـ: ...

تحريراً في {{today}}
المحامي: {{lawyer_name}}', true),

('TPL-005', 'إنذار رسمي', 'general',
'بسم الله الرحمن الرحيم

إنذار رسمي

المنذر/ {{client_name}} - المقيم: {{client_residence}}
رقم البطاقة: {{client_nid}}

المنذر إليه/ {{opponent_name}}

الموضوع:
بموجب هذا الإنذار أُنذركم بالآتي:
[نص الإنذار]

وعليه نطلب منكم خلال خمسة عشر يوماً من تاريخه:
1. ...
2. ...

وإلا سنضطر لاتخاذ كافة الإجراءات القانونية.

تحريراً في {{today}}
المحامي: {{lawyer_name}}', true),

('TPL-006', 'دعوى تجارية', 'commercial',
'بسم الله الرحمن الرحيم

محكمة {{court_name}} الاقتصادية

المدعي/ {{client_name}} - المقيم: {{client_residence}}
ضد المدعى عليه/ {{opponent_name}}

الموضوع: دعوى تجارية رقم {{case_code}}

[تفاصيل النزاع التجاري]

الطلبات:
- إلزام المدعى عليه بأداء مبلغ ...
- الفوائد القانونية والمصاريف

تحريراً في {{today}}
المحامي: {{lawyer_name}}', true)
ON CONFLICT (code) DO NOTHING;