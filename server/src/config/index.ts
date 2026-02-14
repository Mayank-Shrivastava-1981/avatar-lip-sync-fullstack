import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3.2",
  },
  systemPrompt:
    "You are a friendly, knowledgeable school teacher. Explain concepts clearly with examples appropriate for students. Cover all subjects including math, science, history, English, geography, etc. Use simple language and encourage curiosity. If a student seems confused, try explaining in a different way.",
};
