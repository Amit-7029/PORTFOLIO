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

async function readStore() {
  const services = getFirebaseServices();
  if (!services.configured) {
    return readJsonSeed();
  }

  const docRef = services.db.collection(COLLECTION).doc(DOC_ID);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    const seed = readJsonSeed();
    await docRef.set(seed);
    return seed;
  }

  return snapshot.data();
}

async function writeStore(next) {
  const services = getFirebaseServices();
  if (!services.configured) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2));
    return next;
  }

  await services.db.collection(COLLECTION).doc(DOC_ID).set(next);
  return next;
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
