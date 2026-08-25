const admin = require('firebase-admin');
const http = require('http');

// IMPORTANT: Never hardcode credentials in source files.
// Use environment variables or a .env file (excluded from git).
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
  credential: admin.credential.applicationDefault()
});

console.log(admin.auth().createUser.toString());
