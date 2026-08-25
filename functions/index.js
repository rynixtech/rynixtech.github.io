const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

const adminFunctions = require("./admin");

admin.initializeApp();
const db = admin.firestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const RESEND_FROM_EMAIL = defineString("RESEND_FROM_EMAIL", { default: "Rynix Tech <onboarding@resend.dev>" });


// ── Admin Cloud Functions ────────────────────────────────────────────
exports.setInitialAdmin = adminFunctions.setInitialAdmin;
exports.listUsers = adminFunctions.listUsers;
exports.getAdminStats = adminFunctions.getAdminStats;
exports.disableUser = adminFunctions.disableUser;
exports.enableUser = adminFunctions.enableUser;
