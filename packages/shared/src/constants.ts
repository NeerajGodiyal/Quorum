// App constants — URLs are configured via env vars in apps, not here
export const APP_NAME = "Overclock";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Projects", href: "/projects", icon: "Layers" },
  { label: "Tasks", href: "/tasks", icon: "CheckSquare" },
  { label: "Resources", href: "/resources", icon: "FolderKanban" },
  { label: "Planning", href: "/planning", icon: "FileText" },
  { label: "Research", href: "/research", icon: "Bookmark" },
  { label: "Chat", href: "/chat", icon: "MessageCircle" },
] as const;
