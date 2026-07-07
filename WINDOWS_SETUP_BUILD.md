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
طريقتان:

**أ) بإصدار tag (يُنشئ Release مع المثبّت):**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**ب) يدوياً:** من GitHub → **Actions → Build Windows Setup → Run workflow**.

### 3) نزّل الملف
- من صفحة **Actions** → آخر تشغيل → قسم **Artifacts** → `SAIFO-TRANSPORT-ERP-Windows-Setup`.
- أو من صفحة **Releases** إذا استخدمت tag.

الملف الناتج:
```
SAIFO-TRANSPORT-ERP-Setup-1.0.0.exe
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
