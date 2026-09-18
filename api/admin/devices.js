// YAZ Admin - Devices
const { loadDB, saveDB } = require('../../lib/db');
const { setCors, handleOptions, isAdmin, jsonResponse } = require('../../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCors(res);
  
  const db = await loadDB();
  
  if (req.method === 'GET') {
    return jsonResponse(res, 200, { success: true, devices: db.devices });
  }
  
  if (!isAdmin(req)) return jsonResponse(res, 401, { success: false, message: 'Unauthorized' });

  // POST - Add or update device
  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') try { body = JSON.parse(body||'{}'); } catch { body={}; }
    const { id, name, credits_cost } = body;
    if (!id) return jsonResponse(res, 400, { success: false, message: 'id required' });
    const existing = db.devices.find(d => d.id === id);
    if (existing) {
      if (name) existing.name = name;
      if (credits_cost) existing.credits_cost = parseInt(credits_cost);
    } else {
      db.devices.push({ id, name: name || id, credits_cost: parseInt(credits_cost) || 3 });
    }
    await saveDB(db);
    return jsonResponse(res, 200, { success: true, devices: db.devices });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const id = (req.query.id || '').toString().trim();
    db.devices = db.devices.filter(d => d.id !== id);
    await saveDB(db);
    return jsonResponse(res, 200, { success: true, devices: db.devices });
  }

  return jsonResponse(res, 405, { success: false, message: 'Method not allowed' });
};
