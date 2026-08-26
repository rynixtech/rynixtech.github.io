import { app, auth, db, ai, aiAdminModel, httpsCallable } from '../firebase.js';

export { app, auth, db, ai, aiAdminModel, httpsCallable };

export async function deleteB2Object(objectKey) {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/storage/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ objectKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed');
    return data;
}

export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
