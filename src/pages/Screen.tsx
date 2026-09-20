import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useSocket } from "../context/SocketContext";
import { MESSAGE_TYPES } from "../websocket/messageTypes";

export default function Screen() {
  const { roomId } = useParams<{ roomId: string }>();
  const { isConnected, roomState, sendMessage: sendWsMessage, onMessage } = useSocket();

  // Configure Unity WebGL Loader
  const { unityProvider, sendMessage: sendToUnity, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: "/unity/game.js",
    dataUrl: "/unity/game.data",
    frameworkUrl: "/unity/game.framework.js",
    codeUrl: "/unity/game.wasm",
  });

  // Use refs to prevent stale closures when WebSockets deliver high-frequency input
  const isLoadedRef = useRef(isLoaded);
  const sendToUnityRef = useRef(sendToUnity);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    sendToUnityRef.current = sendToUnity;
  }, [sendToUnity]);

  // Ensure room creation when screen mounts
  useEffect(() => {
    if (isConnected && !roomState && roomId) {
      sendWsMessage({ type: MESSAGE_TYPES.CREATE_ROOM });
    }
  }, [isConnected, roomState, roomId, sendWsMessage]);

  // Handle incoming mobile controller inputs and forward directly to Unity C#
  useEffect(() => {
    const unsub = onMessage(MESSAGE_TYPES.INPUT, (packet: any) => {
      console.log("[Screen] Received INPUT packet:", packet);

      if (!isLoadedRef.current) {
        console.warn("[Screen] Unity runtime not ready yet, dropping input packet");
        return;
      }

      const payload = JSON.stringify({
        playerId: packet.playerId || "",
        button: packet.input?.button || "",
        state: packet.input?.state || "UP",
      });

      console.log("[Screen] Forwarding to Unity GameManager:", payload);

      // Matches the GameObject "GameManager" and C# method "OnControllerInput"
      try {
        sendToUnityRef.current("GameManager", "OnControllerInput", payload);
      } catch (err) {
        console.error("[Screen] Failed to send input to Unity:", err);
      }
    });

    return unsub;
  }, [onMessage]);

  if (!roomState) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-mono">
        <p className="animate-pulse text-lg">Initializing Screen Session...</p>
      </div>
    );
  }

  // ACTIVE GAMEPLAY: RENDER UNITY CANVAS
  if (roomState.status === "PLAYING") {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        <header className="w-full px-6 py-3 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>ROOM: <strong className="text-indigo-400">{roomState.roomId}</strong></span>
          <span>CONTROLLERS: <strong className="text-emerald-400">{roomState.players.filter((p) => p.role === "CONTROLLER").length}</strong></span>
        </header>

        <div className="flex-1 flex items-center justify-center relative w-full h-full p-4">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 font-mono">
              <p className="text-indigo-400 mb-3 text-sm">Loading Unity WebGL Runtime...</p>
              <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-150"
                  style={{ width: `${Math.round(loadingProgression * 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-2">{Math.round(loadingProgression * 100)}%</p>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black">
            <Unity unityProvider={unityProvider} style={{ width: 960, height: 600 }} />
          </div>
        </div>
      </div>
    );
  }

  // LOBBY STATE
  const controllerUrl = `${window.location.origin}/controller/${roomState.roomId}`;

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-12">
      <header className="text-center">
        <h2 className="text-slate-500 font-semibold tracking-widest text-sm uppercase font-mono">Join Code</h2>
        <h1 className="text-8xl font-mono font-black text-indigo-400 tracking-[0.2em] mt-2">
          {roomState.roomId}
        </h1>
      </header>

      <div className="flex flex-col items-center gap-6">
        <div className="bg-white p-4 rounded-2xl shadow-xl shadow-indigo-500/10">
          <QRCodeSVG value={controllerUrl} size={190} />
        </div>
        <p className="text-slate-400 text-sm">
          Scan with phone or visit:{" "}
          <span className="text-indigo-300 font-mono">{controllerUrl}</span>
        </p>
      </div>

      <div className="w-full max-w-2xl text-center">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4 font-semibold font-mono">
          Connected Controllers ({roomState.players.filter((p) => p.role === "CONTROLLER").length})
        </h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {roomState.players.map((player) => (
            <div
              key={player.playerId}
              className={`px-5 py-3 rounded-xl border font-mono text-sm flex items-center gap-2 ${
                player.role === "HOST"
                  ? "bg-slate-900 border-slate-800 text-slate-500"
                  : "bg-indigo-950/60 border-indigo-500/50 text-indigo-200"
              }`}
            >
              <span>{player.role === "HOST" ? "🖥️ TV Host" : "🎮 Controller"}</span>
              <span className="text-xs text-slate-400">({player.playerId.slice(0, 4)})</span>
            </div>
          ))}
        </div>
      </div>

      <footer>
        <button
          onClick={() => sendWsMessage({ type: MESSAGE_TYPES.GAME_START })}
          disabled={roomState.players.filter((p) => p.role === "CONTROLLER").length === 0}
          className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg shadow-lg shadow-emerald-600/20 transition cursor-pointer"
        >
          Start Unity Game
        </button>
      </footer>
    </div>
  );
}