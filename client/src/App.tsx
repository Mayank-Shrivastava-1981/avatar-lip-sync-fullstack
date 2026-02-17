import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import DIDAvatar, { type DIDAvatarHandle } from "./components/DIDAvatar";
import type { ChatSession, Message } from "./types";
import * as api from "./services/api";
import { ConnectionState, type Message as DIDMessage } from "@d-id/client-sdk";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // D-ID config
  const [didConfig, setDidConfig] = useState<api.DIDConfig | null>(null);
  const [didError, setDidError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.New
  );
  const avatarRef = useRef<DIDAvatarHandle>(null);

  // Fetch D-ID config on mount
  useEffect(() => {
    api
      .getDIDConfig()
      .then(setDidConfig)
      .catch((err) => setDidError(err.message));
  }, []);

  const loadSessions = useCallback(async () => {
    const data = await api.getSessions();
    setSessions(data);
  }, []);

  const selectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    const session = await api.getSessionHistory(id);
    setMessages(session.messages);
    setStreamingContent("");
  }, []);

  const handleNewChat = useCallback(async () => {
    const session = await api.createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setStreamingContent("");
  }, []);

  const handleDIDMessage = useCallback(
    (didMessages: DIDMessage[], type: "answer" | "partial" | "user") => {
      if (type === "partial") {
        // Show partial (streaming) text from the last message
        const last = didMessages[didMessages.length - 1];
        if (last?.role === "assistant") {
          setStreamingContent(last.content);
        }
      } else if (type === "answer") {
        // Final answer — add to messages
        const last = didMessages[didMessages.length - 1];
        if (last?.role === "assistant") {
          setStreamingContent("");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: last.content,
              timestamp: Date.now(),
            },
          ]);
          setIsLoading(false);
          loadSessions();
        }
      }
    },
    [loadSessions]
  );

  const handleSend = useCallback(
    async (message: string) => {
      if (!activeSessionId || isLoading) return;

      const userMsg: Message = {
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      try {
        // Also send to backend to keep session history
        api.sendMessage(
          activeSessionId,
          message,
          () => {},
          () => {},
          () => {}
        );

        // Send to D-ID agent — response comes via onNewMessage callback
        await avatarRef.current?.chat(message);
      } catch (err) {
        console.error("Failed to send message:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : "Failed to send message"}`,
            timestamp: Date.now(),
          },
        ]);
        setIsLoading(false);
      }
    },
    [activeSessionId, isLoading]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const isConnected = connectionState === ConnectionState.Connected ||
    connectionState === ConnectionState.Completed;

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
      />
      <div className="main">
        <header className="app-header">
          <h1>AI Teacher</h1>
          <div className="header-controls">
            <span
              className={`connection-indicator ${isConnected ? "connected" : "disconnected"}`}
            >
              {isConnected ? "Connected" : connectionState}
            </span>
          </div>
        </header>
        {didConfig ? (
          <DIDAvatar
            ref={avatarRef}
            agentId={didConfig.agentId}
            clientKey={didConfig.clientKey}
            onNewMessage={handleDIDMessage}
            onConnectionStateChange={setConnectionState}
            onError={(err) => setDidError(err.message)}
          />
        ) : (
          <div className="avatar-area">
            <div className="did-avatar-container">
              {didError ? (
                <div className="did-avatar-overlay did-error">
                  <span>Failed to load config: {didError}</span>
                </div>
              ) : (
                <div className="did-avatar-overlay">
                  <div className="did-connecting-spinner" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </div>
        )}
        <ChatWindow messages={messages} streamingContent={streamingContent} />
        <ChatInput
          onSend={handleSend}
          disabled={isLoading || !activeSessionId || !isConnected}
        />
      </div>
    </div>
  );
}

export default App;
