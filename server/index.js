const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { randomUUID } = require("node:crypto");
const { readStore, updateStore } = require("./utils/store");
const { comparePassword, signToken, verifyToken } = require("./utils/auth");
const { getFirebaseConfig } = require("./utils/firebaseAdmin");
const { getCloudinaryConfig, uploadBuffer, destroyAsset } = require("./utils/cloudinary");

const app = express();
const PORT = process.env.PORT || 4000;
const clients = new Set();

const upload = multer({ storage: multer.memoryStorage() });

function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function broadcast(type, payload) {
  const body = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(body);
}

function sanitizeStore(store) {
  const { adminUser, messages, ...rest } = store;
  return rest;
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
  res.json({
    ok: true,
    firebaseConfigured: getFirebaseConfig().configured,
    cloudinaryConfigured: getCloudinaryConfig().configured,
    persistenceMode: getFirebaseConfig().configured ? "firestore" : "json-fallback",
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
const experiencesApi = createListHandlers("experiences");
const projectsApi = createListHandlers("projects");
const achievementsApi = createListHandlers("achievements");

app.get("/api/skills", authMiddleware, skillsApi.list);
app.post("/api/skills", authMiddleware, skillsApi.create);
app.put("/api/skills/:id", authMiddleware, skillsApi.update);
app.delete("/api/skills/:id", authMiddleware, skillsApi.remove);

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
  const store = await readStore();
  res.json(store.media);
}));

app.post("/api/media/upload", authMiddleware, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  if (!req.file.mimetype?.startsWith("image/")) {
    return res.status(400).json({ message: "Only image uploads are supported" });
  }

  const uploaded = await uploadToCloudinary(req.file);
  const media = {
    id: createId("media"),
    name: req.file.originalname,
    url: uploaded.url,
    type: req.file.mimetype,
    createdAt: new Date().toISOString(),
    provider: "cloudinary",
    publicId: uploaded.publicId,
  };

  const store = await updateStore((current) => {
    current.media.unshift(media);
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.status(201).json(media);
}));

app.delete("/api/media/:id", authMiddleware, asyncHandler(async (req, res) => {
  const store = await readStore();
  const media = store.media.find((item) => item.id === req.params.id);
  if (!media) return res.status(404).json({ message: "Not found" });

  if (media.provider === "cloudinary" && media.publicId) {
    await destroyAsset(media.publicId);
  }

  const next = await updateStore((current) => {
    current.media = current.media.filter((item) => item.id !== req.params.id);
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(next));
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
