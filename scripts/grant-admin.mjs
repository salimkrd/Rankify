import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const TARGET_EMAIL = process.argv[2] || 'salimkrd01@gmail.com';

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

// Find service account JSON
function findServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return JSON.parse(fs.readFileSync(envPath, 'utf8'));
  }

  // Look in root directory for serviceAccount*.json
  const files = fs.readdirSync(rootDir);
  const saFile = files.find(
    (f) => f.endsWith('.json') && (f.includes('serviceAccount') || f.includes('firebase-adminsdk') || f.includes('rankify-4b819'))
  );

  if (saFile) {
    const fullPath = path.join(rootDir, saFile);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }

  return null;
}

async function main() {
  console.log('=======================================================');
  console.log('    Rankify Trusted Firebase Admin Role Provisioner    ');
  console.log('=======================================================');
  console.log(`Target Admin Email: ${TARGET_EMAIL}\n`);

  const serviceAccount = findServiceAccount();

  if (!serviceAccount) {
    console.error('❌ Service Account Credentials Not Found.\n');
    console.log('The Firebase Admin SDK requires service account credentials to execute trusted backend actions.');
    console.log('Prerequisites:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/rankify-4b819/settings/serviceaccounts/adminsdk');
    console.log('2. Click "Generate new private key" to download the service account JSON.');
    console.log('3. Save it in the project root as "serviceAccountKey.json" (it is ignored in .gitignore).');
    console.log('   OR set $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"\n');
    console.log('-------------------------------------------------------');
    console.log('Alternative: If you do not wish to download a service account key,');
    console.log('you can assign the admin role directly in the Firebase Console:');
    console.log('1. Firebase Console > Authentication > Users: Copy the UID for salimkrd01@gmail.com.');
    console.log('2. Firestore Database > Collection "admin_users" > Add document with ID = [UID]:');
    console.log('   - user_id: [UID]');
    console.log(`   - email: ${TARGET_EMAIL}`);
    console.log('   - role: admin');
    console.log('-------------------------------------------------------\n');
    process.exit(1);
  }

  // Initialize Admin App
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'rankify-4b819',
  });

  const auth = admin.auth();
  const db = admin.firestore();

  let user = null;
  try {
    user = await auth.getUserByEmail(TARGET_EMAIL);
    console.log(`✅ Found existing Firebase Auth account for "${TARGET_EMAIL}" (UID: ${user.uid}).`);
    console.log('🔒 Existing account password remains unchanged.');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`ℹ️ Account "${TARGET_EMAIL}" does not exist yet in Firebase Authentication.`);
      console.log('Please enter a password to create the new account.');
      console.log('(Keystrokes will be masked with * and never logged or committed)\n');

      const password = await promptPassword(`Enter password for ${TARGET_EMAIL}: `);
      if (!password || password.length < 6) {
        console.error('❌ Password must be at least 6 characters. Aborted.');
        process.exit(1);
      }

      user = await auth.createUser({
        email: TARGET_EMAIL,
        password: password,
        emailVerified: true,
      });
      console.log(`✅ Created new Firebase Auth account for "${TARGET_EMAIL}" (UID: ${user.uid}).`);
    } else {
      console.error('❌ Error fetching user:', err.message);
      process.exit(1);
    }
  }

  // 1. Assign Custom Claim (admin: true)
  console.log(`⏳ Setting Custom User Claims { admin: true } on Firebase Auth token...`);
  await auth.setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
  console.log(`✅ Custom claims successfully assigned on user token.`);

  // 2. Write to Firestore admin_users directory collection
  console.log(`⏳ Writing admin document to Firestore collection "admin_users/${user.uid}"...`);
  await db.collection('admin_users').doc(user.uid).set(
    {
      user_id: user.uid,
      email: TARGET_EMAIL,
      role: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log(`✅ Firestore "admin_users" document created/updated.`);

  console.log('\n🎉 Admin Provisioning Complete!');
  console.log('───────────────────────────────────────────────────────');
  console.log(`  Admin Email  : ${TARGET_EMAIL}`);
  console.log(`  Admin UID    : ${user.uid}`);
  console.log(`  Custom Claim : admin=true`);
  console.log(`  Firestore Doc: admin_users/${user.uid}`);
  console.log(`  Admin Login  : http://localhost:4173/admin/login`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
