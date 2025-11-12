import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken as getAppCheckTokenInternal,
  type AppCheck,
} from "firebase/app-check";

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;

function getClientApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (app) return app;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!apiKey || !projectId || !appId) {
    // Allow app to run without Firebase config (dev placeholder).
    return null;
  }
  const cfg = {
    apiKey,
    projectId,
    appId,
    ...(authDomain ? { authDomain } : {}),
    ...(measurementId ? { measurementId } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(storageBucket ? { storageBucket } : {}),
  };
  app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  return app;
}

function getClientAppCheck(): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (appCheck) return appCheck;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
  const clientApp = getClientApp();
  if (!clientApp || !siteKey) return null;
  appCheck = initializeAppCheck(clientApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

export async function getAppCheckToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const ac = getClientAppCheck();
  if (!ac) return null;
  try {
    const { token } = await getAppCheckTokenInternal(ac, false);
    return token ?? null;
  } catch {
    return null;
  }
}


