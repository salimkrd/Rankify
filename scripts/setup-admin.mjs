import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'rankify-4b819';
const ADMIN_EMAIL = process.argv[2] || 'salimkrd01@gmail.com';

if (!API_KEY) {
  console.error('❌ Error: VITE_FIREBASE_API_KEY is not defined in .env.');
  process.exit(1);
}

// Function to read password privately with masked keystrokes
function promptPassword(promptText) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(promptText);

    let password = '';
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();

      const onData = (chunk) => {
        const str = chunk.toString();
        for (const char of str) {
          if (char === '\n' || char === '\r' || char === '\u0004') {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            stdout.write('\n');
            rl.close();
            resolve(password.trim());
            return;
          } else if (char === '\u0003') {
            // Ctrl+C
            stdin.setRawMode(false);
            stdout.write('\n');
            process.exit(0);
          } else if (char === '\u007f' || char === '\b') {
            if (password.length > 0) {
              password = password.slice(0, -1);
              stdout.write('\b \b');
            }
          } else if (char.charCodeAt(0) >= 32) {
            password += char;
            stdout.write('*');
          }
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

export async function setupAdmin(email, password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  console.log(`\n⏳ Checking Firebase Authentication for "${email}"...`);

  let localId = null;
  let idToken = null;
  let isExistingAccount = false;

  // 1. First, attempt to sign in with existing credentials to avoid changing any password
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true,
      }),
    }
  );

  const signInData = await signInRes.json();

  if (signInData.localId) {
    localId = signInData.localId;
    idToken = signInData.idToken;
    isExistingAccount = true;
    console.log(`✅ Existing account found for "${email}" (UID: ${localId}).`);
    console.log('🔒 Existing password preserved without changes.');
  } else {
    // Sign-in failed. Check if account does not exist or if password was incorrect
    const errorMsg = signInData.error?.message || '';

    // If account doesn't exist, try to create it
    console.log(`ℹ️ Account not signed in (${errorMsg}). Checking if account needs creation...`);
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true,
        }),
      }
    );

    const signUpData = await signUpRes.json();

    if (signUpData.localId) {
      localId = signUpData.localId;
      idToken = signUpData.idToken;
      console.log(`✅ New Firebase Authentication account created for "${email}" (UID: ${localId}).`);
    } else if (signUpData.error?.message?.includes('EMAIL_EXISTS')) {
      // Account exists, but the password provided during signIn was incorrect!
      throw new Error(
        `Account "${email}" already exists in Firebase Authentication, but the password entered was incorrect. ` +
        `The existing account and password were NOT modified. Please re-run and enter your correct password.`
      );
    } else {
      throw new Error(`Firebase Auth error: ${signUpData.error?.message || 'Unable to authenticate'}`);
    }
  }

  // 2. Assign admin role in Firestore admin_users collection
  console.log(`⏳ Assigning admin role in Firestore "admin_users" collection...`);
  const firestoreDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users/${localId}`;

  const firestoreRes = await fetch(firestoreDocUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        user_id: { stringValue: localId },
        email: { stringValue: email },
        role: { stringValue: 'admin' },
        updated_at: { stringValue: new Date().toISOString() },
        created_at: { stringValue: new Date().toISOString() },
      },
    }),
  });

  const firestoreData = await firestoreRes.json();

  if (firestoreData.error) {
    console.log('\n🔒 As expected by security policy, direct client writes to "admin_users" are prohibited by Firestore Security Rules.');
    console.log(`\nTo finalize admin authorization for ${email} (UID: ${localId}):`);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('• Option 1: Use the trusted Admin SDK script:');
    console.log('  1. Download your service account key from:');
    console.log('     https://console.firebase.google.com/project/' + PROJECT_ID + '/settings/serviceaccounts/adminsdk');
    console.log('  2. Save it as "serviceAccountKey.json" in the project root.');
    console.log('  3. Run: npm run admin:grant');
    console.log('\n• Option 2: Add the admin document directly in Firebase Console:');
    console.log('  1. Open Firestore Database: https://console.firebase.google.com/project/' + PROJECT_ID + '/firestore');
    console.log('  2. Create/Open collection: "admin_users"');
    console.log('  3. Click "Add document" with Document ID: ' + localId);
    console.log('  4. Add fields:');
    console.log('     - user_id (string): ' + localId);
    console.log('     - email (string): ' + email);
    console.log('     - role (string): admin');
    console.log('     - created_at (string): ' + new Date().toISOString());
    console.log('─────────────────────────────────────────────────────────────────\n');
    return { success: true, localId, partial: true };
  }

  console.log(`✅ Admin record securely assigned in Firestore "admin_users/${localId}".`);

  // 3. Verify admin access
  console.log('⏳ Verifying admin authorization...');
  const verifyRes = await fetch(firestoreDocUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const verifyData = await verifyRes.json();

  if (verifyData.fields?.user_id?.stringValue === localId) {
    console.log('\n🎉 Verification successful! Admin account is fully authorized and operational.\n');
    console.log('───────────────────────────────────────────────────────');
    console.log(`  Admin Email : ${email}`);
    console.log(`  Admin UID   : ${localId}`);
    console.log(`  Admin Role  : admin`);
    console.log(`  Account Type: ${isExistingAccount ? 'Existing account (password preserved)' : 'Newly created'}`);
    console.log(`  Access URL  : http://localhost:4173/admin/login`);
    console.log('───────────────────────────────────────────────────────\n');
    return { success: true, localId };
  } else {
    console.log('ℹ️ Admin record written. Please verify the admin document in Firebase Console.');
    return { success: true, localId };
  }
}

// Main interactive CLI entry point
async function main() {
  console.log('=======================================================');
  console.log('        Rankify Admin Account Setup Tool              ');
  console.log('=======================================================');
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  console.log('Please enter the password for this account.');
  console.log('• If this account exists, its password will NOT be changed.');
  console.log('• Keystrokes are masked (*). Password is NEVER committed.\n');

  let password = await promptPassword(`Enter password for ${ADMIN_EMAIL}: `);

  if (!password) {
    console.error('\n❌ No password entered. Setup aborted.');
    process.exit(1);
  }

  try {
    const result = await setupAdmin(ADMIN_EMAIL, password);
    // Explicitly overwrite password from memory
    password = ' '.repeat(password.length);
    if (!result.success && !result.partial) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Setup error:', err.message);
    process.exit(1);
  }
}

main();
