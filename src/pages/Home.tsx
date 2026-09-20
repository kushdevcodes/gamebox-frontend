// src/pages/Home.tsx
import { useState } from "react";
import { useSocket } from "../context/SocketContext";
import { MESSAGE_TYPES } from "../websocket/messageTypes";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { sendMessage, onMessage } = useSocket();
  const [code, setCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    setIsCreating(true);

    const unsub = onMessage(MESSAGE_TYPES.ROOM_STATE, (state: { roomId: string }) => {
      unsub();
      navigate(`/screen/${state.roomId}`);
    });

    sendMessage({ type: MESSAGE_TYPES.CREATE_ROOM });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) {
      navigate(`/controller/${clean}`);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Gamebox</h1>
      <p className="text-slate-400 mb-8 text-sm">Play games together using your phones as controllers</p>

      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-lg transition duration-150 shadow-lg shadow-indigo-600/30 mb-6 cursor-pointer"
      >
        {isCreating ? "Allocating Display..." : "Host Screen (TV Display)"}
      </button>

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-slate-800 w-full" />
        <span className="bg-slate-900 px-3 text-xs uppercase text-slate-500 font-medium tracking-wider">or join</span>
        <div className="border-t border-slate-800 w-full" />
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <input
          type="text"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
          className="w-full text-center text-3xl font-mono uppercase tracking-[0.3em] py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={code.trim().length !== 4}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium rounded-xl transition duration-150 cursor-pointer"
        >
          Connect as Controller
        </button>
      </form>
    </div>
  );
}