const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const sharp = require("sharp");
const { readStore, updateStore, readFirestoreMedia, upsertFirestoreMediaItem, removeFirestoreMediaItem } = require("./utils/store");
const { comparePassword, signToken, verifyToken } = require("./utils/auth");
const { getFirebaseConfig, getFirebaseServices } = require("./utils/firebaseAdmin");
const { getCloudinaryConfig, uploadBuffer, destroyAsset } = require("./utils/cloudinary");

const app = express();
const PORT = process.env.PORT || 4000;
const clients = new Set();

const upload = multer({ storage: multer.memoryStorage() });

function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

async function fileToDataUrl(file) {
  const optimized = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer();

  return `data:image/webp;base64,${optimized.toString("base64")}`;
}

function sanitizeMediaItem(item) {
  if (!item) return item;
  const { assetData, ...rest } = item;
  return rest;
}

function broadcast(type, payload) {
  const body = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(body);
}

function sanitizeStore(store) {
  const { adminUser, messages, ...rest } = store;
  return {
    ...rest,
    media: Array.isArray(rest.media) ? rest.media.map(sanitizeMediaItem) : [],
  };
}

function dashboardStats(store) {
  return {
    totalProjects: store.projects.length,
    skillsCount: store.skills.length,
    messagesReceived: store.messages.length,
    lastUpdatedTime: store.updatedAt,
  };
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function uploadToCloudinary(file) {
  return uploadBuffer(file);
}

async function uploadToFirebaseStorage(file) {
  const services = getFirebaseServices();
  if (!services.storageConfigured || !services.bucket) {
    throw new Error("Firebase Storage is not configured");
  }

  const extension = path.extname(file.originalname || "") || ".bin";
  const baseName = path
    .basename(file.originalname || "upload", extension)
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 60);
  const storagePath = `portfolio-media/${Date.now()}-${baseName || "asset"}${extension}`;
  const object = services.bucket.file(storagePath);

  await object.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    resumable: false,
  });

  const [url] = await object.getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });

  return {
    url,
    storagePath,
  };
}

function createListHandlers(key) {
  return {
    list: asyncHandler(async (_req, res) => {
      const store = await readStore();
      res.json(store[key]);
    }),
    create: asyncHandler(async (req, res) => {
      const item = { id: createId(key), ...req.body };
      const store = await updateStore((current) => {
        current[key].push(item);
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.status(201).json(item);
    }),
    update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      let updated = null;
      const store = await updateStore((current) => {
        current[key] = current[key].map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...req.body };
          return updated;
        });
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.json(updated);
    }),
    remove: asyncHandler(async (req, res) => {
      const store = await updateStore((current) => {
        current[key] = current[key].filter((item) => item.id !== req.params.id);
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.json({ success: true });
    }),
  };
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  const firebase = getFirebaseConfig();
  const cloudinary = getCloudinaryConfig();
  const firebaseServices = getFirebaseServices();

  res.json({
    ok: true,
    firebaseConfigured: firebase.configured,
    firebaseStorageConfigured: firebaseServices.storageConfigured,
    cloudinaryConfigured: cloudinary.configured,
    persistenceMode: firebase.configured && cloudinary.configured ? "firestore-with-cloudinary-fallback" : firebase.configured ? "firestore" : cloudinary.configured ? "cloudinary" : "json-fallback",
  });
});

app.get("/api/portfolio/public", asyncHandler(async (_req, res) => {
  const store = await readStore();
  res.json(sanitizeStore(store));
}));

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  clients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write("event: heartbeat\ndata: {}\n\n");
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const store = await readStore();
  if (username !== store.adminUser.username) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await comparePassword(password, store.adminUser.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    token: signToken({ username }),
    user: { username },
  });
}));

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: { username: req.user.username } });
});

app.post("/api/auth/logout", authMiddleware, (_req, res) => {
  res.json({ success: true });
});

app.get("/api/dashboard/stats", authMiddleware, asyncHandler(async (_req, res) => {
  const store = await readStore();
  res.json(dashboardStats(store));
}));

app.get("/api/admin/content", authMiddleware, asyncHandler(async (_req, res) => {
  const store = await readStore();
  res.json(sanitizeStore(store));
}));

app.put("/api/profile", authMiddleware, asyncHandler(async (req, res) => {
  const store = await updateStore((current) => {
    current.profile = { ...current.profile, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.profile);
}));

app.put("/api/theme", authMiddleware, asyncHandler(async (req, res) => {
  const store = await updateStore((current) => {
    current.theme = { ...current.theme, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.theme);
}));

app.put("/api/site-config", authMiddleware, asyncHandler(async (req, res) => {
  const store = await updateStore((current) => {
    current.siteConfig = { ...current.siteConfig, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.siteConfig);
}));

app.put("/api/sections", authMiddleware, asyncHandler(async (req, res) => {
  const store = await updateStore((current) => {
    current.sections = { ...current.sections, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.sections);
}));

app.get("/api/settings", authMiddleware, asyncHandler(async (_req, res) => {
  const store = await readStore();
  res.json(store.settings);
}));

app.put("/api/settings", authMiddleware, asyncHandler(async (req, res) => {
  const store = await updateStore((current) => {
    current.settings = { ...current.settings, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.settings);
}));

const skillsApi = createListHandlers("skills");
const servicesApi = createListHandlers("services");
const experiencesApi = createListHandlers("experiences");
const projectsApi = createListHandlers("projects");
const achievementsApi = createListHandlers("achievements");

app.get("/api/skills", authMiddleware, skillsApi.list);
app.post("/api/skills", authMiddleware, skillsApi.create);
app.put("/api/skills/:id", authMiddleware, skillsApi.update);
app.delete("/api/skills/:id", authMiddleware, skillsApi.remove);

app.get("/api/services", authMiddleware, servicesApi.list);
app.post("/api/services", authMiddleware, servicesApi.create);
app.put("/api/services/:id", authMiddleware, servicesApi.update);
app.delete("/api/services/:id", authMiddleware, servicesApi.remove);

app.get("/api/experiences", authMiddleware, experiencesApi.list);
app.post("/api/experiences", authMiddleware, experiencesApi.create);
app.put("/api/experiences/:id", authMiddleware, experiencesApi.update);
app.delete("/api/experiences/:id", authMiddleware, experiencesApi.remove);

app.get("/api/projects", authMiddleware, projectsApi.list);
app.post("/api/projects", authMiddleware, projectsApi.create);
app.put("/api/projects/:id", authMiddleware, projectsApi.update);
app.delete("/api/projects/:id", authMiddleware, projectsApi.remove);

app.get("/api/achievements", authMiddleware, achievementsApi.list);
app.post("/api/achievements", authMiddleware, achievementsApi.create);
app.put("/api/achievements/:id", authMiddleware, achievementsApi.update);
app.delete("/api/achievements/:id", authMiddleware, achievementsApi.remove);

app.get("/api/media", authMiddleware, asyncHandler(async (_req, res) => {
  const services = getFirebaseServices();
  if (services.configured) {
    try {
      const mediaItems = await readFirestoreMedia(services);
      return res.json(mediaItems.map(sanitizeMediaItem));
    } catch (error) {
      if (!String(error?.message || "").includes("NOT_FOUND")) {
        throw error;
      }
    }
  }

  const store = await readStore();
  res.json((store.media || []).map(sanitizeMediaItem));
}));

app.get("/api/media/file/:id", asyncHandler(async (req, res) => {
  const services = getFirebaseServices();
  let mediaItem = null;

  if (services.configured) {
    const snapshot = await services.db.collection("portfolioCmsMedia").doc(req.params.id).get();
    if (snapshot.exists) {
      mediaItem = snapshot.data();
    }
  }

  if (!mediaItem) {
    const store = await readStore();
    mediaItem = (store.media || []).find((item) => item.id === req.params.id);
  }

  if (!mediaItem?.assetData && typeof mediaItem?.url === "string" && mediaItem.url.startsWith("data:image/")) {
    mediaItem = { ...mediaItem, assetData: mediaItem.url };
  }

  if (!mediaItem?.assetData) {
    return res.status(404).send("Not found");
  }

  const match = mediaItem.assetData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).send("Invalid media data");
  }

  const [, mimeType, base64] = match;
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(base64, "base64"));
}));

app.post("/api/media/upload", authMiddleware, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  if (!req.file.mimetype?.startsWith("image/")) {
    return res.status(400).json({ message: "Only image uploads are supported" });
  }

  const mediaId = createId("media");
  let uploaded = null;
  let provider = "firebase";

  try {
    uploaded = await uploadToFirebaseStorage(req.file);
  } catch (error) {
    const cloudinary = getCloudinaryConfig();
    if (cloudinary.configured) {
      uploaded = await uploadToCloudinary(req.file);
      provider = "cloudinary";
    } else {
      uploaded = { url: await fileToDataUrl(req.file), publicId: null, storagePath: null };
      provider = "inline";
    }
  }

  const media = {
    id: mediaId,
    name: req.file.originalname,
    url: provider === "inline" ? `/api/media/file/${mediaId}` : uploaded.url,
    type: provider === "inline" ? "image/webp" : req.file.mimetype,
    createdAt: new Date().toISOString(),
    provider,
    publicId: uploaded.publicId || null,
    storagePath: uploaded.storagePath || null,
    assetData: provider === "inline" ? uploaded.url : null,
  };

  const services = getFirebaseServices();
  if (services.configured) {
    await upsertFirestoreMediaItem(services, media);
  } else {
    const store = await updateStore((current) => {
      current.media.unshift(media);
      return current;
    });
    broadcast("portfolio:update", sanitizeStore(store));
  }

  const nextStore = await readStore();
  broadcast("portfolio:update", sanitizeStore(nextStore));
  res.status(201).json(sanitizeMediaItem(media));
}));

app.delete("/api/media/:id", authMiddleware, asyncHandler(async (req, res) => {
  const store = await readStore();
  const media = store.media.find((item) => item.id === req.params.id);
  if (!media) return res.status(404).json({ message: "Not found" });

  if (media.provider === "firebase" && media.storagePath) {
    const services = getFirebaseServices();
    if (services.storageConfigured && services.bucket) {
      await services.bucket.file(media.storagePath).delete({ ignoreNotFound: true });
    }
  }

  if (media.provider === "cloudinary" && media.publicId) {
    await destroyAsset(media.publicId);
  }

  const services = getFirebaseServices();
  if (services.configured) {
    await removeFirestoreMediaItem(services, req.params.id);
  } else {
    await updateStore((current) => {
      current.media = current.media.filter((item) => item.id !== req.params.id);
      return current;
    });
  }

  const nextStore = await readStore();
  broadcast("portfolio:update", sanitizeStore(nextStore));
  res.json({ success: true });
}));

app.get("/api/messages", authMiddleware, asyncHandler(async (_req, res) => {
  const store = await readStore();
  res.json(store.messages);
}));

app.post("/api/contact", asyncHandler(async (req, res) => {
  const message = {
    id: createId("message"),
    name: req.body.name,
    email: req.body.email,
    message: req.body.message,
    createdAt: new Date().toISOString(),
  };
  const next = await updateStore((current) => {
    current.messages.unshift(message);
    return current;
  });
  broadcast("messages:update", { count: next.messages.length });
  res.status(201).json({ success: true });
}));

app.delete("/api/messages/:id", authMiddleware, asyncHandler(async (req, res) => {
  await updateStore((current) => {
    current.messages = current.messages.filter((item) => item.id !== req.params.id);
    return current;
  });
  res.json({ success: true });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
