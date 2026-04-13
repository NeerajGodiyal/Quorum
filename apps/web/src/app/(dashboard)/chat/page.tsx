"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSocket } from "@/hooks/use-socket";
import { useSession } from "@/lib/auth-client";
import { getChannels, getMessages, sendMessage, createChannel, toggleReaction, getReactions } from "./actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Hash, Plus, Send, ArrowLeft, Wifi, WifiOff, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel { id: string; name: string; type: string; }
interface Message { id: string; content: string; createdAt: Date; userId: string; userName: string | null; channelId: string; parentMessageId: string | null; }
interface Reaction { id: string; messageId: string; userId: string; emoji: string; userName: string | null; }

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];

export default function ChatPage() {
  const { socket, connected } = useSocket();
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [mobileShowChannels, setMobileShowChannels] = useState(true);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getChannels().then((c) => {
      setChannels(c as Channel[]);
      if (c.length > 0) setActive(c[0] as Channel);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    getMessages(active.id).then(async (m) => {
      const reversed = (m as Message[]).reverse();
      setMessages(reversed);
      const ids = reversed.map((msg) => msg.id);
      if (ids.length > 0) {
        const r = await getReactions(ids);
        setReactions(r as Reaction[]);
      }
    });
    socket?.emit("chat:join", { channelId: active.id });
    return () => { socket?.emit("chat:leave", { channelId: active.id }); };
  }, [active, socket]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg: Message) => {
      if (msg.channelId === active?.id && msg.userId !== session?.user?.id) {
        setMessages((p) => [...p, msg]);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    };
    const onType = ({ userName }: { userName: string }) => setTyping((p) => p.includes(userName) ? p : [...p, userName]);
    const onStop = ({ userName }: { userName: string }) => setTyping((p) => p.filter((u) => u !== userName));
    socket.on("chat:message:new", onMsg);
    socket.on("chat:typing", onType);
    socket.on("chat:typing:stop", onStop);
    return () => { socket.off("chat:message:new", onMsg); socket.off("chat:typing", onType); socket.off("chat:typing:stop", onStop); };
  }, [socket, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !active || !session?.user) return;
    const content = input.trim();
    setInput("");
    const msg = await sendMessage(active.id, session.user.id, content);
    // Add to local messages immediately
    const newMsg = { ...msg, userName: session.user.name, channelId: active.id } as Message;
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    socket?.emit("chat:message", { ...newMsg });
  };

  const onInput = (v: string) => {
    setInput(v);
    if (!socket || !active || !session?.user) return;
    socket.emit("chat:typing", { channelId: active.id, userName: session.user.name });
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => socket.emit("chat:typing:stop", { channelId: active.id, userName: session.user.name }), 2000);
  };

  const createCh = async () => {
    if (!newName.trim() || !session?.user) return;
    const ch = await createChannel(newName.trim(), "general", session.user.id);
    setChannels((p) => [...p, ch as Channel]);
    setActive(ch as Channel);
    setNewName("");
    setShowNew(false);
    setMobileShowChannels(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!session?.user) return;
    const result = await toggleReaction(messageId, session.user.id, emoji);
    if (result.action === "added") {
      setReactions((prev) => [...prev, { id: result.reaction!.id, messageId, userId: session.user.id, emoji, userName: session.user.name }]);
    } else {
      setReactions((prev) => prev.filter((r) => !(r.messageId === messageId && r.userId === session.user.id && r.emoji === emoji)));
    }
    setEmojiPicker(null);
  };

  const pick = (ch: Channel) => { setActive(ch); setMobileShowChannels(false); };

  const getMessageReactions = (msgId: string) => {
    const msgReactions = reactions.filter((r) => r.messageId === msgId);
    const grouped: Record<string, { emoji: string; count: number; userIds: string[]; userNames: string[] }> = {};
    for (const r of msgReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [], userNames: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
      grouped[r.emoji].userNames.push(r.userName ?? "Unknown");
    }
    return Object.values(grouped);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 md:gap-3">
      {/* Channel list */}
      <div className={cn(
        "md:w-56 flex flex-col flex-shrink-0 border border-white/[0.04] rounded-xl",
        mobileShowChannels ? "w-full md:w-56" : "hidden md:flex"
      )}>
        <div className="px-3 py-3 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground/45">Channels</span>
          <button onClick={() => setShowNew(!showNew)} className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors duration-150">
            <Plus className="w-3 h-3 text-foreground/40" />
          </button>
        </div>

        {showNew && (
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <Input
              placeholder="Channel name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCh()}
              className="h-7 text-[12px] bg-white/[0.02] border-white/[0.06]"
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1.5">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => pick(ch)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors duration-150 text-left",
                active?.id === ch.id ? "bg-white/[0.06] text-foreground/70" : "text-foreground/50 hover:text-foreground/50 hover:bg-white/[0.02]"
              )}
            >
              <Hash className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
            {connected ? <><Wifi className="w-3 h-3 text-emerald-500/60" /> Connected</> : <><WifiOff className="w-3 h-3 text-red-400/60" /> Offline</>}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex-1 flex flex-col border border-white/[0.04] rounded-xl min-w-0",
        mobileShowChannels ? "hidden md:flex" : "flex"
      )}>
        {active ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
              <button onClick={() => setMobileShowChannels(true)} className="md:hidden w-7 h-7 rounded-md hover:bg-white/[0.04] flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 text-foreground/40" />
              </button>
              <Hash className="w-4 h-4 text-foreground/40" />
              <span className="text-[14px] font-medium text-foreground/70">{active.name}</span>
              <span className="text-[11px] text-foreground/35 ml-1">{messages.length}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-1.5">
                {messages.map((msg, i) => {
                  const isMe = msg.userId === session?.user?.id;
                  const showHead = i === 0 || messages[i - 1].userId !== msg.userId;
                  const msgReactions = getMessageReactions(msg.id);

                  return (
                    <div
                      key={msg.id}
                      className={cn("relative group", showHead ? "mt-4 first:mt-0" : "mt-0.5")}
                      onMouseEnter={() => setHoveredMsg(msg.id)}
                      onMouseLeave={() => { setHoveredMsg(null); setEmojiPicker(null); }}
                    >
                      <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                          {showHead && !isMe && (
                            <div className="flex items-center gap-2 mb-1 ml-1">
                              <span className="text-[11px] font-medium text-foreground/50">{msg.userName ?? "Unknown"}</span>
                              <span className="text-[10px] text-foreground/25">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          )}
                          {showHead && isMe && (
                            <div className="flex items-center justify-end gap-2 mb-1 mr-1">
                              <span className="text-[10px] text-foreground/25">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          )}
                          <div className={cn(
                            "px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed break-words",
                            isMe
                              ? "bg-[#14F195]/15 text-foreground/85 rounded-br-md"
                              : "bg-white/[0.06] text-foreground/75 rounded-bl-md"
                          )}>
                            {msg.content}
                          </div>

                          {/* Reactions */}
                          {msgReactions.length > 0 && (
                            <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                              {msgReactions.map((r) => (
                                <button
                                  key={r.emoji}
                                  onClick={() => handleReaction(msg.id, r.emoji)}
                                  title={r.userNames.join(", ")}
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] transition-colors duration-150 border",
                                    r.userIds.includes(session?.user?.id ?? "")
                                      ? "bg-[#14F195]/10 border-[#14F195]/20 text-foreground/70"
                                      : "bg-white/[0.03] border-white/[0.06] text-foreground/50 hover:bg-white/[0.06]"
                                  )}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="text-[10px] tabular-nums">{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover emoji picker */}
                      {hoveredMsg === msg.id && (
                        <div className={cn("absolute -top-3 flex items-center gap-0.5 bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-0.5 shadow-lg z-10", isMe ? "left-0" : "right-0")}>
                          {emojiPicker === msg.id ? (
                            <div className="flex items-center gap-0.5 px-1">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className="w-7 h-7 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-[14px] transition-colors duration-100"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEmojiPicker(msg.id)}
                              className="w-7 h-7 rounded-md hover:bg-white/[0.08] flex items-center justify-center transition-colors duration-100"
                              title="Add reaction"
                            >
                              <SmilePlus className="w-3.5 h-3.5 text-foreground/40" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>

            {/* Typing */}
            {typing.length > 0 && (
              <div className="px-4 py-1 text-[11px] text-foreground/40">{typing.join(", ")} typing...</div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/[0.04]">
              <div className="flex gap-2">
                <Input
                  placeholder={`Message #${active.name}`}
                  value={input}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
                />
                <button onClick={send} className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] flex items-center justify-center transition-all duration-150 flex-shrink-0">
                  <Send className="w-3.5 h-3.5 text-foreground/40" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-foreground/40">Select a channel</p>
          </div>
        )}
      </div>
    </div>
  );
}
