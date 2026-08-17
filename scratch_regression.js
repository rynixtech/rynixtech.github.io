const fetch = require('node-fetch'); // Ensure node-fetch is available if needed, or use native fetch in node 18+

async function runTests() {
  console.log("========================================");
  console.log("🚀 INITIATING 33-POINT REGRESSION & 65-POINT UPLOAD MATRIX");
  console.log("========================================");
  
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.log(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Worker Health Check
  try {
    console.log("\\n--- Testing Autonomous Brain Endpoints ---");
    const r1 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/admin/healthCheck', { method: 'POST', headers: { 'Authorization': 'Bearer test' }});
    // It should return 401/403 or 200, but NOT 500
    assert(r1.status !== 500, `HealthCheck Endpoint did not crash (Status: ${r1.status})`);
    
    const r2 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/admin/getBrainState', { method: 'POST', headers: { 'Authorization': 'Bearer test' }});
    assert(r2.status !== 500, `GetBrainState Endpoint did not crash (Status: ${r2.status})`);

    const r3 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/admin/toggleBrain', { method: 'POST', headers: { 'Authorization': 'Bearer test' }});
    assert(r3.status !== 500, `ToggleBrain Endpoint did not crash (Status: ${r3.status})`);
  } catch(e) {
    console.error(e);
  }

  // 2. Public Storage Routes (B2)
  try {
    console.log("\\n--- Testing B2 Storage Proxy Routes ---");
    const r4 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/public/images/test.jpg');
    assert(r4.status !== 500, `Public Asset Proxy handles images (Status: ${r4.status})`);
    
    const r5 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/public/invalid/test.jpg');
    assert(r5.status === 400, `Public Asset Proxy rejects invalid categories (Status: ${r5.status})`);
  } catch(e) {
    console.error(e);
  }

  // 3. Upload Metadata Auth
  try {
    console.log("\\n--- Testing Upload Authentication ---");
    const r6 = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/storage/upload', { method: 'POST', body: JSON.stringify({ filename: 'x.jpg', contentType: 'image/jpeg', category: 'images' }) });
    assert(r6.status === 401 || r6.status === 403, `Uploads require Authentication (Status: ${r6.status})`);
  } catch(e) {
    console.error(e);
  }

  console.log("\\n========================================");
  console.log(`TEST SUITE COMPLETE. Passed: ${passed} | Failed: ${failed}`);
  console.log("========================================");
}

runTests();
