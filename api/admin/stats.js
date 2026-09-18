// YAZ Admin - Stats
const { loadDB } = require('../../lib/db');
const { setCors, handleOptions, isAdmin, jsonResponse } = require('../../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCors(res);
  if (!isAdmin(req)) return jsonResponse(res, 401, { success: false, message: 'Unauthorized' });

  const db = await loadDB();
  const licenses = Object.values(db.licenses);
  const active = licenses.filter(l => l.status === 'active').length;
  const blocked = licenses.filter(l => l.status === 'blocked').length;
  const expired = licenses.filter(l => l.status === 'expired').length;
  const lowCredits = licenses.filter(l => l.credits <= 1 && l.credits > 0).length;
  const empty = licenses.filter(l => l.credits === 0).length;
  const totalCredits = licenses.reduce((s,l)=> s + (l.credits||0), 0);
  const totalMax = licenses.reduce((s,l)=> s + (l.max_credits||0), 0);
  const used = totalMax - totalCredits;

  // Recent operations
  const recentOps = [];
  licenses.forEach(l => {
    if (l.history) l.history.slice(-5).forEach(h => recentOps.push({ serial: l.serial, ...h }));
  });
  recentOps.sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
  
  jsonResponse(res, 200, {
    success: true,
    stats: {
      total_licenses: licenses.length,
      active, blocked, expired, lowCredits, empty,
      totalCredits, totalMax, used,
      total_operations: db.stats.total_operations || 0,
      total_credits_used: db.stats.total_credits_used || 0
    },
    devices: db.devices,
    recent_operations: recentOps.slice(0, 20)
  });
};
