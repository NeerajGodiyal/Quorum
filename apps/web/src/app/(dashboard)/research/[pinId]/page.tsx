"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPin, updatePin, deletePin } from "../actions";
import { ArrowLeft, ExternalLink, Loader2, Trash2 } from "lucide-react";

interface Pin { id: string; title: string; url: string | null; description: string | null; content: string | null; tags: string; createdAt: Date; }

export default function PinDetailPage() {
  const { pinId } = useParams<{ pinId: string }>();
  const router = useRouter();
  const [pin, setPin] = useState<Pin | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    getPin(pinId).then((p) => {
      if (!p) { router.push("/research"); return; }
      setPin(p as Pin);
      setTitle(p.title);
      setDescription(p.description ?? "");
      setContent(p.content ?? "");
      setUrl(p.url ?? "");
      const parsedTags: string[] = (() => { try { return JSON.parse(p.tags); } catch { return []; } })();
      setTags(parsedTags.join(", "));
      setLoading(false);
    });
  }, [pinId, router]);

  const save = async () => {
    await updatePin(pinId, {
      title,
      description: description || undefined,
      content: content || undefined,
      url: url || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  const remove = async () => {
    await deletePin(pinId);
    router.push("/research");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  }

  let hostname = "";
  try { if (url) hostname = new URL(url).hostname; } catch {}

  return (
    <div className="">
      {/* Back */}
      <button onClick={() => router.push("/research")} className="flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground/60 transition-colors duration-150 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Research
      </button>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90 bg-transparent border-none outline-none w-full placeholder:text-foreground/40"
        placeholder="Pin title"
      />

      {/* URL */}
      <div className="flex items-center gap-2 mt-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={save}
          className="text-[13px] text-foreground/50 bg-transparent border-none outline-none flex-1 placeholder:text-foreground/35"
          placeholder="https://..."
        />
        {hostname && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-foreground/40 hover:text-foreground/40 transition-colors duration-150 flex-shrink-0">
            <ExternalLink className="w-3 h-3" /> Open
          </a>
        )}
      </div>

      {/* Description */}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={save}
        className="text-[13px] text-foreground/40 bg-transparent border-none outline-none w-full mt-3 placeholder:text-foreground/35"
        placeholder="Brief description..."
      />

      {/* Tags */}
      <div className="mt-3">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={save}
          className="text-[12px] text-foreground/45 bg-transparent border-none outline-none w-full placeholder:text-foreground/35"
          placeholder="Tags (comma separated)"
        />
      </div>

      {/* Content / Notes */}
      <div className="mt-6 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={save}
          className="text-[14px] text-foreground/60 bg-transparent border-none outline-none w-full min-h-[200px] resize-none leading-relaxed placeholder:text-foreground/35"
          placeholder="Write detailed notes here..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] text-foreground/35">
          Created {pin?.createdAt ? new Date(pin.createdAt).toLocaleDateString() : ""}
        </span>
        <button onClick={remove} className="text-[12px] text-foreground/35 hover:text-red-400/70 transition-colors duration-150">
          Delete pin
        </button>
      </div>
    </div>
  );
}
