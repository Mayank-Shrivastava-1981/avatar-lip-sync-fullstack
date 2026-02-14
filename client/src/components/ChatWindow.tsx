import { useEffect, useRef } from "react";
import type { Message } from "../types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  streamingContent: string;
}

export default function ChatWindow({ messages, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="chat-window">
      {messages.length === 0 && !streamingContent && (
        <div className="welcome-message">
          <h2>Welcome to AI Teacher!</h2>
          <p>Ask me anything about math, science, history, English, geography, or any other subject. I'm here to help you learn!</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {streamingContent && (
        <div className="message-bubble assistant">
          <div className="message-avatar">Teacher</div>
          <div className="message-content">
            <p>{streamingContent}<span className="cursor">|</span></p>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
