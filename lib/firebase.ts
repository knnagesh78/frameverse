import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const hasFirebaseConfig = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const app = hasFirebaseConfig ? (getApps().length ? getApp() : initializeApp(config)) : null;
const inBrowser = typeof window !== "undefined";

export const firebaseConfigured = Boolean(app);
export const analytics = app && inBrowser && config.measurementId
  ? isSupported().then(supported => supported ? getAnalytics(app) : null).catch(() => null)
  : Promise.resolve(null);
export const auth = app && inBrowser ? getAuth(app) : null;
export const firestore = app && inBrowser ? getFirestore(app) : null;
export const realtimeDatabase = app && inBrowser && config.databaseURL ? getDatabase(app) : null;
export const storage = app && inBrowser ? getStorage(app) : null;

export const firebaseConfigStatus = {
  configured: firebaseConfigured,
  realtimeDatabaseConfigured: Boolean(realtimeDatabase),
};
