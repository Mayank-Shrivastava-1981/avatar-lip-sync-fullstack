import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "./config/index.js";
import chatRoutes from "./routes/chatRoutes.js";
import didRoutes from "./routes/didRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());

const basicAuth = Buffer.from(config.did.apiKey).toString("base64");

// D-ID REST API proxy — injects Basic auth
app.use(
  "/d-id-proxy",
  createProxyMiddleware({
    target: "https://api.d-id.com",
    changeOrigin: true,
    pathRewrite: { "^/d-id-proxy": "" },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("Authorization", `Basic ${basicAuth}`);
      },
    },
  })
);

// D-ID WebSocket proxy — rewrites auth to use server-side API key
app.use(
  "/d-id-ws",
  createProxyMiddleware({
    target: "wss://notifications.d-id.com",
    changeOrigin: true,
    ws: true,
    pathRewrite: (_path, req) => {
      // Replace whatever auth the SDK sent with our Basic auth
      const url = new URL(req.url || "/", "http://localhost");
      url.searchParams.set("authorization", `Basic ${basicAuth}`);
      return `${url.pathname}${url.search}`;
    },
  })
);

app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/did", didRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Ollama endpoint: ${config.ollama.baseUrl}`);
  console.log(`Model: ${config.ollama.model}`);
});

// Enable WebSocket proxying on the HTTP server
server.on("upgrade", (req, socket, head) => {
  // The proxy middleware handles the upgrade automatically
  console.log(`WebSocket upgrade request: ${req.url}`);
});
