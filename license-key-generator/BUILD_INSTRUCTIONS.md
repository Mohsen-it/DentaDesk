# 🏗️ تعليمات بناء التطبيق

## المشكلة الحالية

عند محاولة بناء التطبيق، قد تواجه خطأ يتعلق بالصلاحيات:
```
ERROR: Cannot create symbolic link : A required privilege is not held by the client
```

## الحلول المتاحة

### ✅ الحل 1: التشغيل كمسؤول (موصى به)

1. **انقر بزر الماوس الأيمن** على ملف `build-as-admin.bat`
2. اختر **"تشغيل كمسؤول" (Run as Administrator)**
3. وافق على طلب صلاحيات المسؤول (UAC)
4. انتظر حتى يكتمل البناء

سيتم إنشاء التطبيق في مجلد `dist/`

---

### ✅ الحل 2: بناء مجلد بسيط (بدون installer)

إذا كنت تريد فقط ملفات التطبيق بدون installer:

```bash
cd license-key-generator
npm run build -- --dir
```

سيتم إنشاء مجلد `dist/win-unpacked/` يحتوي على جميع ملفات التطبيق.
يمكنك نسخ هذا المجلد واستخدامه مباشرة.

---

### ✅ الحل 3: تفعيل Developer Mode في Windows

1. افتح **Settings** → **Update & Security** → **For Developers**
2. فعّل **Developer Mode**
3. أعد تشغيل الكمبيوتر
4. حاول البناء مرة أخرى:
   ```bash
   cd license-key-generator
   npm run dist:win
   ```

---

### ✅ الحل 4: بناء ZIP بدلاً من installer

قم بتعديل `package.json`:

```json
"win": {
  "target": "zip",
  "icon": "../assets/icon.ico"
}
```

ثم:
```bash
cd license-key-generator
npm run dist:win
```

---

## 📦 ما الذي يتم بناؤه؟

عند نجاح البناء، ستحصل على:

### مع NSIS installer:
```
dist/
  ├── DentaDesk License Generator Setup 1.0.0.exe  (installer)
  └── win-unpacked/                                 (ملفات التطبيق)
```

### مع Portable:
```
dist/
  ├── DentaDesk License Generator 1.0.0.exe        (تطبيق portable)
  └── win-unpacked/                                 (ملفات التطبيق)
```

### مع ZIP:
```
dist/
  ├── DentaDesk License Generator-1.0.0-win.zip    (ملف مضغوط)
  └── win-unpacked/                                 (ملفات التطبيق)
```

---

## 🚀 الاستخدام بعد البناء

### إذا كان لديك Installer (.exe):
1. انقر مرتين على ملف `Setup.exe`
2. اتبع خطوات التثبيت
3. شغّل التطبيق من قائمة Start أو Desktop

### إذا كان لديك Portable (.exe):
1. انقل الملف إلى أي مكان
2. انقر مرتين لتشغيل التطبيق مباشرة
3. لا يحتاج تثبيت

### إذا كان لديك ZIP:
1. فك الضغط
2. شغّل ملف `DentaDesk License Generator.exe`

### إذا كان لديك مجلد win-unpacked:
1. افتح المجلد
2. شغّل ملف `DentaDesk License Generator.exe`

---

## 🛠️ نصائح إضافية

### لبناء أسرع:
- استخدم `--dir` لتجنب إنشاء installer
- استخدم `zip` target لملف مضغوط بسيط

### لبناء أصغر حجماً:
- أضف `asar: true` في إعدادات البناء
- احذف `node_modules` غير المستخدمة

### للتوزيع:
- استخدم NSIS installer للتوزيع الاحترافي
- استخدم Portable للاستخدام السريع
- استخدم ZIP للنسخ عبر الشبكة

---

## ❓ الأسئلة الشائعة

**س: لماذا يطلب صلاحيات المسؤول؟**
ج: electron-builder يحتاج إنشاء Symbolic links أثناء البناء

**س: هل يمكن البناء بدون صلاحيات إدارية؟**
ج: نعم، استخدم `--dir` أو فعّل Developer Mode

**س: كم يستغرق البناء؟**
ج: عادة 3-5 دقائق في المرة الأولى، ثم 1-2 دقيقة

**س: ما حجم التطبيق النهائي؟**
ج: حوالي 80-120 MB (يشمل Electron runtime)

---

© 2025 DentaDesk

