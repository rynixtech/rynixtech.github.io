import { auth } from './admin-firebase.js';
import { onAuthStateChanged, getIdTokenResult, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';

let currentAdmin = null;
let adminResolve = null;
const adminPromise = new Promise((resolve) => {
  adminResolve = resolve;
});

export function getCurrentAdmin() {
  return currentAdmin;
}

export function requireAdmin() {
  return adminPromise;
}

export async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = '../login.html';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = '../login.html';
  }
}

function showLoading() {
  document.getElementById('auth-loading').hidden = false;
  document.getElementById('app-shell').hidden = true;
  document.getElementById('access-denied').hidden = true;
}

function showAccessDenied() {
  document.getElementById('auth-loading').hidden = true;
  document.getElementById('app-shell').hidden = true;
  document.getElementById('access-denied').hidden = false;

  setTimeout(() => {
    window.location.href = '../index.html';
  }, 3000);
}

function showApp(user) {
  currentAdmin = user;
  document.getElementById('auth-loading').hidden = true;
  document.getElementById('access-denied').hidden = true;
  document.getElementById('app-shell').hidden = false;

  if (adminResolve) {
    adminResolve(user);
    adminResolve = null;
  }

  window.dispatchEvent(new CustomEvent('admin-ready', { detail: { user } }));
}

showLoading();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const idTokenResult = await getIdTokenResult(user, true);
      if (idTokenResult.claims.admin === true) {
        showApp(user);
      } else {
        showAccessDenied();
      }
    } catch (error) {
      console.error('Error fetching custom claims:', error);
      showAccessDenied();
    }
  } else {
    window.location.href = '../login.html';
  }
});
