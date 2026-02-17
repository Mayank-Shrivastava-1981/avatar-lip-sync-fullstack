import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  createAgentManager,
  type AgentManager,
  type Message as DIDMessage,
  StreamingState,
  ConnectionState,
} from "@d-id/client-sdk";

export interface DIDAvatarHandle {
  chat: (message: string) => Promise<void>;
  reconnect: () => Promise<void>;
}

interface DIDAvatarProps {
  agentId: string;
  clientKey: string;
  onNewMessage?: (messages: DIDMessage[], type: "answer" | "partial" | "user") => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

const DIDAvatar = forwardRef<DIDAvatarHandle, DIDAvatarProps>(
  ({ agentId, clientKey, onNewMessage, onConnectionStateChange, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const agentManagerRef = useRef<AgentManager | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>(
      ConnectionState.New
    );
    const [isVideoStreaming, setIsVideoStreaming] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    const onNewMessageRef = useRef(onNewMessage);
    const onConnectionStateChangeRef = useRef(onConnectionStateChange);
    const onErrorRef = useRef(onError);

    useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
    useEffect(() => { onConnectionStateChangeRef.current = onConnectionStateChange; }, [onConnectionStateChange]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const initAgent = useCallback(async () => {
      if (agentManagerRef.current) return;

      try {
        setInitError(null);
        const manager = await createAgentManager(agentId, {
          auth: { type: "bearer", token: clientKey },
          callbacks: {
            onSrcObjectReady(srcObject: MediaStream) {
              if (videoRef.current) {
                videoRef.current.srcObject = srcObject;
              }
            },
            onVideoStateChange(state: StreamingState) {
              setIsVideoStreaming(state === StreamingState.Start);
            },
            onConnectionStateChange(state: ConnectionState) {
              setConnectionState(state);
              onConnectionStateChangeRef.current?.(state);
            },
            onNewMessage(messages: DIDMessage[], type: "answer" | "partial" | "user") {
              onNewMessageRef.current?.(messages, type);
            },
            onError(error: Error) {
              console.error("D-ID error:", error);
              onErrorRef.current?.(error);
            },
          },
          baseURL: "/d-id-api",
          wsURL: `ws://${window.location.host}/d-id-ws`,
          streamOptions: {
            compatibilityMode: "auto",
            streamWarmup: true,
          },
        });

        agentManagerRef.current = manager;
        await manager.connect();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Failed to initialize D-ID agent:", error);
        setInitError(error.message);
        onErrorRef.current?.(error);
      }
    }, [agentId, clientKey]);

    useEffect(() => {
      initAgent();

      return () => {
        agentManagerRef.current?.disconnect();
        agentManagerRef.current = null;
      };
    }, [initAgent]);

    useImperativeHandle(ref, () => ({
      async chat(message: string) {
        if (!agentManagerRef.current) {
          throw new Error("Agent not connected");
        }
        await agentManagerRef.current.chat(message);
      },
      async reconnect() {
        if (agentManagerRef.current) {
          await agentManagerRef.current.disconnect();
          agentManagerRef.current = null;
        }
        await initAgent();
      },
    }), [initAgent]);

    const handleRetry = () => {
      if (agentManagerRef.current) {
        agentManagerRef.current.disconnect();
        agentManagerRef.current = null;
      }
      initAgent();
    };

    const isError =
      connectionState === ConnectionState.Fail || initError !== null;
    const isConnecting =
      connectionState === ConnectionState.New ||
      connectionState === ConnectionState.Connecting;

    return (
      <div className="avatar-area">
        <div className="did-avatar-container">
          <video
            ref={videoRef}
            className="did-avatar-video"
            autoPlay
            playsInline
            style={{ display: isVideoStreaming ? "block" : "none" }}
          />
          {!isVideoStreaming && !isError && (
            <img
              src="/avatar-idle.svg"
              alt="AI Teacher"
              className="did-avatar-idle"
            />
          )}
          {isConnecting && !isError && (
            <div className="did-avatar-overlay">
              <div className="did-connecting-spinner" />
              <span>Connecting...</span>
            </div>
          )}
          {isError && (
            <div className="did-avatar-overlay did-error">
              <span>Connection failed</span>
              <button className="did-retry-btn" onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DIDAvatar.displayName = "DIDAvatar";

export default DIDAvatar;
