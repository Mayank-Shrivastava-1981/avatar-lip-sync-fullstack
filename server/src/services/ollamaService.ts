import { config } from "../config/index.js";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaStreamChunk {
  message?: { content: string };
  done: boolean;
}

export async function streamChat(
  messages: OllamaMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(
      `${config.ollama.baseUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.ollama.model,
          messages,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk: OllamaStreamChunk = JSON.parse(line);
        if (chunk.message?.content) {
          onChunk(chunk.message.content);
        }
        if (chunk.done) {
          onDone();
          return;
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
