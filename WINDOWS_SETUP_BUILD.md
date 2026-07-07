# بناء Setup .exe من GitHub

هذا الإعداد يبني **مثبّت Windows (.exe)** تلقائياً على GitHub Actions.
غلاف Electron خفيف يفتح تطبيق SAIFO المنشور داخل نافذة سطح مكتب.

## البنية

```
electron/
  main.cjs        ← عملية Electron الرئيسية
  package.json    ← تبعيات + إعداد electron-builder (NSIS)
.github/workflows/
  build-windows-setup.yml
```

## طريقة التشغيل

### 1) اربط المشروع بـ GitHub
من Lovable: **GitHub → Connect** ثم Push.

### 2) شغّل البناء
ثلاث طرق:

**أ) تلقائياً مع أي رفع للكود — الطريقة المعتمدة إذا لم يظهر زر Run workflow:**
بمجرد أن يتزامن المشروع مع GitHub أو يتم عمل Push لأي فرع، سيبدأ بناء المثبّت تلقائياً بدون الحاجة إلى زر **Run workflow**.

بعد انتهاء البناء ستجد آخر نسخة دائماً في:
**GitHub → Releases → SAIFO Windows Setup - Latest → Assets → ملف Setup.exe**

**ب) بإصدار tag (يُنشئ Release مع المثبّت):**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**ج) يدوياً:** من GitHub → **Actions → Build Windows Setup → Run workflow** إذا كان الزر ظاهراً في حسابك.

### 3) نزّل الملف
- الأفضل: من صفحة **Releases** → **SAIFO Windows Setup - Latest** → قسم **Assets**.
- أو من صفحة **Actions** → آخر تشغيل → قسم **Artifacts** → `SAIFO-TRANSPORT-ERP-Windows-Setup`.
- أو من صفحة **Releases** الخاصة بالـ tag إذا استخدمت إصداراً مثل `v1.0.0`.

إذا لم يظهر تبويب **Actions** في GitHub، فهذا لا يمنع التحميل: استخدم صفحة **Releases** لأن الملف يُنشر هناك تلقائياً بعد كل Push.

الملف الناتج:
```
SAIFO-TRANSPORT-ERP-Setup-1.0.1.exe
```

## تخصيص عنوان التطبيق

عدّل `APP_URL` في `electron/main.cjs` (افتراضياً يشير إلى الرابط المنشور
`https://glide-swiftly-forward.lovable.app`)، أو مرّر متغير بيئة
`SAIFO_APP_URL` عند التشغيل.

## ملاحظات

- المثبّت من نوع **NSIS** — يسمح للمستخدم باختيار مجلد التثبيت، وينشئ اختصارات
  على سطح المكتب وقائمة Start.
- لا يحتاج توقيع كود (Code Signing) للعمل، لكن Windows SmartScreen قد يظهر
  تحذيراً عند التشغيل الأول. للتخلص منه اشترِ شهادة Code Signing وأضفها
  كأسرار (`CSC_LINK`, `CSC_KEY_PASSWORD`) في GitHub Secrets.
- يتطلب اتصال إنترنت (يحمّل التطبيق من Lovable).
