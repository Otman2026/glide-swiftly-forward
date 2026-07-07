# SAIFO TRANSPORT ERP — دليل النشر في متاجر التطبيقات

هذا الدليل يشرح كيف تحوّل التطبيق إلى APK/AAB (Google Play) و IPA (App Store) باستخدام Capacitor.

---

## المتطلبات

- **Android:** جهاز يعمل بنظام Windows/Mac/Linux + [Android Studio](https://developer.android.com/studio)
- **iOS:** جهاز **macOS** + [Xcode](https://apps.apple.com/us/app/xcode/id497799835) + حساب Apple Developer ($99/سنة)
- **Google Play Console:** حساب مطور Google Play ($25 لمرة واحدة)

---

## الخطوة 1 — تصدير المشروع لـ GitHub

من داخل Lovable: اضغط زر **GitHub → Connect to GitHub → Export**، ثم انسخ الريبو على جهازك:

```bash
git clone <your-repo-url>
cd <project>
npm install
```

---

## الخطوة 2 — إضافة منصات Android و iOS

```bash
npx cap add android
npx cap add ios      # macOS فقط
```

هذا ينشئ مجلدين: `android/` و `ios/`.

---

## الخطوة 3 — بناء الويب ومزامنة Capacitor

### أ) للاختبار السريع (Hot-reload من URL)
الإعداد الحالي في `capacitor.config.ts` يحمّل التطبيق مباشرة من رابط Lovable المنشور. مفيد للتطوير.

```bash
npx cap sync
npx cap run android   # يفتح على محاكي أو جهاز موصول
npx cap run ios       # macOS فقط
```

### ب) للبناء النهائي المُقدَّم للمتاجر (مطلوب)

1. **افتح `capacitor.config.ts`** وعلّق كتلة `server` بالكامل:

```ts
// server: {
//   url: '...',
//   cleartext: true,
// },
```

2. ابنِ الويب محلياً وزامن:

```bash
npm run build
npx cap sync
```

هذا ينسخ `dist/` إلى داخل تطبيقات Android و iOS، بحيث يعمل التطبيق **دون إنترنت للأصول** ويتصل فقط بقاعدة البيانات.

---

## الخطوة 4 — بناء Android AAB لـ Google Play

```bash
npx cap open android
```

في Android Studio:
1. `Build → Generate Signed Bundle / APK → Android App Bundle`
2. أنشئ Keystore جديد (احفظه في مكان آمن — ستحتاجه لكل تحديث مستقبلي!)
3. اختر `release` → Finish
4. الملف الناتج: `android/app/release/app-release.aab`

ارفعه في [Google Play Console](https://play.google.com/console).

---

## الخطوة 5 — بناء iOS IPA لـ App Store

```bash
npx cap open ios
```

في Xcode:
1. اختر الجهاز → **Any iOS Device (arm64)**
2. `Product → Archive`
3. في نافذة Organizer: **Distribute App → App Store Connect**
4. ارفع للمراجعة عبر [App Store Connect](https://appstoreconnect.apple.com).

---

## الخطوة 6 — متطلبات المتاجر (تحقق قبل الإرسال)

### Google Play
- [x] أيقونة تطبيق 512×512 (موجودة: `public/icon-512.png`)
- [x] Feature graphic 1024×500 (اصنعها من نفس الشعار)
- [ ] 2-8 لقطات شاشة (هاتف + تابلت)
- [x] سياسة الخصوصية بـ URL عام: `https://<your-domain>/privacy`
- [ ] وصف قصير (80 حرف) + وصف طويل (4000 حرف)
- [ ] تصنيف المحتوى (استبيان في Play Console)
- [ ] Data Safety form (يذكر Supabase و Stripe)

### Apple App Store
- [x] أيقونة 1024×1024
- [ ] لقطات لكل حجم جهاز (iPhone 6.7" / 6.5" / 5.5" / iPad 12.9" / 11")
- [x] سياسة الخصوصية URL
- [ ] Support URL و Marketing URL
- [ ] App Privacy Details (بيانات المستخدم المجمّعة)
- [ ] وصف + كلمات مفتاحية + Promotional Text

---

## نصائح مهمة

1. **رقم الإصدار:** حدّث `versionCode` (Android) و `CFBundleVersion` (iOS) في كل نسخة جديدة.
2. **الأمان:** **لا تحفظ Keystore في Git**. أضف `android/app/release-keystore.jks` إلى `.gitignore`.
3. **Deep Links:** إذا كنت تستخدم OAuth، أضف Custom URL Scheme في `Info.plist` (iOS) و `AndroidManifest.xml` (Android).
4. **PWA Fallback:** المستخدمون بدون التطبيق المُثبَّت يبقون قادرين على استخدام الويب مباشرة.

---

## البديل الأسرع (Google Play فقط)

استخدم [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) لتحويل PWA مباشرة إلى TWA (Trusted Web Activity) بدون Capacitor:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://<your-domain>/manifest.webmanifest
bubblewrap build
```

Apple App Store لا يقبل TWA — لذلك Capacitor إلزامي للـ iOS.
