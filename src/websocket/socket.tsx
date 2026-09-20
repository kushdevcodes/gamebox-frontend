const WS_URL = "ws://localhost:3000/ws";

let socket: WebSocket | null = null;

export function connectSocket(): WebSocket {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return socket;
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("Connected to Gamebox WebSocket");
    };

    socket.onmessage = (event) => {
        console.log("Message from server:", event.data);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
        console.log("Disconnected from Gamebox WebSocket");
        socket = null;
    };

    return socket;
}

export function getSocket(): WebSocket | null {
    return socket;
}