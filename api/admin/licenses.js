// YAZ Admin - Licenses CRUD
// GET /api/admin/licenses -> list
// POST /api/admin/licenses -> create
// DELETE /api/admin/licenses?serial=XXX -> delete
// PATCH /api/admin/licenses -> update (add credits, block)

const { loadDB, saveDB, generateSerial } = require('../../lib/db');
const { setCors, handleOptions, isAdmin, jsonResponse } = require('../../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (!isAdmin(req)) {
    return jsonResponse(res, 401, { success: false, message: 'Unauthorized - Admin Key required (header X-Admin-Key)' });
  }

  const db = await loadDB();

  // GET - List all
  if (req.method === 'GET') {
    const licenses = Object.values(db.licenses);
    // Sort by created_at desc
    licenses.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return jsonResponse(res, 200, {
      success: true,
      count: licenses.length,
      licenses,
      stats: db.stats,
      devices: db.devices
    });
  }

  // POST - Create new license
  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    let serial = (body.serial || '').toString().trim().toUpperCase();
    const credits = parseInt(body.credits) || 3;
    const max_credits = parseInt(body.max_credits) || credits;
    const device_id = (body.device_id || body.device || '').toString().trim() || null;
    const note = (body.note || body.customer || '').toString().trim();
    const expires_at = body.expires_at || null;
    const count = parseInt(body.count) || 1; // bulk create

    // Bulk create
    if (count > 1) {
      const created = [];
      for (let i=0; i<Math.min(count, 100); i++) {
        const s = generateSerial();
        const lic = {
          serial: s,
          credits: max_credits,
          max_credits,
          device_id,
          note: note ? `${note} #${i+1}` : '',
          status: 'active',
          hwid: null,
          created_at: new Date().toISOString(),
          expires_at,
          history: []
        };
        db.licenses[s] = lic;
        created.push(lic);
      }
      db.stats.total_licenses = Object.keys(db.licenses).length;
      await saveDB(db);
      return jsonResponse(res, 200, { success: true, message: `تم انشاء ${created.length} سيريال`, licenses: created });
    }

    if (!serial) serial = generateSerial();
    if (db.licenses[serial]) {
      return jsonResponse(res, 400, { success: false, message: 'السيريال موجود مسبقاً' });
    }

    const lic = {
      serial,
      credits,
      max_credits,
      device_id,
      note,
      status: 'active',
      hwid: null,
      created_at: new Date().toISOString(),
      expires_at,
      history: []
    };
    db.licenses[serial] = lic;
    db.stats.total_licenses = Object.keys(db.licenses).length;
    await saveDB(db);

    return jsonResponse(res, 200, { success: true, message: 'تم انشاء السيريال ✅', license: lic, price: `${credits} كريدت = ${credits}$` });
  }

  // DELETE - Remove license
  if (req.method === 'DELETE') {
    const serial = (req.query.serial || req.query.id || '').toString().trim().toUpperCase();
    if (!serial) return jsonResponse(res, 400, { success: false, message: 'serial required' });
    if (!db.licenses[serial]) return jsonResponse(res, 404, { success: false, message: 'السيريال غير موجود' });
    delete db.licenses[serial];
    db.stats.total_licenses = Object.keys(db.licenses).length;
    await saveDB(db);
    return jsonResponse(res, 200, { success: true, message: 'تم حذف السيريال' });
  }

  // PATCH / PUT - Update license (add credits, block/unblock)
  if (req.method === 'PATCH' || req.method === 'PUT') {
    let body = req.body;
    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    const serial = (body.serial || req.query.serial || '').toString().trim().toUpperCase();
    if (!serial) return jsonResponse(res, 400, { success: false, message: 'serial required' });
    const lic = db.licenses[serial];
    if (!lic) return jsonResponse(res, 404, { success: false, message: 'السيريال غير موجود' });

    if (body.credits !== undefined) lic.credits = parseInt(body.credits);
    if (body.max_credits !== undefined) lic.max_credits = parseInt(body.max_credits);
    if (body.status) lic.status = body.status; // active, blocked, expired
    if (body.note !== undefined) lic.note = body.note;
    if (body.device_id !== undefined) lic.device_id = body.device_id;
    if (body.expires_at !== undefined) lic.expires_at = body.expires_at;
    if (body.add_credits) lic.credits += parseInt(body.add_credits);
    if (lic.credits > lic.max_credits && body.add_credits) lic.max_credits = lic.credits;

    lic.updated_at = new Date().toISOString();
    await saveDB(db);
    return jsonResponse(res, 200, { success: true, message: 'تم تحديث السيريال', license: lic });
  }

  return jsonResponse(res, 405, { success: false, message: 'Method not allowed' });
};
