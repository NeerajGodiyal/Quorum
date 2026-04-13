"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getResource, updateResource, deleteResource } from "../actions";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Resource { id: string; name: string; type: string; description: string | null; capacity: number | null; createdAt: Date; }

export default function ResourceDetailPage() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("tool");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    getResource(resourceId).then((r) => {
      if (!r) { router.push("/resources"); return; }
      setResource(r as Resource);
      setName(r.name);
      setDescription(r.description ?? "");
      setType(r.type);
      setCapacity(r.capacity?.toString() ?? "");
      setLoading(false);
    });
  }, [resourceId, router]);

  const save = async () => {
    await updateResource(resourceId, {
      name,
      description: description || undefined,
      type,
      capacity: capacity ? parseInt(capacity) : undefined,
    });
  };

  const remove = async () => {
    await deleteResource(resourceId);
    router.push("/resources");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  }

  const selectClass = "h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-foreground/50 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div className="">
      {/* Back */}
      <button onClick={() => router.push("/resources")} className="flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground/60 transition-colors duration-150 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Resources
      </button>

      {/* Title */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90 bg-transparent border-none outline-none w-full placeholder:text-foreground/40"
        placeholder="Resource name"
      />

      {/* Meta */}
      <div className="flex items-center gap-3 mt-3">
        <select value={type} onChange={(e) => setType(e.target.value)} onBlur={save} className={selectClass}>
          <option value="person">Person</option>
          <option value="tool">Tool</option>
          <option value="budget">Budget</option>
          <option value="document">Document</option>
          <option value="other">Other</option>
        </select>
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          onBlur={save}
          type="number"
          className="w-24 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-foreground/50 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
          placeholder="Capacity"
        />
      </div>

      {/* Description */}
      <div className="mt-6 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          className="text-[14px] text-foreground/60 bg-transparent border-none outline-none w-full min-h-[120px] resize-none leading-relaxed placeholder:text-foreground/35"
          placeholder="Add details about this resource..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] text-foreground/35">
          Created {resource?.createdAt ? new Date(resource.createdAt).toLocaleDateString() : ""}
        </span>
        <button onClick={remove} className="text-[12px] text-foreground/35 hover:text-red-400/70 transition-colors duration-150">
          Delete resource
        </button>
      </div>
    </div>
  );
}
