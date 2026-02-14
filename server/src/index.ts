import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Ollama endpoint: ${config.ollama.baseUrl}`);
  console.log(`Model: ${config.ollama.model}`);
});
