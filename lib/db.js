// YAZ License Server - Database Layer
// Supports: Vercel KV (Redis), Vercel Postgres, or File JSON fallback
// Developer: YAZ | t.me/YAZsalaq | yaz.salaqq

const fs = require('fs');
const path = require('path');

// File fallback paths - works locally and on Vercel (/tmp)
const DB_PATHS = [
  path.join('/tmp', 'yaz_db.json'),
  path.join(__dirname, '../data/db.json'),
  path.join(__dirname, '../../data/db.json'),
];

// Default DB structure
const DEFAULT_DB = {
  licenses: {
    // Example: "YAZ-TEST-1234": { serial: "YAZ-TEST-1234", credits: 3, max_credits: 3, hwid: null, device_id: null, created_at: "...", note: "", status: "active", history: [] }
  },
  devices: [
    { id: "vivo-y93-pd1818f", name: "VIVO Y93 PD1818F", credits_cost: 3 },
    { id: "xiaomi-redmi9t-lime", name: "XIAOMI REDMI 9T (LIME)", credits_cost: 3 },
    { id: "xiaomi-redmi5-rosy", name: "XIAOMI REDMI 5 (ROSY)", credits_cost: 3 },
    { id: "xiaomi-redmi7-lavender", name: "XIAOMI REDMI NOTE 7 (LAVENDER)", credits_cost: 3 }
  ],
  stats: {
    total_licenses: 0,
    total_operations: 0,
    total_credits_used: 0
  }
};

function getDbPath() {
  // Try to find existing db
  for (const p of DB_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // Default to /tmp for Vercel write
  return DB_PATHS[0];
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}

async function loadDB() {
  // Try Vercel KV first if env exists
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/yaz_db`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      const data = await res.json();
      if (data.result) {
        return JSON.parse(data.result);
      }
    } catch (e) {
      console.log("KV load failed, fallback to file:", e.message);
    }
  }

  // File fallback
  const dbPath = getDbPath();
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.log("File load failed:", e.message);
  }

  // Try alternative paths
  for (const p of DB_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}
  }

  // Return default and save it
  await saveDB(DEFAULT_DB);
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

async function saveDB(db) {
  // Try Vercel KV first
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await fetch(`${process.env.KV_REST_API_URL}/set/yaz_db`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(db) })
      });
      return true;
    } catch (e) {
      console.log("KV save failed:", e.message);
    }
  }

  // File fallback - try all paths, succeed on first writable
  for (const dbPath of DB_PATHS) {
    try {
      ensureDir(dbPath);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
      // Also try to sync to other paths
      return true;
    } catch (e) {
      continue;
    }
  }
  return false;
}

function generateSerial() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (len) => Array.from({length: len}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `YAZ-${rand(4)}-${rand(4)}-${rand(4)}`;
}

module.exports = { loadDB, saveDB, generateSerial, DEFAULT_DB, getDbPath };
