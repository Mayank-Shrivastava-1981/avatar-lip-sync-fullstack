import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import type { ChatSession, Message } from "./types";
import * as api from "./services/api";
import "./App.css";

function speak(text: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  // Pick a natural-sounding English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
  ) || voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceEnabledRef = useRef(true);

  // Keep ref in sync so callbacks always read latest value
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  // Track speechSynthesis speaking state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Preload voices (some browsers load them async)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
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
    stopSpeaking();
  }, [stopSpeaking]);

  const handleNewChat = useCallback(async () => {
    const session = await api.createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setStreamingContent("");
    stopSpeaking();
  }, [stopSpeaking]);

  const handleSend = useCallback(
    async (message: string) => {
      if (!activeSessionId || isLoading) return;

      stopSpeaking();
      const userMsg: Message = { role: "user", content: message, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      await api.sendMessage(
        activeSessionId,
        message,
        (chunk) => setStreamingContent((prev) => prev + chunk),
        () => {
          setStreamingContent((prev) => {
            const finalContent = prev;
            setMessages((msgs) => [
              ...msgs,
              { role: "assistant", content: finalContent, timestamp: Date.now() },
            ]);
            // Read the response aloud if voice is enabled
            if (voiceEnabledRef.current && finalContent) {
              speak(finalContent);
            }
            return "";
          });
          setIsLoading(false);
          loadSessions();
        },
        (error) => {
          setStreamingContent("");
          setMessages((msgs) => [
            ...msgs,
            { role: "assistant", content: `Error: ${error}`, timestamp: Date.now() },
          ]);
          setIsLoading(false);
        }
      );
    },
    [activeSessionId, isLoading, loadSessions, stopSpeaking]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
            {isSpeaking && (
              <button className="stop-speech-btn" onClick={stopSpeaking} title="Stop speaking">
                ⏹ Stop
              </button>
            )}
            <button
              className={`voice-toggle ${voiceEnabled ? "on" : "off"}`}
              onClick={() => {
                if (voiceEnabled) stopSpeaking();
                setVoiceEnabled((v) => !v);
              }}
              title={voiceEnabled ? "Voice ON — click to mute" : "Voice OFF — click to unmute"}
            >
              {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
          </div>
        </header>
        <ChatWindow messages={messages} streamingContent={streamingContent} />
        <ChatInput onSend={handleSend} disabled={isLoading || !activeSessionId} />
      </div>
    </div>
  );
}

export default App;
