import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth/web-extension";
import { getFirestore } from "firebase/firestore/lite";

function getEnvVar(key: keyof ImportMetaEnv) {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : "";
}

const firebaseEnv = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID"),
};

const firebaseConfig: FirebaseOptions = {
  ...firebaseEnv,
};

export function isFirebaseConfigured() {
  return (
    firebaseEnv.apiKey.length > 0 &&
    firebaseEnv.authDomain.length > 0 &&
    firebaseEnv.projectId.length > 0 &&
    firebaseEnv.appId.length > 0
  );
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.",
    );
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

export async function signInToFirebase(chromeOAuthToken: string) {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return { user: auth.currentUser };
  }

  const credential = GoogleAuthProvider.credential(null, chromeOAuthToken);
  return signInWithCredential(auth, credential);
}

export async function signOutFromFirebase() {
  if (!isFirebaseConfigured()) {
    return;
  }

  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    return;
  }

  await signOut(auth);
}
