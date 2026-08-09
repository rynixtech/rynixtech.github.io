# Email OTP setup

This site uses Firebase Cloud Functions and Resend for signup and password-reset verification codes. The browser never receives the Resend API key.

## Before deployment

1. In [Resend](https://resend.com), add and verify a sending domain you control. Create an API key with **Sending access** restricted to that domain.
2. Install and authenticate Firebase CLI, then select the `rynixtech-e0281` project. Enable **Cloud Functions**, **Cloud Firestore**, **Cloud Build**, and **Secret Manager** APIs; Firebase Functions requires billing on the Blaze plan for third-party network calls to Resend.
3. In the repository root, set the two server secrets. Do not create frontend environment variables for either value.

   ```powershell
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set OTP_HASH_SECRET
   ```

   Paste the Resend API key only when prompted. Generate `OTP_HASH_SECRET` as a long random value (for example, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

4. Configure the verified Resend sender address for Functions by creating the ignored file `functions/.env.rynixtech-e0281`:

   ```powershell
   RESEND_FROM_EMAIL="Rynix Tech <security@your-domain.com>"
   ```

   Replace the address with a sender on the Resend-verified domain. This value is not a secret, but keeping it in the ignored environment file makes per-environment configuration clear.

5. Deploy Firestore rules and Functions together:

   ```powershell
   firebase deploy --only firestore:rules,functions
   ```

6. Add both `rynixtech.github.io` and any custom production domain to Firebase Authentication’s **Authorized domains**. Keep `localhost` for local testing.

## Local emulator

`functions/.secret.local` is ignored by Git and contains only dummy values. To test email delivery locally, replace its `RESEND_API_KEY` with a temporary Resend test key; never commit it. Start the emulators from the project root:

```powershell
node functions/node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only functions,firestore,auth --project demo-rynixtech-e0281
```

The client automatically connects callable Functions to `127.0.0.1:5001` when served locally.

## Security controls

- Six-digit codes are generated with `crypto.randomInt`.
- Only an HMAC-SHA-256 hash is stored, scoped to flow and normalized email.
- Codes expire after 10 minutes.
- Resends have a 60-second cooldown.
- Each code permits five attempts; then it is deleted.
- OTP documents are inaccessible to browser clients under `firestore.rules`.
