import { useState, useCallback, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import TeacherAvatar from "./components/TeacherAvatar";
import type { ChatSession, Message } from "./types";
import type { Viseme, LipSyncController } from "./utils/lipSync";
import { generateVisemeTimeline, createLipSyncController } from "./utils/lipSync";
import * as api from "./services/api";
import "./App.css";

function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
}

// Sentence boundary regex: split on . ! ? or newline (keeping delimiters)
const SENTENCE_RE = /(?<=[.!?\n])\s*/;

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceEnabledRef = useRef(true);

  // Avatar state
  const [currentViseme, setCurrentViseme] = useState<Viseme>("sil");
  const [avatarState, setAvatarState] = useState<"idle" | "speaking">("idle");
  const lipSyncControllerRef = useRef<LipSyncController | null>(null);

  // Streaming speech refs
  const speechBufferRef = useRef(""); // unspoken text buffer
  const speechQueueRef = useRef<string[]>([]); // sentences queued for speech
  const isSpeakingQueueRef = useRef(false); // is the queue currently being spoken
  const stoppedRef = useRef(false); // flag to abort queue processing

  // Keep ref in sync so callbacks always read latest value
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  // Track speechSynthesis speaking state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(
        window.speechSynthesis.speaking || speechQueueRef.current.length > 0
      );
    }, 200);
    return () => clearInterval(interval);
  }, []);

  /** Speak one sentence with lip sync, returns a promise that resolves when done */
  const speakSentence = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (stoppedRef.current || !text.trim()) {
          resolve();
          return;
        }

        // Stop previous lip sync controller
        if (lipSyncControllerRef.current) {
          lipSyncControllerRef.current.stop();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        const voice = getPreferredVoice();
        if (voice) utterance.voice = voice;

        const timeline = generateVisemeTimeline(text, utterance.rate);
        const controller = createLipSyncController(timeline, setCurrentViseme);
        lipSyncControllerRef.current = controller;

        utterance.onstart = () => {
          setAvatarState("speaking");
          controller.start();
        };

        const finish = () => {
          controller.stop();
          lipSyncControllerRef.current = null;
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  /** Process the speech queue sentence-by-sentence */
  const processQueue = useCallback(async () => {
    if (isSpeakingQueueRef.current) return; // already running
    isSpeakingQueueRef.current = true;

    while (speechQueueRef.current.length > 0 && !stoppedRef.current) {
      const sentence = speechQueueRef.current.shift()!;
      await speakSentence(sentence);
    }

    isSpeakingQueueRef.current = false;

    // If nothing left and not stopped, go idle
    if (!stoppedRef.current) {
      setAvatarState("idle");
      setCurrentViseme("sil");
    }
  }, [speakSentence]);

  /** Called on each streaming chunk — buffers text and queues complete sentences */
  const handleChunkForSpeech = useCallback(
    (chunk: string) => {
      if (!voiceEnabledRef.current) return;

      speechBufferRef.current += chunk;

      // Split buffer on sentence boundaries
      const parts = speechBufferRef.current.split(SENTENCE_RE);

      if (parts.length > 1) {
        // All parts except the last are complete sentences
        const completeSentences = parts.slice(0, -1);
        speechBufferRef.current = parts[parts.length - 1]; // keep remainder

        for (const s of completeSentences) {
          if (s.trim()) {
            speechQueueRef.current.push(s.trim());
          }
        }
        processQueue();
      }
    },
    [processQueue]
  );

  /** Flush any remaining buffered text when stream ends */
  const flushSpeechBuffer = useCallback(() => {
    if (!voiceEnabledRef.current) return;
    const remaining = speechBufferRef.current.trim();
    if (remaining) {
      speechQueueRef.current.push(remaining);
    }
    speechBufferRef.current = "";
    processQueue();
  }, [processQueue]);

  const stopSpeaking = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Clear queue and buffer
    speechQueueRef.current = [];
    speechBufferRef.current = "";
    isSpeakingQueueRef.current = false;

    // Stop lip sync and reset avatar
    if (lipSyncControllerRef.current) {
      lipSyncControllerRef.current.stop();
      lipSyncControllerRef.current = null;
    }
    setCurrentViseme("sil");
    setAvatarState("idle");

    // Reset stopped flag after a tick so future speech works
    setTimeout(() => {
      stoppedRef.current = false;
    }, 0);
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

  const selectSession = useCallback(
    async (id: string) => {
      setActiveSessionId(id);
      const session = await api.getSessionHistory(id);
      setMessages(session.messages);
      setStreamingContent("");
      stopSpeaking();
    },
    [stopSpeaking]
  );

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
      const userMsg: Message = {
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      // Reset speech buffer for the new response
      speechBufferRef.current = "";
      speechQueueRef.current = [];

      await api.sendMessage(
        activeSessionId,
        message,
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
          // Feed each chunk to speech as it arrives
          handleChunkForSpeech(chunk);
        },
        () => {
          setStreamingContent((prev) => {
            const finalContent = prev;
            setMessages((msgs) => [
              ...msgs,
              {
                role: "assistant",
                content: finalContent,
                timestamp: Date.now(),
              },
            ]);
            return "";
          });
          // Flush any remaining buffered text
          flushSpeechBuffer();
          setIsLoading(false);
          loadSessions();
        },
        (error) => {
          setStreamingContent("");
          setMessages((msgs) => [
            ...msgs,
            {
              role: "assistant",
              content: `Error: ${error}`,
              timestamp: Date.now(),
            },
          ]);
          setIsLoading(false);
          stopSpeaking();
        }
      );
    },
    [
      activeSessionId,
      isLoading,
      loadSessions,
      stopSpeaking,
      handleChunkForSpeech,
      flushSpeechBuffer,
    ]
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
              <button
                className="stop-speech-btn"
                onClick={stopSpeaking}
                title="Stop speaking"
              >
                ⏹ Stop
              </button>
            )}
            <button
              className={`voice-toggle ${voiceEnabled ? "on" : "off"}`}
              onClick={() => {
                if (voiceEnabled) stopSpeaking();
                setVoiceEnabled((v) => !v);
              }}
              title={
                voiceEnabled
                  ? "Voice ON — click to mute"
                  : "Voice OFF — click to unmute"
              }
            >
              {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
          </div>
        </header>
        <TeacherAvatar currentViseme={currentViseme} avatarState={avatarState} />
        <ChatWindow messages={messages} streamingContent={streamingContent} />
        <ChatInput onSend={handleSend} disabled={isLoading || !activeSessionId} />
      </div>
    </div>
  );
}

export default App;
