const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { nanoid } = require("nanoid");
const { readStore, updateStore } = require("./utils/store");
const { comparePassword, signToken, verifyToken } = require("./utils/auth");

const app = express();
const PORT = process.env.PORT || 4000;
const uploadsDir = path.join(__dirname, "uploads");
const clients = new Set();

function broadcast(type, payload) {
  const body = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(body);
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

function createListHandlers(key) {
  return {
    list: (_req, res) => res.json(readStore()[key]),
    create: (req, res) => {
      const item = { id: `${key}_${nanoid(8)}`, ...req.body };
      const store = updateStore((current) => {
        current[key].push(item);
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.status(201).json(item);
    },
    update: (req, res) => {
      const { id } = req.params;
      let updated = null;
      const store = updateStore((current) => {
        current[key] = current[key].map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...req.body };
          return updated;
        });
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.json(updated);
    },
    remove: (req, res) => {
      const store = updateStore((current) => {
        current[key] = current[key].filter((item) => item.id !== req.params.id);
        return current;
      });
      broadcast("portfolio:update", sanitizeStore(store));
      res.json({ success: true });
    },
  };
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/uploads/:name", (req, res) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.name));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  return res.sendFile(filePath);
});

app.get("/api/portfolio/public", (_req, res) => {
  res.json(sanitizeStore(readStore()));
});

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

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const store = readStore();
  if (username !== store.adminUser.username) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await comparePassword(password, store.adminUser.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    token: signToken({ username }),
    user: { username },
  });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: { username: req.user.username } });
});

app.post("/api/auth/logout", authMiddleware, (_req, res) => {
  res.json({ success: true });
});

app.get("/api/dashboard/stats", authMiddleware, (_req, res) => {
  res.json(dashboardStats(readStore()));
});

app.get("/api/admin/content", authMiddleware, (_req, res) => {
  res.json(sanitizeStore(readStore()));
});

app.put("/api/profile", authMiddleware, (req, res) => {
  const store = updateStore((current) => {
    current.profile = { ...current.profile, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.profile);
});

app.put("/api/theme", authMiddleware, (req, res) => {
  const store = updateStore((current) => {
    current.theme = { ...current.theme, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.theme);
});

app.get("/api/settings", authMiddleware, (_req, res) => {
  res.json(readStore().settings);
});

app.put("/api/settings", authMiddleware, (req, res) => {
  const store = updateStore((current) => {
    current.settings = { ...current.settings, ...req.body };
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.json(store.settings);
});

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

app.get("/api/media", authMiddleware, (_req, res) => {
  res.json(readStore().media);
});

app.post("/api/media/upload", authMiddleware, upload.single("file"), (req, res) => {
  const file = req.file;
  const media = {
    id: `media_${nanoid(8)}`,
    name: file.filename,
    url: `/uploads/${file.filename}`,
    type: file.mimetype,
    createdAt: new Date().toISOString(),
  };
  const store = updateStore((current) => {
    current.media.unshift(media);
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(store));
  res.status(201).json(media);
});

app.delete("/api/media/:id", authMiddleware, (req, res) => {
  const store = readStore();
  const media = store.media.find((item) => item.id === req.params.id);
  if (!media) return res.status(404).json({ message: "Not found" });

  const filePath = path.join(uploadsDir, path.basename(media.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const next = updateStore((current) => {
    current.media = current.media.filter((item) => item.id !== req.params.id);
    return current;
  });
  broadcast("portfolio:update", sanitizeStore(next));
  res.json({ success: true });
});

app.get("/api/messages", authMiddleware, (_req, res) => {
  res.json(readStore().messages);
});

app.post("/api/contact", (req, res) => {
  const message = {
    id: `message_${nanoid(8)}`,
    name: req.body.name,
    email: req.body.email,
    message: req.body.message,
    createdAt: new Date().toISOString(),
  };
  const next = updateStore((current) => {
    current.messages.unshift(message);
    return current;
  });
  broadcast("messages:update", { count: next.messages.length });
  res.status(201).json({ success: true });
});

app.delete("/api/messages/:id", authMiddleware, (req, res) => {
  updateStore((current) => {
    current.messages = current.messages.filter((item) => item.id !== req.params.id);
    return current;
  });
  res.json({ success: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
