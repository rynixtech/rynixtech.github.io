const admin = require('firebase-admin');
const http = require('http');

admin.initializeApp({
  projectId: 'test-project',
  credential: admin.credential.cert({
    projectId: 'test-project',
    clientEmail: 'test@test.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBALS46wYp21x1w2a/\n-----END PRIVATE KEY-----'
  })
});

console.log(admin.auth().createUser.toString());
