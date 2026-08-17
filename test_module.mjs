import { ensureUserProfile } from './auth.js';

console.log("Is googleLogin defined?", typeof global.window?.googleLogin);
console.log("Is ensureUserProfile defined?", typeof ensureUserProfile);
