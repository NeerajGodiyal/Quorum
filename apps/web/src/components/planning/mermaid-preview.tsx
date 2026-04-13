"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Loader2, AlertCircle } from "lucide-react";

interface MermaidPreviewProps {
  code: string;
}

// Initialize once
let initialized = false;

export function MermaidPreview({ code }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        themeVariables: {
          darkMode: true,
          background: "transparent",
          primaryColor: "#1a3a2a",
          primaryTextColor: "rgba(255,255,255,0.85)",
          primaryBorderColor: "#14F195",
          lineColor: "rgba(255,255,255,0.25)",
          secondaryColor: "#1a2a3a",
          secondaryBorderColor: "#3B82F6",
          secondaryTextColor: "rgba(255,255,255,0.85)",
          tertiaryColor: "#2a1a2a",
          tertiaryBorderColor: "#8B5CF6",
          tertiaryTextColor: "rgba(255,255,255,0.85)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "13px",
          nodeTextColor: "rgba(255,255,255,0.85)",
          nodeBorder: "#14F195",
          clusterBkg: "rgba(255,255,255,0.02)",
          clusterBorder: "rgba(255,255,255,0.08)",
          edgeLabelBackground: "#141414",
          noteBkgColor: "#1a1a1a",
          noteTextColor: "rgba(255,255,255,0.7)",
        },
        flowchart: {
          curve: "basis",
          padding: 16,
          nodeSpacing: 50,
          rankSpacing: 60,
          htmlLabels: false,
        },
      });
      initialized = true;
    }
  }, []);

  useEffect(() => {
    if (!code.trim()) {
      setError(null);
      setLoading(false);
      return;
    }

    const currentId = ++renderIdRef.current;

    const render = async () => {
      try {
        setLoading(true);
        setError(null);

        const id = `mermaid-${currentId}-${Date.now()}`;
        const { svg } = await mermaid.render(id, code.trim());

        if (currentId === renderIdRef.current && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            const vb = svgEl.getAttribute("viewBox")?.split(" ");
            const intrinsicW = vb ? parseFloat(vb[2]) : 500;
            svgEl.removeAttribute("height");
            svgEl.setAttribute("width", String(intrinsicW));
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.display = "block";
            svgEl.style.margin = "0 auto";
            // Hide Mermaid branding and error artifacts
            svgEl.querySelectorAll("[class*='error'], [id*='mermaid-logo'], [class*='version']").forEach((el) => {
              (el as HTMLElement).style.display = "none";
            });
          }
          setError(null);
        }
      } catch (err: any) {
        if (currentId === renderIdRef.current) {
          setError(err?.message?.split("\n")[0] ?? "Invalid syntax");
        }
      } finally {
        if (currentId === renderIdRef.current) setLoading(false);
      }
    };

    const timeout = setTimeout(render, 600);
    return () => clearTimeout(timeout);
  }, [code]);

  if (!code.trim()) {
    return <p className="text-[13px] text-foreground/40">Enter Mermaid syntax to preview</p>;
  }

  return (
    <div className="w-full">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-400/60 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-400/60 leading-relaxed">{error}</p>
        </div>
      )}
      {loading && !containerRef.current?.innerHTML && (
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40 mx-auto" />
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
