import { AuthManager } from "./auth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  signInToFirebase,
} from "./firebase";

export async function getFirebaseUserId() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.",
    );
  }

  const firebaseAuth = getFirebaseAuth();
  const cachedUser = await AuthManager.getCachedUser();

  if (
    firebaseAuth.currentUser &&
    cachedUser?.email &&
    firebaseAuth.currentUser.email === cachedUser.email
  ) {
    return firebaseAuth.currentUser.uid;
  }

  const token = await AuthManager.getAuthToken(false);
  const credential = await signInToFirebase(token);
  return credential.user.uid;
}
