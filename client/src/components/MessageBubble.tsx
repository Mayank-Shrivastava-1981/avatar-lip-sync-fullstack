import type { Message } from "../types";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar">{isUser ? "You" : "Teacher"}</div>
      <div className="message-content">
        <p>{message.content}</p>
      </div>
    </div>
  );
}
