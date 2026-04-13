import type { Server, Socket } from "socket.io";

export function setupChatNamespace(io: Server, socket: Socket) {
  // Join a chat channel room
  socket.on("chat:join", ({ channelId }: { channelId: string }) => {
    socket.join(`chat:${channelId}`);
  });

  socket.on("chat:leave", ({ channelId }: { channelId: string }) => {
    socket.leave(`chat:${channelId}`);
  });

  // Broadcast a new message to the channel
  socket.on("chat:message", (data: {
    id: string;
    channelId: string;
    userId: string;
    userName: string;
    content: string;
    parentMessageId?: string;
    createdAt: string;
  }) => {
    socket.to(`chat:${data.channelId}`).emit("chat:message:new", data);
  });

  // Typing indicators
  socket.on("chat:typing", ({ channelId, userName }: { channelId: string; userName: string }) => {
    socket.to(`chat:${channelId}`).emit("chat:typing", { channelId, userName });
  });

  socket.on("chat:typing:stop", ({ channelId, userName }: { channelId: string; userName: string }) => {
    socket.to(`chat:${channelId}`).emit("chat:typing:stop", { channelId, userName });
  });
}
