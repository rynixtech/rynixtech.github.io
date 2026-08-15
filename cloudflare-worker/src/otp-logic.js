export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export function normalizeEmail(value) {
  if (typeof value !== "string") throw new Error("Email is required.");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function assertPassword(password) {
  if (typeof password !== "string" || password.length < 8) throw new Error("Use a password with at least 8 characters.");
}

export function createOtp() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = array[0] % 1000000;
  return otp.toString().padStart(6, "0");
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function emailKey(email) {
  return await sha256(normalizeEmail(email));
}

export async function hashOtp({ secret, flow, email, code }) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`${flow}:${normalizeEmail(email)}:${code}`)
  );
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  // Timing safe equal using crypto.subtle isn't directly exposed for strings,
  // but for a password hash comparison on the edge, a regular comparison is usually okay,
  // or we can just compare char by char.
  let mismatch = 0;
  for (let i = 0; i < left.length; ++i) {
    mismatch |= (left.charCodeAt(i) ^ right.charCodeAt(i));
  }
  return mismatch === 0;
}
