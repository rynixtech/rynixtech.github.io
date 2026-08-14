const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();

// ── Internal helper: log admin actions to Firestore ──────────────────
async function logActivity({ adminUid, action, resource, resourceId, details }) {
  await db.collection("activityLog").add({
    adminUid,
    action,
    resource,
    resourceId,
    details: details || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ── AUTHORIZED ADMIN UIDS ────────────────────────────────────────────
const AUTHORIZED_ADMIN_UIDS = [
  "M5UaYY9XROaJoln9c6YxUo6CjM33",
  "DOvjj0w4XvRvL0s23rESPjrpkv72",
  "udXZkoXsEmb8ag4KiQ5Kl8d75bl2",
  "ydgB77Ue40YHLeKxN0PNNver4eA2"
];

// ── setInitialAdmin ──────────────────────────────────────────────────
// One-time function to set the admin custom claim on the authorized accounts.
// Only the hardcoded AUTHORIZED_ADMIN_UIDS can be promoted.
exports.setInitialAdmin = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const data = request.data || {};
  const uid = data.uid;

  if (typeof uid !== "string" || uid !== request.auth.uid || !AUTHORIZED_ADMIN_UIDS.includes(uid)) {
    throw new HttpsError("permission-denied", "Unauthorized.");
  }

  // Check if already admin
  const user = await admin.auth().getUser(uid);
  if (user.customClaims && user.customClaims.admin === true) {
    return { ok: true, message: "Already an admin." };
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  await logActivity({
    adminUid: uid,
    action: "initial-admin-setup",
    resource: "system",
    resourceId: uid,
    details: "Owner account promoted to admin via setInitialAdmin.",
  });
  return { ok: true, message: "Admin claim set. Sign out and sign back in for it to take effect." };
});

// ── listUsers ────────────────────────────────────────────────────────
// Paginated list of Firebase Auth users. Admin only.
exports.listUsers = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const data = request.data || {};
  const pageSize = Math.min(Math.max(parseInt(data.pageSize, 10) || 20, 1), 100);
  const pageToken = data.pageToken || undefined;

  const result = await admin.auth().listUsers(pageSize, pageToken);

  const users = result.users.map((u) => ({
    uid: u.uid,
    email: u.email || null,
    displayName: u.displayName || null,
    photoURL: u.photoURL || null,
    emailVerified: u.emailVerified,
    disabled: u.disabled,
    createdAt: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime,
  }));

  return { users, nextPageToken: result.pageToken || null };
});

// ── getAdminStats ────────────────────────────────────────────────────
// Aggregate counts for the Control Center dashboard. Admin only.
exports.getAdminStats = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  // Count users by iterating (Auth has no direct count API)
  let totalUsers = 0;
  let nextPageToken;
  do {
    const batch = await admin.auth().listUsers(1000, nextPageToken);
    totalUsers += batch.users.length;
    nextPageToken = batch.pageToken;
  } while (nextPageToken);

  const [productsSnap, ordersSnap, filesSnap, appsSnap, errorsSnap] = await Promise.all([
    db.collection("products").count().get(),
    db.collection("orders").count().get(),
    db.collection("files").count().get(),
    db.collection("apps").count().get(),
    db.collection("errors").where("status", "==", "open").count().get(),
  ]);

  return {
    totalUsers,
    totalProducts: productsSnap.data().count,
    totalOrders: ordersSnap.data().count,
    totalFiles: filesSnap.data().count,
    totalApps: appsSnap.data().count,
    activeErrors: errorsSnap.data().count,
  };
});

// ── disableUser ──────────────────────────────────────────────────────
exports.disableUser = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const uid = request.data?.uid;
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("invalid-argument", "Cannot disable your own account.");
  }

  await admin.auth().updateUser(uid, { disabled: true });
  await logActivity({
    adminUid: request.auth.uid,
    action: "disable-user",
    resource: "user",
    resourceId: uid,
    details: "User account disabled by admin.",
  });

  return { ok: true };
});

// ── enableUser ───────────────────────────────────────────────────────
exports.enableUser = onCall({ region: "us-central1" }, async (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const uid = request.data?.uid;
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }

  await admin.auth().updateUser(uid, { disabled: false });
  await logActivity({
    adminUid: request.auth.uid,
    action: "enable-user",
    resource: "user",
    resourceId: uid,
    details: "User account enabled by admin.",
  });

  return { ok: true };
});
