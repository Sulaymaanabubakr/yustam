import admin from 'firebase-admin';
import { env } from './env';

let app: admin.app.App;

export const getFirebaseApp = () => {
  if (app) {
    return app;
  }

  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    databaseURL: env.FIREBASE_DATABASE_URL,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });

  return app;
};

export const getFirebaseAuth = () => getFirebaseApp().auth();
export const getFirestore = () => getFirebaseApp().firestore();