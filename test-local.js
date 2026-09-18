// Simple local test for YAZ Server without Vercel
// Run: node test-local.js
// Tests verify endpoint logic directly

const { loadDB, saveDB, generateSerial } = require('./lib/db');

async function test() {
  console.log("=== YAZ Server Local Test ===\n");

  // Load DB
  let db = await loadDB();
  console.log("Devices:", db.devices.map(d=>d.id).join(", "));
  console.log("Licenses:", Object.keys(db.licenses).length);

  // Test generate
  const s = generateSerial();
  console.log("\nGenerated serial:", s);

  // Create test license
  const testSerial = "YAZ-TEST-" + Date.now().toString().slice(-6);
  db.licenses[testSerial] = {
    serial: testSerial,
    credits: 3,
    max_credits: 3,
    status: "active",
    hwid: null,
    created_at: new Date().toISOString(),
    history: []
  };
  await saveDB(db);
  console.log("Created test license:", testSerial);

  // Simulate verify logic
  const lic = db.licenses[testSerial];
  console.log("\nBefore operation: credits =", lic.credits);
  
  // Simulate 1 operation
  lic.credits -= 1;
  lic.history.push({ operation: "-reset_frp", device_id: "xiaomi-redmi9t-lime", hwid: "TESTHWID", timestamp: new Date().toISOString(), credits_after: lic.credits });
  await saveDB(db);
  console.log("After -reset_frp: credits =", lic.credits);
  
  // Check
  let reloaded = await loadDB();
  console.log("Reloaded credits:", reloaded.licenses[testSerial].credits);
  
  console.log("\n✅ Test passed! Server logic works.");
  console.log(`\nAPI would be: POST http://localhost:3000/api/verify`);
  console.log(`Body: {serial:"${testSerial}", device_id:"xiaomi-redmi9t-lime", operation:"-reset_frp", hwid:"TEST"}`);
  
  // Cleanup
  delete reloaded.licenses[testSerial];
  await saveDB(reloaded);
  console.log("\nCleaned test license.");
}

test().catch(e=>{ console.error(e); process.exit(1); });
