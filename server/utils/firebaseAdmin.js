const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : value;
}

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;

  const configured = Boolean(projectId && clientEmail && privateKey && storageBucket);
  return {
    configured,
    projectId,
    clientEmail,
    privateKey,
    storageBucket,
  };
}

function getFirebaseApp() {
  const config = getFirebaseConfig();
  if (!config.configured) return null;

  if (getApps().length) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
    storageBucket: config.storageBucket,
  });
}

function getFirebaseServices() {
  const app = getFirebaseApp();
  if (!app) {
    return {
      app: null,
      db: null,
      bucket: null,
      configured: false,
    };
  }

  return {
    app,
    db: getFirestore(app),
    bucket: getStorage(app).bucket(),
    configured: true,
  };
}

module.exports = {
  getFirebaseConfig,
  getFirebaseServices,
};
