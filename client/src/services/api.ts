import type { ChatSession } from "../types";

export async function createSession(): Promise<ChatSession> {
  const res = await fetch("/api/chat/new", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function getSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/chat/sessions");
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function getSessionHistory(sessionId: string): Promise<ChatSession> {
  const res = await fetch(`/api/chat/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session history");
  return res.json();
}

export async function sendMessage(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!res.ok) {
    onError("Failed to send message");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const data = line.replace(/^data: /, "").trim();
      if (!data) continue;

      const parsed = JSON.parse(data);
      if (parsed.type === "chunk") {
        onChunk(parsed.content);
      } else if (parsed.type === "done") {
        onDone();
        return;
      } else if (parsed.type === "error") {
        onError(parsed.content);
        return;
      }
    }
  }

  onDone();
}
