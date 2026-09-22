import xmldom from '@xmldom/xmldom';
globalThis.DOMParser = xmldom.DOMParser;
globalThis.Node = xmldom.Node;
globalThis.XMLSerializer = xmldom.XMLSerializer;
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as jose from 'jose';
import { FirebaseRest } from './firebase-rest';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = new Hono();

const AUTHORIZED_ADMIN_UIDS = [
  "M5UaYY9XROaJoln9c6YxUo6CjM33",
  "DOvjj0w4XvRvL0s23rESPjrpkv72",
  "udXZkoXsEmb8ag4KiQ5Kl8d75bl2",
  "ydgB77Ue40YHLeKxN0PNNver4eA2"
];

function getFirebaseRest(env) {
  let pk = env.FIREBASE_PRIVATE_KEY || '';
  console.log("Diagnostic FIREBASE_PRIVATE_KEY length:", pk.length);
  if (!pk || pk.trim() === '') {
    throw new Error("Server misconfiguration: FIREBASE_PRIVATE_KEY is missing from environment variables.");
  }
  if (pk.startsWith('"') && pk.endsWith('"')) {
    pk = pk.slice(1, -1);
  }
  pk = pk.replace(/\\n/g, '\n');
  
  const sa = {
    project_id: env.FIREBASE_PROJECT_ID,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: pk
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

// --- Cloudflare R2 Storage (Admin) ---

function getS3Client(env) {
    if (!env.B2_REGION || !env.B2_APPLICATION_KEY_ID || !env.B2_APPLICATION_KEY) {
        throw new Error("B2 Misconfigured: Missing B2_REGION, B2_APPLICATION_KEY_ID, or B2_APPLICATION_KEY.");
    }
    // Assume env.B2_BUCKET_NAME is configured. If not, fallback to a sensible default or throw.
    if (!env.B2_BUCKET_NAME) {
        console.warn("B2_BUCKET_NAME is not set in environment variables. Falling back to 'rynixtech-storage'");
    }
    return new S3Client({
        region: env.B2_REGION,
        endpoint: `https://s3.${env.B2_REGION}.backblazeb2.com`,
        credentials: {
            accessKeyId: env.B2_APPLICATION_KEY_ID,
            secretAccessKey: env.B2_APPLICATION_KEY,
        }
    });
}
function getBucketName(env) {
    return env.B2_BUCKET_NAME || 'rynixtech-storage';
}

app.get('/api/admin/storage/stats', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    let totalSize = 0;
    let totalObjects = 0;
    let continuationToken;
    let isTruncated = true;
    
    while (isTruncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: getBucketName(c.env),
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });
      const list = await s3.send(listCmd);
      for (const obj of list.Contents || []) {
        totalSize += obj.Size;
        totalObjects++;
      }
      isTruncated = list.IsTruncated;
      continuationToken = list.NextContinuationToken;
      
      if (totalObjects >= 50000) break;
    }
    
    return c.json({ ok: true, totalSize, totalObjects });
  } catch (err) {
    console.error('[STORAGE STATS ERROR]', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.get('/api/admin/storage/list', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const prefix = c.req.query('prefix') || '';
    const cursor = c.req.query('cursor');
    const limit = parseInt(c.req.query('limit')) || 100;
    const search = c.req.query('search') || '';
    
    const listCmd = new ListObjectsV2Command({
        Bucket: getBucketName(c.env),
        MaxKeys: limit,
        Prefix: prefix || undefined,
        ContinuationToken: cursor || undefined,
        Delimiter: search ? undefined : '/'
    });
    const list = await s3.send(listCmd);
    
    let objects = (list.Contents || []).map(o => ({
      key: o.Key,
      size: o.Size,
      uploaded: o.LastModified,
      etag: o.ETag,
      type: 'application/octet-stream'
    }));
    
    if (search) {
      objects = objects.filter(o => o.key.toLowerCase().includes(search.toLowerCase()));
    }
    
    return c.json({
      ok: true,
      objects,
      folders: (list.CommonPrefixes || []).map(p => p.Prefix),
      nextCursor: list.IsTruncated ? list.NextContinuationToken : null
    });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/storage/upload', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const formData = await c.req.parseBody();
    const file = formData['file'];
    const category = formData['category'] || 'general';
    
    if (!file || !file.name) {
      return c.json({ ok: false, error: 'No file provided' }, 400);
    }
    
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = category 
        ? `${category}/${Date.now()}-${safeFilename}`
        : `general/${Date.now()}-${safeFilename}`;
        
    const arrayBuffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: getBucketName(c.env),
      Key: objectKey,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'application/octet-stream',
    });

    await s3.send(command);
    
    return c.json({ ok: true, objectKey });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/storage/delete', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const body = await c.req.json();
    const path = body.objectKey || body.path;
    if (!path) return c.json({ ok: false, error: 'No path/objectKey provided' }, 400);
    
    const cmd = new DeleteObjectCommand({
      Bucket: getBucketName(c.env),
      Key: path
    });
    await s3.send(cmd);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/admin/storage/bulk-delete', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const body = await c.req.json();
    const paths = body.paths;
    if (!Array.isArray(paths)) return c.json({ ok: false, error: 'Invalid paths array' }, 400);
    
    for (let i = 0; i < paths.length; i += 1000) {
      const chunk = paths.slice(i, i + 1000);
      const cmd = new DeleteObjectsCommand({
        Bucket: getBucketName(c.env),
        Delete: {
          Objects: chunk.map(Key => ({ Key }))
        }
      });
      await s3.send(cmd);
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/admin/storage/copy', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const body = await c.req.json();
    const { oldPath, newPath } = body;
    if (!oldPath || !newPath) return c.json({ ok: false, error: 'Missing paths' }, 400);
    
    const cmd = new CopyObjectCommand({
      Bucket: getBucketName(c.env),
      CopySource: encodeURIComponent(`${getBucketName(c.env)}/${oldPath}`),
      Key: newPath
    });
    await s3.send(cmd);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/admin/storage/move', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const body = await c.req.json();
    const { oldPath, newPath } = body;
    if (!oldPath || !newPath) return c.json({ ok: false, error: 'Missing paths' }, 400);
    
    const cmdCopy = new CopyObjectCommand({
      Bucket: getBucketName(c.env),
      CopySource: encodeURIComponent(`${getBucketName(c.env)}/${oldPath}`),
      Key: newPath
    });
    await s3.send(cmdCopy);
    
    const cmdDel = new DeleteObjectCommand({
      Bucket: getBucketName(c.env),
      Key: oldPath
    });
    await s3.send(cmdDel);
    
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.post('/api/admin/storage/rename', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const body = await c.req.json();
    const { oldPath, newPath } = body;
    if (!oldPath || !newPath) return c.json({ ok: false, error: 'Missing paths' }, 400);
    
    const cmdCopy = new CopyObjectCommand({
      Bucket: getBucketName(c.env),
      CopySource: encodeURIComponent(`${getBucketName(c.env)}/${oldPath}`),
      Key: newPath
    });
    await s3.send(cmdCopy);
    
    const cmdDel = new DeleteObjectCommand({
      Bucket: getBucketName(c.env),
      Key: oldPath
    });
    await s3.send(cmdDel);
    
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.get('/api/admin/storage/download', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    const path = c.req.query('path');
    if (!path) return c.json({ ok: false, error: 'No path provided' }, 400);
    
    const cmd = new GetObjectCommand({
      Bucket: getBucketName(c.env),
      Key: path,
      ResponseContentDisposition: `attachment; filename="${path.split('/').pop()}"`
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
    return c.redirect(url);
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Backward compatibility endpoints for existing UI
app.get('/api/admin/storage-stats', async (c) => {
  try {
    const s3 = getS3Client(c.env);
    let totalSize = 0;
    let totalObjects = 0;
    let continuationToken;
    let isTruncated = true;
    while (isTruncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: getBucketName(c.env),
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });
      const list = await s3.send(listCmd);
      for (const obj of list.Contents || []) { totalSize += obj.Size; totalObjects++; }
      isTruncated = list.IsTruncated;
      continuationToken = list.NextContinuationToken;
      if (totalObjects >= 50000) break;
    }
    return c.json({ ok: true, totalSize, totalObjects });
  } catch (err) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Serve public files directly
app.get('/public/:category/:filename', async (c) => {
  try {
    const category = c.req.param('category');
    const filename = c.req.param('filename');
    const path = `public/${category}/${filename}`;
    
    const s3 = getS3Client(c.env);
    const cmd = new GetObjectCommand({
      Bucket: getBucketName(c.env),
      Key: path
    });
    const data = await s3.send(cmd);
    
    const headers = new Headers();
    headers.set('Content-Type', data.ContentType || 'application/octet-stream');
    if (data.ETag) headers.set('ETag', data.ETag);
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(data.Body, { headers });
  } catch (err) {
    if (err.name === 'NoSuchKey') return new Response('Object Not Found', { status: 404 });
    return c.json({ error: 'Failed to fetch asset', details: err.message }, 500);
  }
});

app.get('/api/storage/documents/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    const path = `private/documents/${filename}`;
    
    const s3 = getS3Client(c.env);
    const cmd = new GetObjectCommand({
      Bucket: getBucketName(c.env),
      Key: path
    });
    const data = await s3.send(cmd);
    
    const headers = new Headers();
    headers.set('Content-Type', data.ContentType || 'application/octet-stream');
    if (data.ETag) headers.set('ETag', data.ETag);
    return new Response(data.Body, { headers });
  } catch (err) {
    if (err.name === 'NoSuchKey') return new Response('Object Not Found', { status: 404 });
    return c.json({ error: 'Failed to fetch document', details: err.message }, 500);
  }
});

// Public Firebase config for client SDK initialization
app.get('/api/client-config', (c) => {
  return c.json({
    apiKey: 'AIzaSyD4fRxucKX7nWJKuwdT5RX7UFogvDsIXAo',
    authDomain: `${c.env.FIREBASE_PROJECT_ID || 'rynixtech-e0281'}.firebaseapp.com`,
    projectId: c.env.FIREBASE_PROJECT_ID || 'rynixtech-e0281',
    storageBucket: `${c.env.FIREBASE_PROJECT_ID || 'rynixtech-e0281'}.appspot.com`,
    messagingSenderId: '50627783379',
    appId: '1:50627783379:web:6041bcdf91e1bcbbfb0226'
  });
});

// --- Public Contact Endpoint ---
app.post('/api/public/contact', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const data = body.data || body;
    const { name, email, message, subject } = data;
    if (!email || !message) return c.json({ error: "Email and message are required" }, 400);

    const fb = getFirebaseRest(c.env);
    await fb.addDocument("support", {
      name: name || "Anonymous",
      email,
      subject: subject || "No Subject",
      message,
      status: "open",
      createdAt: new Date().toISOString()
    });

    const adminEmails = c.env.ADMIN_EMAIL ? c.env.ADMIN_EMAIL.split(',').map(e => e.trim()) : [];
    if (adminEmails.length > 0 && c.env.RESEND_API_KEY) {
      const resend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${c.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: c.env.RESEND_FROM_EMAIL || "Rynix Tech Contact <onboarding@resend.dev>",
          to: adminEmails,
          reply_to: email,
          subject: subject || "New Contact Form Submission",
          html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong><br>${message}</p>`
        })
      });
      if (!resend.ok) console.warn('Resend failed:', await resend.text());
    }

    return c.json({ data: { success: true, message: "Contact request received." } });
  } catch (err) {
    console.error('Contact form error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// --- Admin Endpoints ---

async function logAdminActivity(fb, adminUid, action, resource, resourceId = null, details = null) {
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
    await logAdminActivity(fb, uid, "initial-admin-setup", "system", uid, "Owner account promoted to admin via Worker.");
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
  await logAdminActivity(fb, c.get('user').user_id, "disable-user", "user", uid, "User disabled by admin.");
  return c.json({ data: { ok: true } });
});

app.post('/api/admin/enableUser', async (c) => {
  const body = await c.req.json().catch(()=>({}));
  const uid = body.data?.uid || body.uid;
  if (typeof uid !== 'string' || !uid) return c.json({ error: 'UID is required.' }, 400);
  
  const fb = getFirebaseRest(c.env);
  await fb.updateUser(uid, { disabled: false });
  await logAdminActivity(fb, c.get('user').user_id, "enable-user", "user", uid, "User enabled by admin.");
  return c.json({ data: { ok: true } });
});

app.post("/api/admin/updateOrderStatus", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
    
    const body = await c.req.json().catch(() => ({}));
    const data = body.data || body;
    const { orderId, newStatus } = data;
    if (!orderId || !newStatus) return c.json({ error: "Missing orderId or newStatus" }, 400);

    const fb = getFirebaseRest(c.env);
    const order = await fb.getDocument("orders", orderId);
    if (!order) return c.json({ error: "Order not found" }, 404);

    const oldStatus = order.status;
    if (oldStatus === newStatus) return c.json({ data: { success: true } });

    // Inventory logic
    const requiresDeduction = newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered';
    const wasDeducted = oldStatus === 'processing' || oldStatus === 'shipped' || oldStatus === 'delivered';

    if (requiresDeduction && !wasDeducted) {
      const items = order.items || [];
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const currentStock = Number(product.stock) || 0;
          const qty = Number(item.quantity) || 1;
          if (currentStock < qty) return c.json({ error: `Insufficient stock for ${product.name || item.productId}` }, 400);
        }
      }
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const newStock = Math.max(0, (Number(product.stock) || 0) - (Number(item.quantity) || 1));
          await fb.setDocument("products", item.productId, { stock: newStock });
        }
      }
    } else if ((newStatus === 'cancelled' || newStatus === 'refunded') && wasDeducted) {
      const items = order.items || [];
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const newStock = (Number(product.stock) || 0) + (Number(item.quantity) || 1);
          await fb.setDocument("products", item.productId, { stock: newStock });
        }
      }
    }

    await fb.setDocument("orders", orderId, { status: newStatus });
    await logAdminActivity(fb, "Admin", "Order Status Updated", "orders", orderId, `Order ${orderId} changed from ${oldStatus || 'unknown'} to ${newStatus}`);
    return c.json({ data: { success: true, oldStatus, newStatus } });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
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
  return c.json({ data: { status, activeIncidents, lastCheck: new Date().toISOString(), services, envKeys: Object.keys(c.env) } });
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
            subject: "RYNIX TECH SYSTEM ALERT",
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
