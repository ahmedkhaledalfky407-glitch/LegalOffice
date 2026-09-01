# مكتب العدل — نظام إدارة المحاماة

نظام متكامل لإدارة مكتب المحاماة بواجهة عربية فاخرة، يغطي: **الموكلين، القضايا، المحاكم، المواعيد، المستندات، المالية، المذكرات والعرائض القضائية**، مع وضعَي تشغيل:

1. **تطبيق سطح مكتب (Electron)** — نسخة ويندوز مستقلة تعمل بنسخة محلية من قاعدة البيانات أو بالربط المباشر مع Supabase.
2. **تطبيق ويب** — يعمل على المتصفح عبر منصة Lovable أو أي استضافة ثابتة (Vercel / Netlify / GitHub Pages).

---

## 🌐 الموقع الإلكتروني (نسخة الويب المباشرة)

| العنصر | الرابط |
|---|---|
| 🌐 الموقع المباشر | **[https://ahmedkhaledalfky407-glitch.github.io/LegalOffice/](https://ahmedkhaledalfky407-glitch.github.io/LegalOffice/)** |
| 📦 نسخة ويندوز (Release) | [GitHub Releases](https://github.com/ahmedkhaledalfky407-glitch/LegalOffice/releases) |

> يعمل الموقع مباشرةً على المتصفح ويرتبط تلقائياً بقاعدة بيانات Supabase. النشر يتم تلقائياً عبر GitHub Actions عند كل تحديث لفرع `main`.

---

## ✨ المميزات

- **إدارة الموكلين**: بيانات كاملة (الرقم القومي، التوكيلات، الأرشيف، المحافظات) مع حالة التوكيل.
- **إدارة القضايا**: أنواع (مدنية، تجارية، أسرة، جنائية، إدارية)، حالات (نشطة / مرفوعة / مغلقة)، رسوم الأتعاب، الجلسات القادمة.
- **إدارة المحاكم**: محاكم ابتدائية، استئناف، أسرة، اقتصادية مع بيانات المحافظة والعنوان.
- **المواعيد**: جلسات، اجتماعات، استشارات، تحكيم مع إشعارات وتصنيفات.
- **المستندات**: تصنيف وربط بالقضايا مع حالات التحقق (موثّق / ناقص).
- **الملفات المالية**: إيرادات ومصروفات، وحِساب صافي الأرباح.
- **العرائض والمذكرات**: قوالب عربية جاهزة (صحيفة دعوى مدنية، أحوال شخصية، مذكرة دفاع، طلب استئناف، إنذار رسمي، دعوى تجارية) مع حشو تلقائي للبيانات.
- **متعدد المستخدمين**: أدوار (مدير / محام / مساعد / مشاهد) عبر Supabase Auth مع RLS.
- **قاعدة بيانات محلية مدمجة**: يعمل التطبيق بدون إنترنت عبر محرك JSON محلي داخل Electron.
- **واجهة عربية RTL**: خطوط عربية (Cairo / Tajawal)، ثيم داكن فاخر، وألوان قابلة للتخصيص.
- **تصدير واستيراد البيانات** ودعم قوانين (ملف JSON).

---

## 🛠️ التقنيات

| الطبقة | التقنية |
|---|---|
| الواجهة | React 18 + TypeScript + Vite |
| التصميم | Tailwind CSS + shadcn/ui (Radix UI) |
| الحالة | Zustand |
| البيانات | TanStack Query |
| قاعدة البيانات | Supabase (PostgreSQL) + محرك محلي JSON |
| طبقة سطح المكتب | Electron (Electron Packager) |
| النماذج والتحقق | react-hook-form + zod |
| التقارير | Recharts |
| توليد مستندات Word | docx + file-saver |
| التعدد اللغوي | i18next (العربية افتراضياً) |

---

## 📁 هيكل المشروع

```
├── electron/            # طبقة سطح المكتب (main, preload, settings)
│   ├── main.cjs         # نافذة Electron + خادم DB محلي + IPC
│   ├── main-preload.cjs
│   ├── settings-preload.cjs
│   └── settings.html
├── supabase/
│   ├── config.toml      # إعدادات المشروع
│   ├── migrations/      # هجرات قاعدة البيانات (SQL)
│   └── functions/       # الدوال (admin-create-user)
├── src/                 # شيفرة التطبيق (React)
├── dist/                # مخرجات البناء (vite build)
├── index.html
├── package.json
├── vite.config.ts
└── .env                 # متغيرات Supabase (مفاتيح publishable فقط)
```

> ملاحظة: لا تشمل النسخة المنشورة حالياً مجلد `src/` لأنها حزمة إنتاجية جاهزة؛ الشيفرة المصدرية تُستعاد من مشروع Lovable / النسخة المطوّرة.

---

## 🚀 التشغيل محلياً

**المتطلبات:** Node.js ≥ 18 (يُنصح بـ ≥ 20)، ومدير حزم `npm` (أو `bun`).

```bash
# 1) تثبيت الاعتماديات
npm install

# 2) إعداد متغيرات البيئة
# انسخ .env.example إلى .env وعبّئ قيم مشروع Supabase الخاص بك

# 3) تشغيل خادم التطوير
npm run dev
```

افتح المتصفح على `http://localhost:8080`.

### البناء للإنتاج

```bash
npm run build        # produces dist/
npm run preview      # معاينة الناتج محلياً
```

### بناء تطبيق سطح المكتب (Windows)

```bash
# 1) بناء الواجهة بمسار نسبي (مطلوب لملفات Electron المحلية)
$env:ELECTRON_BUILD="true"; npm run build

# 2) التغليف
npx electron-packager . "LegalOffice" --platform=win32 --arch=x64 `
  --out=release --overwrite --asar
```

يظهر الملف التنفيذي في `release/LegalOffice-win32-x64/`.

---

## 🗄️ إعداد قاعدة البيانات (Supabase)

1. أنشئ مشروعاً على [Supabase](https://supabase.com).
2. طبّق الهجرات بالترتيب من `supabase/migrations/` (عبر Supabase SQL Editor أو `supabase db push`).
3. احصل على `Project URL` و`anon / publishable key` وضعها في `.env`.
4. أنشئ المستخدم الأول عبر الدالة `admin-create-user` أو مباشرة في Authentication.

> **الأمان**: فعّل RLS (مطبّق في الهجرات) ولا تضع أبداً مفتاح `service_role` في `.env`.

---

## 🔐 الحساب الافتراضي

| الحقل | القيمة |
|---|---|
| كلمة قفل النظام | `admin123` (قابلة للتغيير من الإعدادات) |
| الأدوار | `admin`, `lawyer`, `assistant`, `viewer` |

---

## 📦 الإصدارات

- أحدث نسخة ويندوز: منشورة ضمن إصدارات GitHub (Release Assets) باسم `LegalOffice-win32-x64`.

---

## 👤 المؤلف

أحمد خالد الفقي — [GitHub](https://github.com/ahmedkhaledalfky407-glitch)

---

## ⚖️ الترخيص

رخصة MIT — انظر ملف `LICENSE` الخاص بمكوّنات Electron؛ الشيفرة الخاصة بالمشروع متاحة للاستخدام مع ذكر المصدر.
