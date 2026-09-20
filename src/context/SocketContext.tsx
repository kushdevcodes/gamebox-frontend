// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { MESSAGE_TYPES } from "../websocket/messageTypes";
import type { RoomState } from "../types/game";

interface SocketContextValue {
    isConnected: boolean;
    playerId: string | null;
    roomState: RoomState | null;
    error: string | null;
    sendMessage: (payload: any) => void;
    onMessage: (type: string, callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const WS_URL = "ws://localhost:3000/ws";

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Dynamic listeners for game-specific packets (e.g. INPUT, GAME_STATE)
    const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

    // Queue for messages sent before WS opens
    const queueRef = useRef<any[]>([]);

    const sendMessage = useCallback((payload: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        } else {
            // Buffer the payload until connected
            queueRef.current.push(payload);
        }
    }, []);

    const onMessage = useCallback((type: string, callback: (data: any) => void) => {
        if (!listenersRef.current.has(type)) {
            listenersRef.current.set(type, new Set());
        }
        listenersRef.current.get(type)!.add(callback);

        return () => {
            listenersRef.current.get(type)?.delete(callback);
        };
    }, []);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            setError(null);

            // Flush buffered actions
            while (queueRef.current.length > 0) {
                const msg = queueRef.current.shift();
                ws.send(JSON.stringify(msg));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Core lifecycle routing
                switch (data.type) {
                    case MESSAGE_TYPES.WELCOME:
                        setPlayerId(data.playerId);
                        break;
                    case MESSAGE_TYPES.ROOM_STATE:
                        setRoomState(data);
                        setError(null);
                        break;
                    case "ERROR":
                        setError(data.message);
                        break;
                    default:
                        break;
                }

                // Notify custom listeners
                if (data.type && listenersRef.current.has(data.type)) {
                    listenersRef.current.get(data.type)!.forEach((cb) => cb(data));
                }
            } catch (err) {
                console.error("Malformed message received:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket encountered an error:", err);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
            setIsConnected(false);
            setPlayerId(null);
            setRoomState(null);
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close();
            }
        };
    }, []);

    return (
        <SocketContext.Provider
            value={{
                isConnected,
                playerId,
                roomState,
                error,
                sendMessage,
                onMessage,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};