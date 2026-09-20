// src/pages/ControllerView.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { MESSAGE_TYPES } from "../websocket/messageTypes";
import { useNavigate, useParams } from "react-router-dom";

export default function Controller() {
    const { roomId } = useParams<{ roomId?: string }>();
    const { isConnected, roomState, error, sendMessage } = useSocket();
    const navigate = useNavigate();

    const hasJoinedRef = useRef(false);

    useEffect(() => {
        if (isConnected && roomId && !roomState && !hasJoinedRef.current) {
            hasJoinedRef.current = true;
            sendMessage({
                type: MESSAGE_TYPES.JOIN_ROOM,
                roomId: roomId.toUpperCase(),
            });
        }
    }, [isConnected, roomId, roomState, sendMessage]);

    useEffect(() => {
        if (!isConnected) {
            hasJoinedRef.current = false;
        }
    }, [isConnected]);

    const dispatchInput = useCallback(
        (button: string, state: "DOWN" | "UP") => {
            if (state === "DOWN" && "vibrate" in navigator) {
                navigator.vibrate(15);
            }
            sendMessage({
                type: MESSAGE_TYPES.INPUT,
                input: { button, state },
            });
        },
        [sendMessage]
    );

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-rose-500 font-semibold mb-4">{error}</p>
                <button
                    onClick={() => {
                        navigate("/");
                    }}
                    className="px-6 py-2 bg-slate-800 rounded-lg text-slate-200 text-sm"
                >
                    Return Home
                </button>
            </div>
        );
    }

    if (!roomState) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-400 animate-pulse">Joining room {roomId}...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col justify-between p-6">
            <header className="flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>ROOM: <strong className="text-slate-300">{roomState.roomId}</strong></span>
                <span>STATUS: <strong className="text-slate-300">{roomState.status}</strong></span>
            </header>

            {/* Controls Container */}
            <div className="flex justify-between items-center w-full max-w-md mx-auto my-auto gap-4">
                {/* D-Pad */}
                <div className="grid grid-cols-3 gap-2 w-44 h-44">
                    <div />
                    <button
                        onPointerDown={() => dispatchInput("UP", "DOWN")}
                        onPointerUp={() => dispatchInput("UP", "UP")}
                        className="bg-slate-800 active:bg-slate-700 text-white rounded-xl text-xl flex items-center justify-center shadow active:scale-95"
                    >
                        ▲
                    </button>
                    <div />
                    <button
                        onPointerDown={() => dispatchInput("LEFT", "DOWN")}
                        onPointerUp={() => dispatchInput("LEFT", "UP")}
                        className="bg-slate-800 active:bg-slate-700 text-white rounded-xl text-xl flex items-center justify-center shadow active:scale-95"
                    >
                        ◀
                    </button>
                    <div />
                    <button
                        onPointerDown={() => dispatchInput("RIGHT", "DOWN")}
                        onPointerUp={() => dispatchInput("RIGHT", "UP")}
                        className="bg-slate-800 active:bg-slate-700 text-white rounded-xl text-xl flex items-center justify-center shadow active:scale-95"
                    >
                        ▶
                    </button>
                    <div />
                    <button
                        onPointerDown={() => dispatchInput("DOWN", "DOWN")}
                        onPointerUp={() => dispatchInput("DOWN", "UP")}
                        className="bg-slate-800 active:bg-slate-700 text-white rounded-xl text-xl flex items-center justify-center shadow active:scale-95"
                    >
                        ▼
                    </button>
                    <div />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 items-center">
                    <button
                        onPointerDown={() => dispatchInput("B", "DOWN")}
                        onPointerUp={() => dispatchInput("B", "UP")}
                        className="w-20 h-20 rounded-full bg-emerald-600 active:bg-emerald-500 text-white font-black text-2xl shadow-lg active:scale-95 flex items-center justify-center"
                    >
                        B
                    </button>
                    <button
                        onPointerDown={() => dispatchInput("A", "DOWN")}
                        onPointerUp={() => dispatchInput("A", "UP")}
                        className="w-20 h-20 rounded-full bg-rose-600 active:bg-rose-500 text-white font-black text-2xl shadow-lg active:scale-95 flex items-center justify-center"
                    >
                        A
                    </button>
                </div>
            </div>
        </div>
    );
}