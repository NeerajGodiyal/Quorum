import type { Server, Socket } from "socket.io";

export function setupCanvasNamespace(io: Server, socket: Socket) {
  // Join a canvas room
  socket.on("canvas:join", ({ planId, userId, userName }: { planId: string; userId: string; userName: string }) => {
    socket.join(`canvas:${planId}`);
    socket.data.canvasPlanId = planId;
    socket.data.canvasUserId = userId;
    socket.data.canvasUserName = userName;

    // Broadcast to others in the room that this user joined
    socket.to(`canvas:${planId}`).emit("canvas:user:joined", { userId, userName });

    // Send current users in this room
    const room = io.sockets.adapter.rooms.get(`canvas:${planId}`);
    if (room) {
      const users: { userId: string; userName: string }[] = [];
      for (const sid of room) {
        const s = io.sockets.sockets.get(sid);
        if (s?.data.canvasUserId) {
          users.push({ userId: s.data.canvasUserId, userName: s.data.canvasUserName });
        }
      }
      socket.emit("canvas:users", { users });
    }
  });

  socket.on("canvas:leave", ({ planId }: { planId: string }) => {
    socket.leave(`canvas:${planId}`);
    socket.to(`canvas:${planId}`).emit("canvas:user:left", {
      userId: socket.data.canvasUserId,
    });
  });

  // Broadcast cursor position
  socket.on("canvas:cursor", ({ planId, x, y }: { planId: string; x: number; y: number }) => {
    socket.to(`canvas:${planId}`).emit("canvas:cursor:move", {
      userId: socket.data.canvasUserId,
      userName: socket.data.canvasUserName,
      x,
      y,
    });
  });

  // Broadcast node changes for real-time sync
  socket.on("canvas:nodes:update", ({ planId, nodes, edges }: { planId: string; nodes: any[]; edges: any[] }) => {
    socket.to(`canvas:${planId}`).emit("canvas:nodes:sync", { nodes, edges });
  });

  // On disconnect, notify canvas rooms
  socket.on("disconnect", () => {
    if (socket.data.canvasPlanId) {
      socket.to(`canvas:${socket.data.canvasPlanId}`).emit("canvas:user:left", {
        userId: socket.data.canvasUserId,
      });
    }
  });
}
