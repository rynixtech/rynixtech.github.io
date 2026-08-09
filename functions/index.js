const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { OTP_TTL_MS, OTP_COOLDOWN_MS, MAX_ATTEMPTS, normalizeEmail, assertPassword, createOtp, emailKey, hashOtp, safeEqual } = require("./otp");

admin.initializeApp();
const db = admin.firestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const OTP_HASH_SECRET = defineSecret("OTP_HASH_SECRET");
const RESEND_FROM_EMAIL = defineString("RESEND_FROM_EMAIL", { default: "Rynix Tech <onboarding@resend.dev>" });

function callError(error) {
  if (error instanceof HttpsError) throw error;
  logger.error("OTP function failed", error);
  throw new HttpsError("internal", "We could not complete that request. Please try again.");
}

function getData(request, fields) {
  if (!request.data || typeof request.data !== "object") throw new HttpsError("invalid-argument", "Invalid request.");
  const data = {};
  for (const field of fields) data[field] = request.data[field];
  return data;
}

function otpRef(flow, email) {
  return db.collection("emailOtps").doc(`${flow}_${emailKey(email)}`);
}

async function sendOtp({ flow, email }) {
  const ref = otpRef(flow, email);
  const now = Date.now();
  const code = createOtp();
  const hash = hashOtp({ secret: OTP_HASH_SECRET.value(), flow, email, code });
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + OTP_TTL_MS);
  const cooldownUntil = admin.firestore.Timestamp.fromMillis(now + OTP_COOLDOWN_MS);
  await db.runTransaction(async transaction => {
    const existing = (await transaction.get(ref)).data();
    if (existing && existing.cooldownUntil?.toMillis() > now) {
      const cooldownSeconds = Math.ceil((existing.cooldownUntil.toMillis() - now) / 1000);
      throw new HttpsError("resource-exhausted", `Please wait ${cooldownSeconds} seconds before requesting another code.`, { cooldownSeconds });
    }
    transaction.set(ref, { flow, emailHash: emailKey(email), codeHash: hash, attempts: 0, maxAttempts: MAX_ATTEMPTS, expiresAt, cooldownUntil, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  const purpose = flow === "signup" ? "complete your Rynix Tech signup" : "reset your Rynix Tech password";
  const resend = new Resend(RESEND_API_KEY.value());
  const { error } = await resend.emails.send({ from: RESEND_FROM_EMAIL.value(), to: [email], subject: "Your Rynix Tech verification code", html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h1>Rynix Tech</h1><p>Use this code to ${purpose}:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p></div>` });
  if (error) { await ref.delete(); logger.error("Resend rejected OTP email", error); throw new HttpsError("internal", "We could not send the verification email. Please try again."); }
  return { cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000), expiresInSeconds: Math.ceil(OTP_TTL_MS / 1000) };
}

async function verifyOtp({ flow, email, code }) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new HttpsError("invalid-argument", "Enter the 6-digit verification code.");
  const ref = otpRef(flow, email);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found", "No active code was found. Request a new code.");
    const record = snapshot.data();
    const now = Date.now();
    if (record.expiresAt.toMillis() <= now) { transaction.delete(ref); throw new HttpsError("deadline-exceeded", "This code has expired. Request a new one."); }
    if (record.attempts >= MAX_ATTEMPTS) { transaction.delete(ref); throw new HttpsError("resource-exhausted", "Too many incorrect attempts. Request a new code."); }
    const expected = hashOtp({ secret: OTP_HASH_SECRET.value(), flow, email, code });
    if (!safeEqual(record.codeHash, expected)) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) transaction.delete(ref); else transaction.update(ref, { attempts });
      throw new HttpsError("permission-denied", `Incorrect code. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining.`);
    }
    transaction.delete(ref);
  });
}

exports.requestSignupOtp = onCall({ region: "us-central1", secrets: [RESEND_API_KEY, OTP_HASH_SECRET] }, async request => {
  try { const { email: rawEmail } = getData(request, ["email"]); const email = normalizeEmail(rawEmail); try { await admin.auth().getUserByEmail(email); throw new HttpsError("already-exists", "An account already exists for this email. Please log in."); } catch (error) { if (error.code !== "auth/user-not-found") throw error; } return await sendOtp({ flow: "signup", email }); } catch (error) { callError(error); }
});

exports.verifySignupOtp = onCall({ region: "us-central1", secrets: [OTP_HASH_SECRET] }, async request => {
  try { const { email: rawEmail, password, code } = getData(request, ["email", "password", "code"]); const email = normalizeEmail(rawEmail); assertPassword(password); await verifyOtp({ flow: "signup", email, code }); const user = await admin.auth().createUser({ email, password, emailVerified: true }); await db.doc(`users/${user.uid}`).set({ email, role: "user", createdAt: admin.firestore.FieldValue.serverTimestamp() }); return { ok: true }; } catch (error) { callError(error); }
});

exports.requestPasswordResetOtp = onCall({ region: "us-central1", secrets: [RESEND_API_KEY, OTP_HASH_SECRET] }, async request => {
  try { const { email: rawEmail } = getData(request, ["email"]); const email = normalizeEmail(rawEmail); try { await admin.auth().getUserByEmail(email); } catch (error) { if (error.code === "auth/user-not-found") return { ok: true, cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000), expiresInSeconds: Math.ceil(OTP_TTL_MS / 1000) }; throw error; } return await sendOtp({ flow: "password-reset", email }); } catch (error) { callError(error); }
});

exports.verifyPasswordResetOtp = onCall({ region: "us-central1", secrets: [OTP_HASH_SECRET] }, async request => {
  try { const { email: rawEmail, password, code } = getData(request, ["email", "password", "code"]); const email = normalizeEmail(rawEmail); assertPassword(password); await verifyOtp({ flow: "password-reset", email, code }); const user = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(user.uid, { password }); return { ok: true }; } catch (error) { callError(error); }
});
