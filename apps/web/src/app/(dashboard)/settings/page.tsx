"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings, Shield, Users, UserPlus, Trash2, Crown, Loader2, Check, X, Eye, EyeOff,
} from "lucide-react";
import { getUsers, createMember, updateUserRole, removeUser, updateProfile } from "./actions";
import { cn } from "@/lib/utils";

type Tab = "profile" | "team";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: Date | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("profile");

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: "profile", label: "Profile", icon: Settings },
    { key: "team", label: "Team", icon: Users },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Settings</h1>
        <p className="text-[13px] text-foreground/50 mt-0.5">Manage your account and team</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.04] pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors duration-150",
              tab === t.key ? "text-foreground/80" : "text-foreground/40 hover:text-foreground/60"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {tab === t.key && (
              <motion.div
                layoutId="settings-tab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#14F195]"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ProfileTab user={session.user as { id: string; name: string; email: string }} />
          </motion.div>
        ) : (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <TeamTab currentUserId={session.user.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileTab({ user }: { user: { id: string; name: string; email: string } }) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, { name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <section className="border border-white/[0.04] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-[14px] h-[14px] text-foreground/45" />
          <h2 className="text-[13px] font-medium text-foreground/60">Profile</h2>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[14px] font-medium text-foreground/40">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground/70 truncate">{user.name}</p>
            <p className="text-[12px] text-foreground/45 truncate">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
            />
          </div>
          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Email</Label>
            <Input
              value={user.email}
              readOnly
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] opacity-40 cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || name === user.name}
            className="w-fit px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/60 transition-all duration-150 mt-1 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3 text-green-400" /> : null}
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </section>

      <section className="border border-white/[0.04] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-[14px] h-[14px] text-foreground/45" />
          <h2 className="text-[13px] font-medium text-foreground/60">Security</h2>
        </div>
        <p className="text-[13px] text-foreground/45">Internal platform. Authentication via email and password.</p>
      </section>
    </div>
  );
}

function TeamTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    await updateUserRole(userId, newRole);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleRemove = async (userId: string) => {
    await removeUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] text-foreground/50">{users.length} team member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14F195]/10 text-[#14F195] hover:bg-[#14F195]/20 active:scale-[0.98] text-[13px] font-medium transition-all duration-150"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Member
        </button>
      </div>

      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <InviteForm
              onClose={() => setShowInvite(false)}
              onCreated={(newUser) => {
                loadUsers();
                setShowInvite(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border border-white/[0.04] rounded-xl overflow-hidden">
        {users.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 group",
              i > 0 && "border-t border-white/[0.04]"
            )}
          >
            <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[12px] font-medium text-foreground/40 flex-shrink-0">
              {u.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-foreground/70 truncate">{u.name}</p>
                {u.role === "admin" && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#14F195]/10 text-[#14F195] text-[10px] font-medium">
                    <Crown className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[12px] text-foreground/40 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {u.id !== currentUserId && (
                <>
                  <button
                    onClick={() => handleRoleChange(u.id, u.role === "admin" ? "member" : "admin")}
                    className="px-2 py-1 rounded-md hover:bg-white/[0.06] text-[11px] text-foreground/40 transition-colors duration-150"
                    title={u.role === "admin" ? "Demote to member" : "Promote to admin"}
                  >
                    {u.role === "admin" ? "Demote" : "Promote"}
                  </button>
                  <button
                    onClick={() => handleRemove(u.id)}
                    className="w-7 h-7 rounded-md hover:bg-red-500/10 flex items-center justify-center transition-colors duration-150"
                    title="Remove member"
                  >
                    <Trash2 className="w-3 h-3 text-foreground/30 hover:text-red-400" />
                  </button>
                </>
              )}
              {u.id === currentUserId && (
                <span className="text-[11px] text-foreground/30 px-2">You</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function InviteForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const newUser = await createMember({ name, email, password, role });
      onCreated(newUser);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create member");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.01]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-foreground/60">Add New Member</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-foreground/40" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-[12px] text-foreground/50 mb-1 block">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
          />
        </div>
        <div>
          <Label className="text-[12px] text-foreground/50 mb-1 block">Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@overclock.one"
            type="email"
            className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
          />
        </div>
        <div>
          <Label className="text-[12px] text-foreground/50 mb-1 block">Password</Label>
          <div className="relative">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5 text-foreground/30" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-foreground/30" />
              )}
            </button>
          </div>
        </div>
        <div>
          <Label className="text-[12px] text-foreground/50 mb-1 block">Role</Label>
          <div className="flex gap-2">
            {(["member", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 h-9 rounded-lg text-[13px] font-medium transition-all duration-150 border",
                  role === r
                    ? "bg-white/[0.06] border-white/[0.12] text-foreground/70"
                    : "bg-transparent border-white/[0.06] text-foreground/35 hover:text-foreground/50"
                )}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-400 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors duration-150"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#14F195] hover:bg-[#14F195]/90 active:scale-[0.98] text-[13px] font-medium text-white transition-all duration-150 disabled:opacity-50"
        >
          {creating && <Loader2 className="w-3 h-3 animate-spin" />}
          Create Member
        </button>
      </div>
    </div>
  );
}
