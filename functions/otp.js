const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(value) {
  if (typeof value !== "string") throw new Error("Email is required.");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 8) throw new Error("Use a password with at least 8 characters.");
}

function createOtp() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function emailKey(email) {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function hashOtp({ secret, flow, email, code }) {
  return crypto.createHmac("sha256", secret).update(`${flow}:${normalizeEmail(email)}:${code}`).digest("hex");
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

module.exports = { OTP_TTL_MS, OTP_COOLDOWN_MS, MAX_ATTEMPTS, normalizeEmail, assertPassword, createOtp, emailKey, hashOtp, safeEqual };
