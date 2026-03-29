const fs = require("fs");
const path = require("path");
const { getFirebaseServices } = require("./firebaseAdmin");
const { getCloudinaryConfig, readJsonAsset, uploadJsonAsset } = require("./cloudinary");
const seedStore = require("../data/store.json");

const DATA_PATH = path.join(__dirname, "..", "data", "store.json");
const COLLECTION = "portfolioCms";
const DOC_ID = "content";
const MEDIA_COLLECTION = "portfolioCmsMedia";

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

function splitStore(store) {
  const next = structuredClone(store);
  next.media = Array.isArray(store?.media) ? store.media : [];
  const { media, ...content } = next;
  return { content, media };
}

async function readFirestoreMedia(services) {
  const snapshot = await services.db.collection(MEDIA_COLLECTION).get();
  return snapshot.docs
    .map((doc) => doc.data())
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

async function writeFirestoreStore(services, store) {
  const normalized = normalizeStore(store);
  const { content, media } = splitStore(normalized);
  const batch = services.db.batch();
  const contentRef = services.db.collection(COLLECTION).doc(DOC_ID);
  batch.set(contentRef, content);

  const existingMedia = await services.db.collection(MEDIA_COLLECTION).get();
  for (const doc of existingMedia.docs) {
    batch.delete(doc.ref);
  }

  for (const item of media) {
    const mediaRef = services.db.collection(MEDIA_COLLECTION).doc(item.id);
    batch.set(mediaRef, item);
  }

  await batch.commit();
  return normalized;
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
      const seed = readJsonSeed();

      if (!snapshot.exists) {
        await writeFirestoreStore(services, seed);
        return seed;
      }

      const media = await readFirestoreMedia(services);
      const contentData = snapshot.data();
      if (!media.length && Array.isArray(contentData?.media) && contentData.media.length) {
        const migrated = normalizeStore(contentData);
        await writeFirestoreStore(services, migrated);
        return migrated;
      }

      return normalizeStore({ ...contentData, media });
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
      return await writeFirestoreStore(services, normalized);
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
