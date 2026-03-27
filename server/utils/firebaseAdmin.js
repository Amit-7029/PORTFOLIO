const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : value;
}

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const configured = Boolean(projectId && clientEmail && privateKey);
  return {
    configured,
    projectId,
    clientEmail,
    privateKey,
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
  });
}

function getFirebaseServices() {
  const app = getFirebaseApp();
  if (!app) {
    return {
      app: null,
      db: null,
      configured: false,
    };
  }

  return {
    app,
    db: getFirestore(app),
    configured: true,
  };
}

module.exports = {
  getFirebaseConfig,
  getFirebaseServices,
};
