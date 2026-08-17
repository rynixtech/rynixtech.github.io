import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, ResourceLoader } = pkg;

// Custom resource loader to load local files instead of HTTP
class LocalResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith('http://localhost:8081/')) {
      const filePath = '../' + url.replace('http://localhost:8081/', '');
      if (fs.existsSync(filePath)) {
        return Promise.resolve(Buffer.from(fs.readFileSync(filePath, 'utf8')));
      }
    }
    return super.fetch(url, options);
  }
}

const html = fs.readFileSync('../login.html', 'utf8');

const dom = new JSDOM(html, {
  url: "http://localhost:8081/login.html",
  runScripts: "dangerously",
  resources: new LocalResourceLoader(),
  pretendToBeVisual: true
});

dom.window.console.log = (...args) => console.log('BROWSER LOG:', ...args);
dom.window.console.error = (...args) => console.error('BROWSER ERROR:', ...args);
dom.window.console.warn = (...args) => console.warn('BROWSER WARN:', ...args);
dom.window.addEventListener("error", (event) => {
  console.error("UNCAUGHT ERROR:", event.error);
});
dom.window.addEventListener("unhandledrejection", (event) => {
  console.error("UNHANDLED REJECTION:", event.reason);
});

// Wait for scripts to load
setTimeout(() => {
  console.log("Window loaded. Type of googleLogin:", typeof dom.window.googleLogin);
  if (typeof dom.window.googleLogin === 'function') {
    console.log("Clicking button...");
    dom.window.document.getElementById('googleBtn').click();
  } else {
    console.error("googleLogin is not defined on window!");
  }
}, 3000);
