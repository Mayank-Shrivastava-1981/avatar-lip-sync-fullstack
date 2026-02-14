import type { Request, Response } from "express";
import {
  createSession,
  getSession,
  getAllSessions,
  addMessage,
  buildOllamaMessages,
} from "../services/chatService.js";
import { streamChat } from "../services/ollamaService.js";

export function handleNewSession(_req: Request, res: Response): void {
  const session = createSession();
  res.json(session);
}

export function handleGetSessions(_req: Request, res: Response): void {
  res.json(getAllSessions());
}

export function handleGetHistory(req: Request, res: Response): void {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
}

export function handleChat(req: Request, res: Response): void {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    res.status(400).json({ error: "sessionId and message are required" });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  addMessage(sessionId, "user", message);
  const ollamaMessages = buildOllamaMessages(session);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  streamChat(
    ollamaMessages,
    (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
    },
    () => {
      addMessage(sessionId, "assistant", fullResponse);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    },
    (error) => {
      res.write(`data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`);
      res.end();
    }
  );
}
