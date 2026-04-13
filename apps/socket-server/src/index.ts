import { createServer } from "http";
import { Server } from "socket.io";
import { setupChatNamespace } from "./namespaces/chat.js";
import { setupUpdatesNamespace } from "./namespaces/updates.js";
import { setupCanvasNamespace } from "./namespaces/canvas.js";

const PORT = parseInt(process.env.SOCKET_PORT ?? "3001");
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Track online users
const onlineUsers = new Map<string, { userId: string; userName: string; socketId: string }>();

io.on("connection", (socket) => {
  // Handle user presence
  socket.on("presence:join", ({ userId, userName }: { userId: string; userName: string }) => {
    onlineUsers.set(socket.id, { userId, userName, socketId: socket.id });
    io.emit("presence:online", { userId, userName });
    socket.emit("presence:list", {
      users: Array.from(onlineUsers.values()).map(({ userId, userName }) => ({ userId, userName })),
    });
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit("presence:offline", { userId: user.userId });
    }
  });

  // Set up feature namespaces
  setupChatNamespace(io, socket);
  setupUpdatesNamespace(io, socket);
  setupCanvasNamespace(io, socket);
});

httpServer.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[socket] Server running on port ${PORT}`);
  }
});
