const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('BROWSER_ERROR:', error.message));
    page.on('requestfailed', request => console.error('NETWORK_ERROR:', request.url(), request.failure().errorText));

    console.log('Navigating to login.html...');
    await page.goto('http://localhost:8081/login.html', { waitUntil: 'networkidle2' });

    console.log('Clicking Google Login button...');
    await page.click('#googleBtn');

    // Wait a bit to see if anything happens
    await new Promise(r => setTimeout(r, 3000));

    console.log('Closing browser...');
    await browser.close();
})();
