import type { ChatSession } from "../types";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ sessions, activeSessionId, onSelectSession, onNewChat }: Props) {
  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeSessionId ? "active" : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            {s.title}
          </div>
        ))}
      </div>
    </div>
  );
}
