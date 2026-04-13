export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type PlanType = "architecture" | "design" | "research" | "general";
export type PlanStatus = "draft" | "in_review" | "approved" | "archived";
export type ResourceType = "person" | "tool" | "budget" | "document" | "other";
export type ChannelType = "general" | "project" | "direct";
export type UserRole = "admin" | "member";

export interface SocketEvents {
  // Chat events
  "chat:message": { channelId: string; content: string; parentMessageId?: string };
  "chat:message:new": { id: string; channelId: string; userId: string; userName: string; content: string; parentMessageId?: string; createdAt: string };
  "chat:typing": { channelId: string; userId: string; userName: string };
  "chat:typing:stop": { channelId: string; userId: string };

  // Whiteboard events
  "whiteboard:join": { boardId: string };
  "whiteboard:leave": { boardId: string };
  "whiteboard:update": { boardId: string; elements: string };
  "whiteboard:sync": { boardId: string; elements: string };

  // Task events
  "task:update": { taskId: string; field: string; value: string };
  "task:updated": { taskId: string; field: string; value: string; userId: string };

  // Presence
  "presence:online": { userId: string; userName: string };
  "presence:offline": { userId: string };
  "presence:list": { users: Array<{ userId: string; userName: string }> };
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#22C55E",
  medium: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "#6B7280",
  todo: "#3B82F6",
  in_progress: "#F59E0B",
  review: "#8B5CF6",
  done: "#22C55E",
};
