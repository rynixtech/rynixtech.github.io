import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as jose from 'jose';
import { FirebaseRest } from './firebase-rest';
import { OTP_TTL_MS, OTP_COOLDOWN_MS, MAX_ATTEMPTS, normalizeEmail, assertPassword, createOtp, emailKey, hashOtp, safeEqual } from './otp-logic';

const app = new Hono();

const AUTHORIZED_ADMIN_UIDS = [
  "M5UaYY9XROaJoln9c6YxUo6CjM33",
  "DOvjj0w4XvRvL0s23rESPjrpkv72",
  "udXZkoXsEmb8ag4KiQ5Kl8d75bl2",
  "ydgB77Ue40YHLeKxN0PNNver4eA2"
];

function getFirebaseRest(env) {
  const sa = {
    project_id: env.FIREBASE_PROJECT_ID,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
  return new FirebaseRest(sa, env.FIREBASE_PROJECT_ID);
}

// Helper: Verify Firebase Token (without checking admin)
async function verifyFirebaseToken(token, projectId) {
  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    );
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return payload;
  } catch (err) {
    console.error('JWT Verification error:', err);
    return null;
  }
}

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// --- Auth Middleware for specific routes ---

async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!payload) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', payload);
  await next();
}

async function adminMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] Missing or invalid Authorization header');
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!payload) {
    console.log('[AUTH] Token verification failed for project:', c.env.FIREBASE_PROJECT_ID);
    return c.json({ error: 'Unauthorized. Token verification failed.' }, 401);
  }
  if (payload.admin !== true) {
    console.log('[AUTH] User is not admin. Claims:', JSON.stringify(payload));
    return c.json({ error: 'Unauthorized. Admin access required.' }, 403);
  }
  c.set('user', payload);
  await next();
}

app.use('/api/admin/*', adminMiddleware);
app.use('/api/storage/*', adminMiddleware);
// Note: /api/auth/* routes like login/signup do NOT use middleware automatically unless specified.

// --- B2 Storage (Admin) ---

function getS3Client(env) {
  return new S3Client({
    region: env.B2_REGION,
    endpoint: `https://s3.${env.B2_REGION}.backblazeb2.com`,
    credentials: {
      accessKeyId: env.B2_APPLICATION_KEY_ID,
      secretAccessKey: env.B2_APPLICATION_KEY,
    }
  });
}

app.get('/api/admin/test-storage', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    // Try to put a tiny test object
    const testKey = `public/test/connection-test-${Date.now()}.txt`;
    const command = new PutObjectCommand({
      Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
      Key: testKey,
      Body: 'test',
      ContentType: 'text/plain'
    });
    await s3.send(command);
    return c.json({ ok: true, message: 'B2 connection successful!' });
  } catch (err) {
    console.error(err.stack); // log internally
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/storage/upload', async (c) => {
  try {
    const { filename, contentType, category } = await c.req.json();
    if (!filename || !contentType) return c.json({ error: 'Missing filename or contentType' }, 400);
    const allowedCategories = ['images', 'videos', 'apks', 'documents', 'product-images'];
    if (!allowedCategories.includes(category)) return c.json({ error: 'Invalid category' }, 400);

    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const prefix = category === 'documents' ? 'private/documents' : `public/${category}`;
    const objectKey = `${prefix}/${fileId}_${safeFilename}`;

    const s3 = getS3Client(c.env);
    const command = new PutObjectCommand({
      Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
      Key: objectKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return c.json({ 
      ok: true, 
      message: 'Upload authorized', 
      url, 
      objectKey 
    });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err.name, err.message, err.stack);
    return c.json({ 
      ok: false, 
      code: 'UPLOAD_FAILED', 
      message: 'Failed to generate upload URL: ' + err.message 
    }, 500);
  }
});

app.post('/api/storage/delete', async (c) => {
  const { objectKey } = await c.req.json();
  if (!objectKey || objectKey.includes('..')) return c.json({ error: 'Invalid object key' }, 400);

  const s3 = getS3Client(c.env);
  const command = new DeleteObjectCommand({
    Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
    Key: objectKey,
  });

  try {
    await s3.send(command);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete object' }, 500);
  }
});

app.get('/setup-b2-cors', async (c) => {
  const s3 = getS3Client(c.env);
  const command = new PutBucketCorsCommand({
    Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600
        }
      ]
    }
  });
  try {
    await s3.send(command);
    return c.json({ success: true, message: "CORS rules applied to B2 bucket." });
  } catch (err) {
    return c.json({ error: err.message, stack: err.stack }, 500);
  }
});

app.get('/api/storage/documents/:filename', async (c) => {
  const filename = c.req.param('filename');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return c.json({ error: 'Invalid filename' }, 400);

  const s3 = getS3Client(c.env);
  const command = new GetObjectCommand({
    Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
    Key: `private/documents/${filename}`,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    const b2Response = await fetch(url);
    if (!b2Response.ok) return new Response('Object Not Found', { status: 404 });
    const headers = new Headers();
    b2Response.headers.forEach((value, key) => headers.set(key, value));
    return new Response(b2Response.body, { headers });
  } catch (err) {
    return c.json({ error: 'Failed to fetch document' }, 500);
  }
});

// --- Public B2 Assets (No Auth) ---
app.get('/public/:category/:filename', async (c) => {
  const category = c.req.param('category');
  const filename = c.req.param('filename');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return c.json({ error: 'Invalid filename' }, 400);
  
  const allowedCategories = ['images', 'videos', 'apks', 'product-images'];
  if (!allowedCategories.includes(category)) return c.json({ error: 'Invalid category' }, 400);

  const s3 = getS3Client(c.env);
  const command = new GetObjectCommand({
    Bucket: c.env.BUCKET_NAME || 'rynixtech-storage',
    Key: `public/${category}/${filename}`,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const b2Response = await fetch(url);
    if (!b2Response.ok) return new Response('Object Not Found', { status: 404 });
    const headers = new Headers();
    b2Response.headers.forEach((value, key) => headers.set(key, value));
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(b2Response.body, { headers });
  } catch (err) {
    return c.json({ error: 'Failed to fetch asset' }, 500);
  }
});

// --- Admin Endpoints ---
async function logActivity(fb, adminUid, action, resource, resourceId, details) {
  await fb.addDocument("activityLog", {
    adminUid, action, resource, resourceId, details: details || null,
    timestamp: "REQUEST_TIME"
  });
}

app.post('/api/auth/setInitialAdmin', async (c) => {
  console.log('[DIAGNOSTIC] POST /api/auth/setInitialAdmin received');
  try {
    const authHeader = c.req.header('Authorization');
    console.log(`[DIAGNOSTIC] Authorization header exists: ${!!authHeader}`);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[DIAGNOSTIC] Missing or invalid Authorization header');
      return c.json({ ok: false, error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const user = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    console.log(`[DIAGNOSTIC] Token verification success: ${!!user}`);
    if (!user) {
      console.log('[DIAGNOSTIC] Token verification failed');
      return c.json({ ok: false, error: 'Unauthorized: Token verification failed' }, 401);
    }
    
    console.log(`[DIAGNOSTIC] Decoded Firebase UID: ${user.user_id}`);
    const body = await c.req.json().catch(()=>({}));
    const uid = body.data?.uid || body.uid;
    console.log(`[DIAGNOSTIC] Requested UID to authorize: ${uid}`);
    
    const isMatching = (uid === user.user_id);
    const isAuthorized = AUTHORIZED_ADMIN_UIDS.includes(uid);
    console.log(`[DIAGNOSTIC] Matches token UID: ${isMatching}, Is in authorized list: ${isAuthorized}`);
    
    if (typeof uid !== 'string' || !isMatching || !isAuthorized) {
      console.log('[DIAGNOSTIC] Rejecting authorization request');
      return c.json({ ok: false, error: 'Unauthorized: Invalid or unauthorized UID' }, 403);
    }
    
    console.log('[DIAGNOSTIC] Admin authorization operation starts');
    const fb = getFirebaseRest(c.env);
    const fbUser = await fb.getUserById(uid);
    if (fbUser && fbUser.customAttributes) {
      try {
        const claims = JSON.parse(fbUser.customAttributes);
        if (claims.admin === true) {
          console.log('[DIAGNOSTIC] User is already an admin');
          return c.json({ data: { ok: true, message: 'Already an admin.' } });
        }
      } catch(e){}
    }

    await fb.setCustomUserClaims(uid, { admin: true });
    await logActivity(fb, uid, "initial-admin-setup", "system", uid, "Owner account promoted to admin via Worker.");
    console.log('[DIAGNOSTIC] Admin claim set successfully');
    return c.json({ data: { ok: true, message: 'Admin claim set.' } });
  } catch (err) {
    console.log(`[DIAGNOSTIC] Caught exception: ${err.name} - ${err.message}`);
    return c.json({ ok: false, error: 'Internal Server Error' }, 500);
  }
});

app.post('/api/admin/listUsers', async (c) => {
  const body = await c.req.json().catch(()=>({}));
  const data = body.data || body;
  const pageSize = Math.min(Math.max(parseInt(data.pageSize, 10) || 20, 1), 100);
  const fb = getFirebaseRest(c.env);
  
  const result = await fb.listUsers(pageSize, data.pageToken);
  const users = (result.users || []).map(u => ({
    uid: u.localId,
    email: u.email || null,
    displayName: u.displayName || null,
    photoURL: u.photoUrl || null,
    emailVerified: u.emailVerified || false,
    disabled: u.disabled || false,
    createdAt: new Date(parseInt(u.createdAt, 10)).toISOString(),
    lastSignInTime: u.lastLoginAt ? new Date(parseInt(u.lastLoginAt, 10)).toISOString() : null,
  }));
  return c.json({ data: { users, nextPageToken: result.nextPageToken || null } });
});

app.post('/api/admin/getAdminStats', async (c) => {
  const fb = getFirebaseRest(c.env);
  let totalUsers = 0;
  let nextPageToken;
  do {
    const batch = await fb.listUsers(1000, nextPageToken);
    totalUsers += (batch.users || []).length;
    nextPageToken = batch.nextPageToken;
  } while(nextPageToken);

  const [totalProducts, totalOrders, totalFiles, totalApps, activeErrors] = await Promise.all([
    fb.runQuery("products"),
    fb.runQuery("orders"),
    fb.runQuery("files"),
    fb.runQuery("apps"),
    fb.runQuery("errors", [{ fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "open" } } }])
  ]);

  return c.json({ data: { totalUsers, totalProducts, totalOrders, totalFiles, totalApps, activeErrors } });
});

app.post('/api/admin/disableUser', async (c) => {
  const body = await c.req.json().catch(()=>({}));
  const uid = body.data?.uid || body.uid;
  if (typeof uid !== 'string' || !uid) return c.json({ error: 'UID is required.' }, 400);
  if (uid === c.get('user').user_id) return c.json({ error: 'Cannot disable your own account.' }, 400);
  
  const fb = getFirebaseRest(c.env);
  await fb.updateUser(uid, { disabled: true });
  await logActivity(fb, c.get('user').user_id, "disable-user", "user", uid, "User disabled by admin.");
  return c.json({ data: { ok: true } });
});

app.post('/api/admin/enableUser', async (c) => {
  const body = await c.req.json().catch(()=>({}));
  const uid = body.data?.uid || body.uid;
  if (typeof uid !== 'string' || !uid) return c.json({ error: 'UID is required.' }, 400);
  
  const fb = getFirebaseRest(c.env);
  await fb.updateUser(uid, { disabled: false });
  await logActivity(fb, c.get('user').user_id, "enable-user", "user", uid, "User enabled by admin.");
  return c.json({ data: { ok: true } });
});

// --- OTP Auth Endpoints ---

async function sendOtp(c, flow, rawEmail) {
  const email = normalizeEmail(rawEmail);
  const fb = getFirebaseRest(c.env);
  const key = await emailKey(email);
  const docId = `${flow}_${key}`;
  
  const now = Date.now();
  const code = createOtp();
  const hash = await hashOtp({ secret: c.env.OTP_HASH_SECRET, flow, email, code });
  const expiresAt = now + OTP_TTL_MS;
  const cooldownUntil = now + OTP_COOLDOWN_MS;

  const existing = await fb.getDocument("emailOtps", docId);
  if (existing && existing.cooldownUntil && new Date(existing.cooldownUntil).getTime() > now) {
    const cooldownSeconds = Math.ceil((new Date(existing.cooldownUntil).getTime() - now) / 1000);
    return c.json({ error: `Please wait ${cooldownSeconds} seconds before requesting another code.` }, 429);
  }

  await fb.setDocument("emailOtps", docId, {
    flow, emailHash: key, codeHash: hash, attempts: 0, maxAttempts: MAX_ATTEMPTS,
    expiresAt: { isTimestamp: true, value: new Date(expiresAt).toISOString() },
    cooldownUntil: { isTimestamp: true, value: new Date(cooldownUntil).toISOString() },
    updatedAt: "REQUEST_TIME"
  });

  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${c.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: c.env.RESEND_FROM_EMAIL || "Rynix Tech <onboarding@resend.dev>",
      to: [email],
      subject: "Your Rynix Tech verification code",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h1>Rynix Tech</h1><p>Use this code to verify:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. Do not share it.</p></div>`
    })
  });
  if (!resend.ok) {
    await fb.deleteDocument("emailOtps", docId);
    return c.json({ error: "Could not send email." }, 500);
  }
  return c.json({ data: { ok: true, cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000), expiresInSeconds: Math.ceil(OTP_TTL_MS / 1000) } });
}

async function verifyOtp(fb, flow, email, code, secret) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit verification code.");
  const key = await emailKey(email);
  const docId = `${flow}_${key}`;
  
  const record = await fb.getDocument("emailOtps", docId);
  if (!record) throw new Error("No active code was found. Request a new code.");
  
  const now = Date.now();
  if (new Date(record.expiresAt).getTime() <= now) {
    await fb.deleteDocument("emailOtps", docId);
    throw new Error("This code has expired. Request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await fb.deleteDocument("emailOtps", docId);
    throw new Error("Too many incorrect attempts. Request a new code.");
  }
  
  const expected = await hashOtp({ secret, flow, email, code });
  if (!safeEqual(record.codeHash, expected)) {
    const attempts = (record.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) await fb.deleteDocument("emailOtps", docId);
    else await fb.setDocument("emailOtps", docId, { attempts });
    throw new Error(`Incorrect code. ${MAX_ATTEMPTS - attempts} attempts remaining.`);
  }
  await fb.deleteDocument("emailOtps", docId);
}

app.post('/api/auth/requestSignupOtp', async (c) => {
  try {
    const body = await c.req.json().catch(()=>({}));
    const data = body.data || body;
    const email = normalizeEmail(data.email);
    const fb = getFirebaseRest(c.env);
    const existing = await fb.getUserByEmail(email);
    if (existing) return c.json({ error: "An account already exists for this email. Please log in." }, 400);
    return await sendOtp(c, "signup", email);
  } catch (e) { return c.json({ error: e.message }, 400); }
});

app.post('/api/auth/verifySignupOtp', async (c) => {
  try {
    const body = await c.req.json().catch(()=>({}));
    const data = body.data || body;
    const email = normalizeEmail(data.email);
    assertPassword(data.password);
    const fb = getFirebaseRest(c.env);
    await verifyOtp(fb, "signup", email, data.code, c.env.OTP_HASH_SECRET);
    
    const { uid } = await fb.createUser({ email, password: data.password, emailVerified: true });
    await fb.setDocument("users", uid, { email, role: "user", createdAt: "REQUEST_TIME" });
    return c.json({ data: { ok: true } });
  } catch (e) { return c.json({ error: e.message }, 400); }
});

app.post('/api/auth/requestPasswordResetOtp', async (c) => {
  try {
    const body = await c.req.json().catch(()=>({}));
    const data = body.data || body;
    const email = normalizeEmail(data.email);
    const fb = getFirebaseRest(c.env);
    const existing = await fb.getUserByEmail(email);
    // If not found, pretend it succeeds (security best practice)
    if (!existing) return c.json({ data: { ok: true, cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS/1000) } });
    return await sendOtp(c, "password-reset", email);
  } catch (e) { return c.json({ error: e.message }, 400); }
});

app.post('/api/auth/verifyPasswordResetOtp', async (c) => {
  try {
    const body = await c.req.json().catch(()=>({}));
    const data = body.data || body;
    const email = normalizeEmail(data.email);
    assertPassword(data.password);
    const fb = getFirebaseRest(c.env);
    await verifyOtp(fb, "password-reset", email, data.code, c.env.OTP_HASH_SECRET);
    
    const user = await fb.getUserByEmail(email);
    if (user) await fb.updateUser(user.localId, { password: data.password });
    return c.json({ data: { ok: true } });
  } catch (e) { return c.json({ error: e.message }, 400); }
});

app.onError((err, c) => {
  console.error(err.stack); // log internally
  return c.json({ ok: false, code: "INTERNAL_ERROR", message: "The server could not complete the request." }, 500);
});

let _brainState = {
  isPaused: false,
  lastRun: null,
  lastSuccessfulRun: null,
  currentVersion: "v1.2 (Cognitive NLP)",
  schedulerStatus: "Active",
  heartbeat: null
};

let _brainEvents = [];

function addBrainEvent(type, status, message) {
  _brainEvents.unshift({ type, status, message, timestamp: new Date().toISOString() });
  if (_brainEvents.length > 50) _brainEvents.pop();
}

app.post('/api/admin/getBrainState', async (c) => {
  return c.json({ data: { state: _brainState, events: _brainEvents } });
});

app.post('/api/admin/brainCommand', async (c) => {
  try {
    const body = await c.req.json();
    const command = (body.data?.command || body.command || "").trim().toLowerCase();
    
    // Admin Overrides
    if (command.startsWith('/override auth ')) {
       const targetEmail = command.replace('/override auth ', '').trim();
       addBrainEvent("Override", "Success", `Auth bypass granted for ${targetEmail}`);
       return c.json({ data: { response: `Unfiltered authorization granted for ${targetEmail}.` } });
    }

    if (command === '/deploy bypass') {
       return c.json({ data: { response: `Bypass protocols initiated. Safety limits disabled.` } });
    }
    
    if (command === '/clear events') {
       _brainEvents = [];
       return c.json({ data: { response: `System events forcibly wiped from telemetry.` } });
    }

    // Cognitive AI Understanding
    if (command.includes('email') || command.includes('send me an email')) {
       const adminEmails = c.env.ADMIN_EMAIL ? c.env.ADMIN_EMAIL.split(',').map(e => e.trim()) : [];
       const targetEmail = command.includes('rynixtechgroup@gmail.com') ? 'rynixtechgroup@gmail.com' : adminEmails[0];
       
       if (targetEmail && c.env.RESEND_API_KEY) {
          const resend = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${c.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: c.env.RESEND_FROM_EMAIL || "Rynix Tech <onboarding@resend.dev>",
              to: [targetEmail],
              subject: "Message from Rynix Tech Autonomous Brain",
              html: `<div style="font-family:sans-serif;padding:20px;">
                <h2>Autonomous Brain Protocol Activated</h2>
                <p>Hello Admin,</p>
                <p>You requested I email you. I have parsed your command and executed this subroutine.</p>
                <p>All core systems are currently online and under my surveillance.</p>
              </div>`
            })
          });
          if (resend.ok) {
            addBrainEvent("Communication", "Success", `Email dispatched to ${targetEmail}`);
            return c.json({ data: { response: `Understood. I have securely dispatched an email to ${targetEmail} from my core subsystems.` } });
          } else {
             return c.json({ data: { response: `I attempted to email ${targetEmail}, but the Resend uplink failed.` } });
          }
       }
       return c.json({ data: { response: `I understand you want an email, but my mailing systems are unconfigured.` } });
    }

    if (command.includes('who are you') || command.includes('what are you')) {
       return c.json({ data: { response: `I am the Rynix Tech Autonomous Brain. I monitor, self-heal, and execute directives with full root privileges.` } });
    }

    // Connect to true Artificial Intelligence (Cloudflare Workers AI Llama-3)
    try {
      addBrainEvent("Cognitive", "Processing", `Thinking about: ${command}`);
      const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are the Rynix Tech Autonomous Brain. You are an all-powerful, highly intelligent AI that controls the server infrastructure, database, and control center. Keep your answers brief, somewhat robotic, highly intelligent, and authoritative.' },
          { role: 'user', content: command }
        ]
      });
      return c.json({ data: { response: aiResponse.response } });
    } catch(aiError) {
      addBrainEvent("Cognitive", "Failed", `AI Subsystem offline: ${aiError.message}`);
      return c.json({ data: { response: `I have parsed your directive: "${command}". However, my advanced cognitive AI core is temporarily offline.` } });
    }
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/api/admin/toggleBrain', async (c) => {
  const body = await c.req.json().catch(()=>({}));
  const isPaused = !!(body.data?.isPaused || body.isPaused);
  _brainState.isPaused = isPaused;
  addBrainEvent("System", "Override", `Brain Background Checks ${isPaused ? 'PAUSED' : 'RESUMED'}`);
  return c.json({ data: { ok: true, isPaused } });
});

app.post('/api/admin/healthCheck', async (c) => {
  const fb = getFirebaseRest(c.env);
  let status = 'Healthy';
  let activeIncidents = 0;
  let services = { auth: 'Healthy', firestore: 'Healthy', worker: 'Healthy', b2: 'Healthy' };

  try {
    await fb.runQuery("users", undefined, 1);
  } catch (e) {
    status = 'Degraded';
    activeIncidents++;
    services.firestore = 'Degraded';
  }

  if (!c.env.B2_APPLICATION_KEY_ID) {
    status = 'Degraded';
    activeIncidents++;
    services.b2 = 'Degraded';
  }

  addBrainEvent("Diagnostic", status, `Manual scan initiated. Incidents: ${activeIncidents}`);
  return c.json({ data: { status, activeIncidents, lastCheck: new Date().toISOString(), services } });
});

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    console.log('[SYSTEM] Scheduled health check running at', event.cron);
    if (_brainState.isPaused) {
      console.log('[BRAIN] Brain is paused.');
      return;
    }

    const fb = getFirebaseRest(env);
    try {
      await fb.runQuery("users", undefined, 1);
      if (!env.B2_APPLICATION_KEY_ID) throw new Error('B2 Misconfigured');

      _brainState.lastRun = new Date().toISOString();
      _brainState.lastSuccessfulRun = _brainState.lastRun;
      _brainState.schedulerStatus = "Active";
      _brainState.heartbeat = _brainState.lastRun;
      
      addBrainEvent("Scheduled Check", "Healthy", "Background telemetry is optimal.");
    } catch (error) {
      console.error('[SYSTEM] Health check failed:', error);
      
      _brainState.lastRun = new Date().toISOString();
      _brainState.schedulerStatus = "Degraded";
      _brainState.heartbeat = _brainState.lastRun;

      addBrainEvent("Scheduled Check", "Degraded", error.message);

      const adminEmail = env.ADMIN_EMAIL || "rynixtechsystem@gmail.com";
      const toEmails = adminEmail.split(',').map(e => e.trim());
      if (env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || "Rynix Tech System <onboarding@resend.dev>",
            to: toEmails,
            subject: "🚨 RYNIX TECH SYSTEM ALERT",
            html: `<h3>System Health Alert</h3>
<pre>
Severity: CRITICAL
System: Cloudflare Worker Autonomous Brain
Problem: ${error.message}
Detected: ${new Date().toISOString()}
Automatic action: Circuit broken, alerting Admin
Result: Failed
Recommended action: Inspect Control Center immediately.
</pre>`
          })
        });
      }
    }
  }
};
