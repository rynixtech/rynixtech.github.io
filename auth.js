import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// Signup
window.signup = function(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "user",
        createdAt: serverTimestamp()
    }, { merge: true });

      alert("Account created successfully!");
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      alert(error.message);
    });
};

// Login
window.login = function(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Login successful!");
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      alert(error.message);
    });
};

// Google Login / Signup
window.googleLogin = async function() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Ensure user doc exists / merge
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "user",
      createdAt: serverTimestamp()
    }, { merge: true });

    // Redirect based on verification (Google accounts are usually verified)
    if (user.emailVerified) {
      window.location.replace("index.html");
    } else {
      window.location.replace("verify.html");
    }

  } catch (error) {
    alert(error.message);
  }
};

// Logout
window.logout = function() {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};

// Forgot Password
window.resetPassword = function(email) {
  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("Password reset email sent.");
    })
    .catch(error => {
      alert(error.message);
    });
};
