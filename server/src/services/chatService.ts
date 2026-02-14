import { v4 as uuidv4 } from "uuid";
import { config } from "../config/index.js";
import type { OllamaMessage } from "./ollamaService.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const sessions = new Map<string, ChatSession>();

export function createSession(): ChatSession {
  const session: ChatSession = {
    id: uuidv4(),
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

export function getAllSessions(): ChatSession[] {
  return Array.from(sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function addMessage(sessionId: string, role: "user" | "assistant", content: string): void {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  session.messages.push({ role, content, timestamp: Date.now() });

  if (session.title === "New Chat" && role === "user") {
    session.title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
  }
}

export function buildOllamaMessages(session: ChatSession): OllamaMessage[] {
  const messages: OllamaMessage[] = [
    { role: "system", content: config.systemPrompt },
  ];
  for (const msg of session.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }
  return messages;
}
