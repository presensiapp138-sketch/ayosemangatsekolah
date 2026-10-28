/**
 * Firebase Client Auth & Google Workspace OAuth Integration
 * Digunakan untuk menghubungkan akun Google sekolah (Drive & Sheets)
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
// Request offline access prompt to ensure permissions are refreshed
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in via Firebase without OAuth pop-up credential in current session
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const isPopupBlockedError = (err: any): boolean => {
  if (!err) return false;
  const code = err.code || '';
  const msg = String(err.message || '');
  return code === 'auth/popup-blocked' || msg.includes('popup-blocked') || code === 'auth/cancelled-popup-request';
};

export const googleSignIn = async (): Promise<{ user: User | null; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token Google');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = String(error?.message || '');
    if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
      console.warn('Popup login Google diblokir oleh peramban atau lingkungan iframe. Sistem akan melanjutkan otomatis tanpa error popup.');
      const friendlyErr: any = new Error('Popup autentikasi diblokir peramban. Sistem melanjutkan otomatis.');
      friendlyErr.code = 'auth/popup-blocked';
      friendlyErr.isPopupBlocked = true;
      throw friendlyErr;
    }
    if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
      const friendlyErr: any = new Error('Jendela masuk Google ditutup.');
      friendlyErr.code = code;
      friendlyErr.isCancelled = true;
      throw friendlyErr;
    }
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

