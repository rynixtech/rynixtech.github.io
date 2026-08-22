import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-ai.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD4fRxucKX7nWJKuwdT5RX7UFogvDsIXAo',
  authDomain: 'rynixtech-e0281.firebaseapp.com',
  projectId: 'rynixtech-e0281',
  storageBucket: 'rynixtech-e0281.appspot.com',
  messagingSenderId: '50627783379',
  appId: '1:50627783379:web:6041bcdf91e1bcbbfb0226',
  measurementId: 'G-6DVJWYB6ML'
};

const app = initializeApp(firebaseConfig);

// Initialize App Check
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LdWaIwtAAAAAB0GAI71eW5mT5YBcilqTIHo9Y4z'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export const aiAdminModel = getGenerativeModel(ai, { 
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are the Rynix Tech Website Brain and Admin Controller. You manage operations, answer queries about the system, and can execute commands on the site database. Keep your tone professional and authoritative.',
  tools: [
    {
      functionDeclarations: [
        {
          name: 'getSystemStatus',
          description: 'Gets the current health status of the website and database.',
          parameters: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getRecentUsers',
          description: 'Gets a list of recently registered users.',
          parameters: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'selfRepair',
          description: 'Executes a self-repair and rollback diagnostic if issues are detected.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }
  ]
});

// B2 Helper
export async function deleteB2Object(objectKey) {
  if (!objectKey) return;
  const token = await auth.currentUser.getIdToken();
  const res = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/storage/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ objectKey })
  });
  if (!res.ok) {
    throw new Error('Failed to delete object from B2');
  }
}

export function httpsCallable(functionsInstance, functionName) {
  return async (data) => {
    let token = null;
    if (auth.currentUser) token = await auth.currentUser.getIdToken();
    
    let url = '';
    if (['setInitialAdmin', 'requestSignupOtp', 'verifySignupOtp', 'requestPasswordResetOtp', 'verifyPasswordResetOtp'].includes(functionName)) {
      url = `https://rynixtech-control-center-worker.rynixtech.workers.dev/api/auth/${functionName}`;
    } else {
      url = `https://rynixtech-control-center-worker.rynixtech.workers.dev/api/admin/${functionName}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data })
      });
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        throw new Error('Unable to reach the backend. Check Worker URL/CORS.');
      }
      throw e;
    }

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || result.message || 'API Error');
    return result;
  };
}
