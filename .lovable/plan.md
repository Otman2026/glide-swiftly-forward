## SAIFO TRANSPORT ERP — خطة البناء

منصة ERP + TMS + FMS + CRM + KPI لشركات النقل واللوجستيك، متعددة المستأجرين (Multi-Tenant)، بالعربية (RTL) مع دعم الفرنسية/الإنجليزية لاحقاً.

نظراً لحجم المشروع الضخم، سأبنيه على **مراحل متتابعة**. هذه الخطة تغطي **المرحلة 1 (الأساس + الهوية + Multi-Tenant + CRM + الأسطول + السائقون)**. باقي المراحل تُبنى بعد اعتمادها.

---

### المرحلة 1 — الأساس (هذه الجلسة)

**1. الهوية البصرية**
- ألوان: أزرق داكن `#0B2545`، برتقالي `#F97316`، أبيض، رمادي.
- خط عربي احترافي (Cairo / Tajawal)، اتجاه RTL افتراضي.
- شعار نصي SAIFO TRANSPORT + أيقونة شاحنة.
- Landing page احترافية تعرض المنتج للبيع التجاري.

**2. البنية التقنية**
- تفعيل Lovable Cloud (قاعدة بيانات + Auth + Storage).
- Multi-Tenant عبر جدول `tenants` و `tenant_id` في كل جدول + RLS صارمة.
- أدوار: `system_owner`, `company_admin`, `ops_manager`, `fleet_manager`, `maintenance`, `accountant`, `receptionist`, `driver` عبر جدول `user_roles` منفصل + `has_role()` security definer.
- SAIFO TRANSPORT System Owner: دور فريد يُمنح يدوياً فقط عبر SQL (لا يمكن التسجيل به).

**3. هيكل قاعدة البيانات (المرحلة 1)**
- `tenants` (الشركات)، `subscriptions`، `licenses`، `trials`.
- `profiles`، `user_roles`، `tenant_members`.
- `customers` (CRM كامل بالحقول المطلوبة)، `customer_documents`.
- `contracts` (سنوية/شهرية/دائمة/مؤقتة).
- `vehicles` (شاحنات، جرارات، مقطورات، حاويات، خفيفة)، `vehicle_documents`.
- `drivers`، `driver_documents`.
- `audit_log`.

**4. الشاشات (المرحلة 1)**
- Landing عامة + صفحة تسعير.
- تسجيل دخول / إنشاء حساب شركة (Trial تلقائي 14 يوم).
- Dashboard رئيسي مع KPIs أولية.
- CRM: قائمة العملاء + ملف عميل كامل.
- العقود: CRUD.
- الأسطول: قائمة المركبات + ملف مركبة.
- السائقون: قائمة + ملف سائق.
- لوحة System Owner: إدارة الشركات، التراخيص، الاشتراكات، التجارب.
- Read-Only Mode عند انتهاء الترخيص.

---

### المراحل التالية (بعد اعتماد المرحلة 1)

- **المرحلة 2 — TMS**: طلبات النقل، أوامر النقل، الشحنات، الرحلات، دورة العمل الكاملة.
- **المرحلة 3 — FMS**: الوقود، الصيانة (وقائية/تصحيحية + تنبيهات)، الحوادث.
- **المرحلة 4 — المستودعات**: مواقع، استلام، تسليم، جرد، تحويلات.
- **المرحلة 5 — المالية**: فواتير، مدفوعات، مصروفات، ربحية، تقارير.
- **المرحلة 6 — البوابات**: بوابة العميل + واجهة السائق (تتبع، POD، توقيع، مصروفات).
- **المرحلة 7 — KPI متقدم + جاهزية GPS + AI**: لوحات تحليلية، hooks لـ GPS و AI مستقبلاً.
- **المرحلة 8 — الأرشفة**: CMR, Bon de Transport, BL, Factures, Assurances, Cartes Grises, CT.

---

### تفاصيل تقنية

- **Stack**: TanStack Start + React + Tailwind + shadcn + Lovable Cloud (Supabase تحت الغطاء).
- **RLS**: كل استعلام مقيد بـ `tenant_id = current_user_tenant()` + دور المستخدم.
- **System Owner** يتجاوز فلتر `tenant_id` عبر policy خاصة تستخدم `has_role(auth.uid(), 'system_owner')`.
- **Audit Log**: trigger على الجداول الحساسة.
- **Storage**: bucket خاص لكل نوع وثيقة، خاص (private) مع signed URLs.
- **Trial/License**: `subscriptions.status` (trial/active/expired/readonly) يتحقق منه middleware في الواجهة.

---

هل أبدأ بتنفيذ **المرحلة 1** كما هي موضحة؟ أم تريد تعديل نطاقها أولاً (مثلاً دمج TMS في المرحلة 1)؟