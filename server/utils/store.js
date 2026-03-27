const fs = require("fs");
const path = require("path");
const { getFirebaseServices } = require("./firebaseAdmin");
const seedStore = require("../data/store.json");

const DATA_PATH = path.join(__dirname, "..", "data", "store.json");
const COLLECTION = "portfolioCms";
const DOC_ID = "content";

function readJsonSeed() {
  if (fs.existsSync(DATA_PATH)) {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  }
  return structuredClone(seedStore);
}

function isFirestoreUnavailable(error) {
  const message = error?.message || "";
  return message.includes("5 NOT_FOUND") || message.includes("The database") || message.includes("Could not load the default credentials");
}

async function readStore() {
  const services = getFirebaseServices();
  if (!services.configured) {
    return readJsonSeed();
  }

  try {
    const docRef = services.db.collection(COLLECTION).doc(DOC_ID);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      const seed = readJsonSeed();
      await docRef.set(seed);
      return seed;
    }

    return snapshot.data();
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      return readJsonSeed();
    }
    throw error;
  }
}

async function writeStore(next) {
  const services = getFirebaseServices();
  if (!services.configured) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2));
    return next;
  }

  try {
    await services.db.collection(COLLECTION).doc(DOC_ID).set(next);
    return next;
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      throw new Error("Firestore database is not ready. Create a Firestore database in Firebase to enable saving from the admin panel.");
    }
    throw error;
  }
}

async function updateStore(mutator) {
  const current = await readStore();
  const next = mutator(structuredClone(current)) || current;
  next.updatedAt = new Date().toISOString();
  await writeStore(next);
  return next;
}

module.exports = {
  readStore,
  writeStore,
  updateStore,
};
