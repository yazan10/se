// YAZ Utils
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(200).end();
    return true;
  }
  return false;
}

function getAdminKey(req) {
  return req.headers['x-admin-key'] || req.headers['X-Admin-Key'] || req.query.admin_key || req.query.key || (req.body && req.body.admin_key);
}

function isAdmin(req) {
  const key = getAdminKey(req);
  const envKey = process.env.ADMIN_KEY || 'jana@#5Y';
  return key === envKey;
}

function jsonResponse(res, status, data) {
  setCors(res);
  res.status(status).json(data);
}

module.exports = { setCors, handleOptions, getAdminKey, isAdmin, jsonResponse };
