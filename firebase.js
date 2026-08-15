import{initializeApp}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";import{getAuth}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";import{getFirestore}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
const firebaseConfig={apiKey:"AIzaSyD4fRxucKX7nWJKuwdT5RX7UFogvDsIXAo",authDomain:"rynixtech-e0281.firebaseapp.com",projectId:"rynixtech-e0281",storageBucket:"rynixtech-e0281.appspot.com",messagingSenderId:"50627783379",appId:"1:50627783379:web:6041bcdf91e1bcbbfb0226",measurementId:"G-6DVJWYB6ML"};
const app=initializeApp(firebaseConfig);export const auth=getAuth(app);export const db=getFirestore(app);

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
