import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawFirebaseConfig from '@/firebase-applet-config.json';

const defaultFallbackConfig = {
  projectId: "gen-lang-client-0943318734",
  appId: "1:1005270702176:web:db2f5b9d00943259b90b05",
  apiKey: "AIzaSyAc4nUzY7Y8YyyRXQgRZVzUXjsyKDioRXg",
  authDomain: "gen-lang-client-0943318734.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-tandaterimadigit-a3306061-5383-4cf6-95b1-23056f686c5c",
  storageBucket: "gen-lang-client-0943318734.firebasestorage.app",
  messagingSenderId: "1005270702176",
};

export const TARGET_USER_EMAIL = 'hamunaputra89@gmail.com';

const firebaseConfig = { ...defaultFallbackConfig, ...(rawFirebaseConfig || {}) };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore database with safety fallback
let dbInstance: any;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (err) {
  try {
    dbInstance = getFirestore(app);
  } catch (fallbackErr) {
    console.warn('Firestore initialization notice:', fallbackErr);
  }
}
export const db = dbInstance;

export const provider = new GoogleAuthProvider();
// Workspace scopes for Google Sheets and Drive files
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Enforce using the target user account
provider.setCustomParameters({
  login_hint: TARGET_USER_EMAIL,
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

/**
 * Ensures silent background authentication without prompting user login.
 * Allows instant, zero-click auto-sync to Cloud Firestore.
 */
export const ensureSilentAuth = async (): Promise<User | null> => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Silent anonymous auth warning:', err);
    return null;
  }
};

/**
 * Test connection to Firestore as recommended by guidelines
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline.');
    }
  }
}

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onUserDetectedWithoutToken?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  // Trigger silent auth immediately so cloud sync is ready on boot
  ensureSilentAuth();

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!user.isAnonymous) {
        provider.setCustomParameters({
          login_hint: user.email || TARGET_USER_EMAIL,
        });
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onUserDetectedWithoutToken) {
          onUserDetectedWithoutToken(user);
        } else if (!isSigningIn && onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (
  emailHint?: string
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const targetEmail = emailHint || auth.currentUser?.email || TARGET_USER_EMAIL;
    provider.setCustomParameters({
      login_hint: targetEmail,
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  // Re-enable silent anonymous auth so app keeps working
  await ensureSilentAuth();
};
