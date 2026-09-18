# YAZ Qualcomm OneclickTool - License Server (Vercel)

سيرفر ترخيص احترافي لأداة كوالكوم - كل جهاز = **3 كريدت = 3$** — مبني لـ Vercel Serverless بدون سيرفر خارجي.

**المطور:** YAZ | [Telegram: @YAZsalaq](https://t.me/YAZsalaq) | [Instagram: yaz.salaqq](https://www.instagram.com/yaz.salaqq)

---

## 🚀 النشر على Vercel في 3 دقائق

### 1. ارفع مجلد `server` الى GitHub
```bash
cd server
git init
git add .
git commit -m "YAZ Server v1"
git push origin main
```

### 2. انشر على Vercel
- افتح https://vercel.com/new
- اختر الريبو الخاص بـ `server`
- في **Environment Variables** اضف:
  ```
  ADMIN_KEY = jana@#5Y
  ```
- اضغط **Deploy**

### 3. احصل على رابط السيرفر
بعد النشر ستحصل على رابط مثل:
```
https://your-yaz-server.vercel.app
```

ضع هذا الرابط في ملف `yaz_config.json` داخل كل أداة:
```json
{
  "server_url": "https://your-yaz-server.vercel.app"
}
```

أو سينستخدم الافتراضي ويجب تعديله في `yaz_license.py: DEFAULT_SERVER_URL`

---

## 📋 لوحة التحكم

افتح: `https://your-server.vercel.app/admin.html`

- ادخل `ADMIN_KEY` = `jana@#5Y`
- انشئ سيريالات: كل سيريال = 3 كريدت تلقائياً
- يمكنك انشاء 1 أو 10 أو 100 سيريال دفعة واحدة
- تابع الكريدت، HWID، تاريخ العمليات

---

## 🔌 API

### `POST /api/verify` (مستخدم من الأداة)
```json
{
  "serial": "YAZ-ABCD-1234-EFGH",
  "device_id": "xiaomi-redmi9t-lime",
  "operation": "-reset_frp",
  "hwid": "A1B2C3D4E5F6G7H8"
}
```
**Response success:**
```json
{
  "success": true,
  "message": "تمت العملية بنجاح ✅ - -reset_frp | المتبقي: 2 كريدت",
  "credits": 2
}
```
**كل عملية تخصم 1 كريدت.** `check` و `activate` لا تخصم.

### `GET /api/health`
فحص حالة السيرفر.

### `GET /api/admin/licenses` (Header: X-Admin-Key)
قائمة السيريالات.

### `POST /api/admin/licenses`
```json
{
  "credits": 3,
  "note": "زبون احمد",
  "count": 1
}
```

### `GET /api/admin/stats`
إحصائيات.

---

## 💾 قاعدة البيانات

- **افتراضياً:** ملف `data/db.json` + `/tmp/yaz_db.json` (يعمل مباشرة بدون إعداد)
- **للإنتاج:** يُنصح بربط **Vercel KV (Upstash Redis)** من:
  `Vercel Dashboard -> Storage -> Create KV -> Connect to Project`
  ثم ستُحفظ البيانات تلقائياً في KV بدون فقدان بعد إعادة النشر.

> بدون KV، البيانات في `/tmp` قد تُفقد بعد إعادة النشر، لكن `data/db.json` يبقى كنسخة احتياطية.

---

## 🛠️ الأداة (Tool Integration)

تم تعديل 4 أدوات بدون تغيير أوامر `exec.cmd`:

- `xiaomi-redmi9t-lime` (UFS)
- `xiaomi-redmi5-rosy` (EMMC)
- `xiaomi-redmi7-lavender` (EMMC)
- `vivo-y93-pd1818f` (EMMC)

كل عملية الآن تتحقق أولاً:
```python
if not yaz_license.require_license(self.widget, DEVICE_ID, "-reset_frp"):
    return  # يمنع التنفيذ ويعرض رسالة
```

**الملفات المضافة لكل أداة:**
- `yaz_license.py` - منطق التحقق
- `yaz_config.json` - رابط السيرفر

**المتطلبات في الأداة:**
```
pip install requests PyQt5
```

---

## 🔒 الأمان

- السيريال مشفر `XOR + Base64` محلياً
- HWID مرتبط بالجهاز (اختياري `STRICT_HWID=true`)
- كريدت يُخصم سيرفر-سايد فقط
- حماية لوحة التحكم بـ `ADMIN_KEY`

---

## 📞 الدعم

- Telegram: https://t.me/YAZsalaq
- Instagram: https://www.instagram.com/yaz.salaqq

جميع الحقوق محفوظة لـ **YAZ** 2026
