// src/components/GameCanvas.tsx
import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { MESSAGE_TYPES } from "../websocket/messageTypes";

interface PlayerEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  keys: {
    UP: boolean;
    DOWN: boolean;
    LEFT: boolean;
    RIGHT: boolean;
    A: boolean;
    B: boolean;
  };
}

const PLAYER_COLORS = ["#38bdf8", "#4ade80", "#f43f5e", "#fbbf24", "#a855f7"];

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { onMessage, roomState } = useSocket();
  const playersRef = useRef<Map<string, PlayerEntity>>(new Map());

  // 1. Sync connected players into the game entities
  useEffect(() => {
    if (!roomState) return;

    const currentPlayers = playersRef.current;
    
    // Add newly joined players (excluding the host screen itself)
    roomState.players.forEach((p, index) => {
      if (p.role === "CONTROLLER" && !currentPlayers.has(p.playerId)) {
        currentPlayers.set(p.playerId, {
          id: p.playerId,
          x: 100 + (index * 80),
          y: 200,
          vx: 0,
          vy: 0,
          color: PLAYER_COLORS[index % PLAYER_COLORS.length],
          keys: { UP: false, DOWN: false, LEFT: false, RIGHT: false, A: false, B: false }
        });
      }
    });

    // Clean up disconnected players
    const activeIds = new Set(roomState.players.map((p) => p.playerId));
    for (const id of currentPlayers.keys()) {
      if (!activeIds.has(id)) {
        currentPlayers.delete(id);
      }
    }
  }, [roomState]);

  // 2. Process real-time inputs
  useEffect(() => {
    const unsub = onMessage(MESSAGE_TYPES.INPUT, (packet: { playerId: string; input: { button: string; state: "DOWN" | "UP" } }) => {
      const player = playersRef.current.get(packet.playerId);
      if (!player) return;

      const isPressed = packet.input.state === "DOWN";
      const btn = packet.input.button;

      if (btn in player.keys) {
        (player.keys as Record<string, boolean>)[btn] = isPressed;
      }
    });

    return unsub;
  }, [onMessage]);

  // 3. 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      // Clear screen
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle grid lines
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Update and draw players
      const speed = 5;
      playersRef.current.forEach((player) => {
        // Movement calculation
        if (player.keys.LEFT) player.x -= speed;
        if (player.keys.RIGHT) player.x += speed;
        if (player.keys.UP) player.y -= speed;
        if (player.keys.DOWN) player.y += speed;

        // Keep inside bounds
        player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
        player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

        // Draw Player Box
        ctx.fillStyle = player.color;
        const size = player.keys.A ? 48 : 36; // Expands when pressing "A"
        ctx.fillRect(player.x - size / 2, player.y - size / 2, size, size);

        // Draw Player ID Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`P-${player.id.slice(0, 4)}`, player.x, player.y - size / 2 - 8);
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      <div className="border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={800} height={500} />
      </div>
      <p className="text-xs text-slate-500 mt-3 font-mono">
        Use phone D-pad to move. Press [A] on controller to scale character.
      </p>
    </div>
  );
}