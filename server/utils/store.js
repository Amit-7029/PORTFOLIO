const fs = require("fs");
const path = require("path");
const { getFirebaseServices } = require("./firebaseAdmin");
const { getCloudinaryConfig, readJsonAsset, uploadJsonAsset } = require("./cloudinary");
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

function mergeWithSeed(source, seed) {
  if (Array.isArray(seed)) {
    return Array.isArray(source) ? source : structuredClone(seed);
  }

  if (seed && typeof seed === "object") {
    const next = {};
    const sourceValue = source && typeof source === "object" ? source : {};
    const keys = new Set([...Object.keys(seed), ...Object.keys(sourceValue)]);

    for (const key of keys) {
      if (!(key in sourceValue)) {
        next[key] = structuredClone(seed[key]);
        continue;
      }

      if (!(key in seed)) {
        next[key] = sourceValue[key];
        continue;
      }

      next[key] = mergeWithSeed(sourceValue[key], seed[key]);
    }

    return next;
  }

  return source ?? seed;
}

function normalizeStore(store) {
  return mergeWithSeed(store, readJsonSeed());
}

function isFirestoreUnavailable(error) {
  const message = error?.message || "";
  return message.includes("5 NOT_FOUND") || message.includes("The database") || message.includes("Could not load the default credentials");
}

async function readStore() {
  const services = getFirebaseServices();
  const cloudinary = getCloudinaryConfig();

  if (services.configured) {
    try {
      const docRef = services.db.collection(COLLECTION).doc(DOC_ID);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        const seed = readJsonSeed();
        await docRef.set(seed);
        return seed;
      }

      return normalizeStore(snapshot.data());
    } catch (error) {
      if (!isFirestoreUnavailable(error)) {
        throw error;
      }
    }
  }

  if (cloudinary.configured) {
    const remote = await readJsonAsset();
    if (remote) {
      return normalizeStore(remote);
    }
  }

  return normalizeStore(readJsonSeed());
}

async function writeStore(next) {
  const normalized = normalizeStore(next);
  const services = getFirebaseServices();
  const cloudinary = getCloudinaryConfig();

  if (services.configured) {
    try {
      await services.db.collection(COLLECTION).doc(DOC_ID).set(normalized);
      return normalized;
    } catch (error) {
      if (!isFirestoreUnavailable(error)) {
        throw error;
      }
    }
  }

  if (cloudinary.configured) {
    await uploadJsonAsset(normalized);
    return normalized;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(normalized, null, 2));
  return normalized;
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
