export interface Player {
    playerId: string;
    role: "HOST" | "CONTROLLER";
}

export interface RoomState {
    roomId: string;
    hostId: string;
    status: "WAITING" | "PLAYING";
    players: Player[];
}