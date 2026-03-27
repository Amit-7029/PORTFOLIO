import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../server/index.js");
const serverless = require("serverless-http");

const handler = serverless(app);

export default handler;
