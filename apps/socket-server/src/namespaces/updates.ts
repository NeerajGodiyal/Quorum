import type { Server, Socket } from "socket.io";

export function setupUpdatesNamespace(io: Server, socket: Socket) {
  // Broadcast task updates to all connected clients
  socket.on("task:update", (data: { taskId: string; field: string; value: string; userId: string }) => {
    socket.broadcast.emit("task:updated", data);
  });

  // Broadcast resource updates
  socket.on("resource:update", (data: { resourceId: string; action: string }) => {
    socket.broadcast.emit("resource:updated", data);
  });
}
