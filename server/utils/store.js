const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "store.json");

function readStore() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(raw);
}

function writeStore(next) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2));
}

function updateStore(mutator) {
  const current = readStore();
  const next = mutator(structuredClone(current)) || current;
  next.updatedAt = new Date().toISOString();
  writeStore(next);
  return next;
}

module.exports = {
  readStore,
  writeStore,
  updateStore,
};
