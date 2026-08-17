const http = require('http');
const fs = require('fs');
const path = require('path');

async function fetchUrl(urlPath) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:8081${urlPath}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

const tests = {
    pages: ['/', '/index.html', '/shopping.html', '/books.html', '/apps.html', '/os-store.html', '/signup.html', '/login.html', '/dashboard.html', '/admin/', '/admin/index.html'],
    adminModules: ['/admin/modules/dashboard.js', '/admin/modules/activity.js', '/admin/modules/errors.js', '/admin/modules/health.js', '/admin/modules/settings.js', '/admin/modules/users.js', '/admin/modules/products.js', '/admin/modules/apps.js']
};

async function runTests() {
    console.log("=== STARTING REGRESSION TEST ===");
    let allPassed = true;
    const results = {};

    for (const page of tests.pages) {
        try {
            const res = await fetchUrl(page);
            results[page] = res.status;
            if (res.status === 200) {
                console.log(`[PASS] ${page}`);
                
                // Extract scripts and links to check for 404s
                const matches = [...res.data.matchAll(/<script[^>]+src=["']([^"']+)["']/g)];
                for (const match of matches) {
                    let asset = match[1];
                    if (asset.startsWith('http')) continue;
                    if (!asset.startsWith('/')) {
                        // resolve relative
                        const dir = path.posix.dirname(page);
                        asset = path.posix.join(dir, asset);
                    }
                    const assetRes = await fetchUrl(asset);
                    if (assetRes.status !== 200) {
                        console.log(`[FAIL] ${page} -> script ${asset} returned ${assetRes.status}`);
                        allPassed = false;
                    }
                }
            } else {
                console.log(`[FAIL] ${page} returned ${res.status}`);
                allPassed = false;
            }
        } catch (e) {
            console.log(`[ERROR] ${page} - ${e.message}`);
            allPassed = false;
        }
    }
    
    for (const mod of tests.adminModules) {
        try {
            const res = await fetchUrl(mod);
            if (res.status === 200) {
                console.log(`[PASS] Module ${mod}`);
            } else {
                console.log(`[FAIL] Module ${mod} returned ${res.status}`);
                allPassed = false;
            }
        } catch(e) {
            console.log(`[ERROR] Module ${mod} - ${e.message}`);
            allPassed = false;
        }
    }
    
    // Read index.html for hamburger menu
    const indexHtml = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
    const requiredLinks = ['Home', 'Shopping', 'Book Store', 'App Store', 'OS Store', 'Orders', 'Account', 'Settings', 'Contact / Support'];
    let menuPassed = true;
    for (const link of requiredLinks) {
        if (!indexHtml.includes(`>${link}<`)) {
            console.log(`[FAIL] Hamburger menu missing link for: ${link}`);
            menuPassed = false;
            allPassed = false;
        }
    }
    if (menuPassed) console.log(`[PASS] Hamburger menu contains all required links`);

    console.log(`\n=== REGRESSION TEST ${allPassed ? 'PASSED' : 'FAILED'} ===`);
}

runTests();
