// YAZ License Server - Verify Endpoint (Core)
// POST /api/verify
// Body: { serial, device_id, operation, hwid }
// Operation: -reset_frp, -reset_factory, -unlock_bl, etc. | check | activate
// Each operation costs 1 credit, device activation = 3 credits total
// Developer: YAZ | t.me/YAZsalaq | yaz.salaqq

const { loadDB, saveDB } = require('../lib/db');
const { setCors, handleOptions, jsonResponse } = require('../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { success: false, message: 'Method not allowed, use POST' });
  }

  try {
    let body = req.body;
    // Vercel may not parse body automatically if not using built-in parser
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    // Also handle raw
    if (!body || Object.keys(body).length === 0) {
      let raw = '';
      // Try to read stream if needed (fallback)
      body = req.body || {};
    }

    const serial = (body.serial || '').toString().trim().toUpperCase();
    const device_id = (body.device_id || body.device || 'unknown').toString().trim();
    const operation = (body.operation || body.op || 'check').toString().trim();
    const hwid = (body.hwid || '').toString().trim().toUpperCase();

    if (!serial) {
      return jsonResponse(res, 400, { success: false, message: 'السيريال مطلوب' });
    }

    const db = await loadDB();

    // Find license
    const lic = db.licenses[serial];
    if (!lic) {
      return jsonResponse(res, 404, { 
        success: false, 
        message: '⚠️ يرجى تسجيل السيريال - السيريال غير موجود ❌\nسعر الخدمة: 3 دولار (3 كريدت)\nتواصل: https://t.me/YAZsalaq', 
        credits: 0,
        price: '3$ = 3 كريدت',
        contact: 'https://t.me/YAZsalaq',
        telegram_icon: 'https://t.me/YAZsalaq'
      });
    }

    if (lic.status === 'blocked' || lic.status === 'disabled') {
      return jsonResponse(res, 403, { success: false, message: 'السيريال محظور ❌\nتواصل: https://t.me/YAZsalaq', credits: lic.credits, contact: 'https://t.me/YAZsalaq' });
    }

    if (lic.status === 'expired') {
      return jsonResponse(res, 403, { success: false, message: 'السيريال منتهي ❌\nسعر الخدمة: 3$ - https://t.me/YAZsalaq', credits: 0, contact: 'https://t.me/YAZsalaq' });
    }

    // Check expiration by date if exists
    if (lic.expires_at) {
      const exp = new Date(lic.expires_at);
      if (new Date() > exp) {
        lic.status = 'expired';
        await saveDB(db);
        return jsonResponse(res, 403, { success: false, message: 'السيريال منتهي الصلاحية ❌', credits: 0 });
      }
    }

    // Handle check / activate (no credit deduction)
    const isCheck = operation === 'check' || operation === 'activate' || operation === 'info';
    if (isCheck) {
      // Bind HWID on first activate if not bound
      if (operation === 'activate' && hwid) {
        if (!lic.hwid) {
          lic.hwid = hwid;
          lic.activated_at = new Date().toISOString();
          lic.activated_device = device_id;
          await saveDB(db);
        } else if (lic.hwid !== hwid) {
          // Optional: lock to first HWID. Allow but warn. For strict, uncomment next lines
          // return jsonResponse(res, 403, { success: false, message: 'السيريال مرتبط بجهاز آخر ❌ HWID mismatch', credits: lic.credits, hwid: lic.hwid });
        }
      }
      return jsonResponse(res, 200, {
        success: true,
        message: 'السيريال صالح ✅',
        serial: lic.serial,
        credits: lic.credits,
        max_credits: lic.max_credits,
        device_id: lic.device_id || device_id,
        hwid: lic.hwid,
        status: lic.status,
        expires_at: lic.expires_at || null
      });
    }

    // For actual operations, check credits
    if (lic.credits <= 0) {
      return jsonResponse(res, 402, { 
        success: false, 
        message: '⚠️ انتهى الكريدت ❌ الرصيد 0\nيرجى تسجيل سيريال جديد - سعر الخدمة: 3 دولار\nتواصل: https://t.me/YAZsalaq', 
        credits: 0, 
        price: '3$ = 3 كريدت', 
        contact: 'https://t.me/YAZsalaq',
        telegram_icon: 'https://t.me/YAZsalaq'
      });
    }

    // Optional HWID check - if strict, enforce binding
    // If lic has hwid and different, block
    // For now, allow any HWID but log it. To enable strict HWID lock, set env STRICT_HWID=true
    if (process.env.STRICT_HWID === 'true' && lic.hwid && hwid && lic.hwid !== hwid) {
      return jsonResponse(res, 403, { success: false, message: `السيريال مرتبط بجهاز آخر ❌\nHWID المسجل: ${lic.hwid}\nHWID الحالي: ${hwid}`, credits: lic.credits });
    }

    // Deduct 1 credit per operation
    lic.credits -= 1;
    if (lic.credits < 0) lic.credits = 0;

    // Log history
    if (!lic.history) lic.history = [];
    lic.history.push({
      operation,
      device_id,
      hwid: hwid || 'unknown',
      timestamp: new Date().toISOString(),
      credits_after: lic.credits
    });
    // Keep only last 50
    if (lic.history.length > 50) lic.history = lic.history.slice(-50);

    // Update stats
    db.stats.total_operations = (db.stats.total_operations || 0) + 1;
    db.stats.total_credits_used = (db.stats.total_credits_used || 0) + 1;
    lic.last_used = new Date().toISOString();
    lic.last_operation = operation;
    lic.last_device = device_id;
    if (!lic.first_hwid && hwid) lic.first_hwid = hwid;
    // Bind HWID if not bound
    if (!lic.hwid && hwid) lic.hwid = hwid;

    await saveDB(db);

    return jsonResponse(res, 200, {
      success: true,
      message: `تمت العملية بنجاح ✅ - ${operation} | المتبقي: ${lic.credits} كريدت`,
      serial: lic.serial,
      credits: lic.credits,
      max_credits: lic.max_credits,
      operation,
      device_id,
      hwid: lic.hwid
    });

  } catch (err) {
    console.error('verify error:', err);
    return jsonResponse(res, 500, { success: false, message: 'خطأ في السيرفر: ' + err.message });
  }
};
