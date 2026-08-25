import { app, auth, db, ai, aiAdminModel, httpsCallable } from '../firebase.js';

export { app, auth, db, ai, aiAdminModel, httpsCallable };

export async function deleteB2Object(fileId, fileName) {
    const deleteFunc = httpsCallable(null, 'deleteFile');
    return deleteFunc({ fileId, fileName });
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
