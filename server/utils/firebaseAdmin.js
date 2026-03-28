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
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  const configured = Boolean(projectId && clientEmail && privateKey);
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
    storageBucket: config.storageBucket || undefined,
  });
}

function getFirebaseServices() {
  const config = getFirebaseConfig();
  const app = getFirebaseApp();
  if (!app) {
    return {
      app: null,
      db: null,
      storage: null,
      bucket: null,
      configured: false,
      storageConfigured: false,
    };
  }

  const storage = getStorage(app);
  const bucket = config.storageBucket ? storage.bucket(config.storageBucket) : null;

  return {
    app,
    db: getFirestore(app),
    storage,
    bucket,
    configured: true,
    storageConfigured: Boolean(bucket),
  };
}

module.exports = {
  getFirebaseConfig,
  getFirebaseServices,
};
