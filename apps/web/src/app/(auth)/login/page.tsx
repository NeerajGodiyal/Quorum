"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock } from "lucide-react";

/*
  Utilitarian login. Fast. No gratuitous animation.
  Only animate: error messages (feedback), mode toggle (state change).
*/

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn.email({ email: form.email, password: form.password });
      if (result.error) { setError(result.error.message ?? "Invalid credentials"); setLoading(false); return; }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-[360px]">
        {/* Header */}
        <div className="mb-8">
          <img src="/logo.png" alt="Overclock" className="w-8 h-8 mb-6" />
          <h1 className="text-[22px] font-medium text-foreground/90 tracking-[-0.02em]">
            Sign in
          </h1>
          <p className="text-[14px] text-foreground/50 mt-1">
            Enter your credentials to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-foreground/35" />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="pl-9 h-10 text-[14px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] rounded-lg"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-foreground/35" />
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pl-9 h-10 text-[14px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] rounded-lg"
              required
              minLength={8}
            />
          </div>

          {/* Error — brief fade for feedback */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="text-[13px] text-red-400/80 py-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[14px] font-medium text-foreground/80 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Info */}
        <p className="mt-6 text-center text-[12px] text-foreground/25">
          Contact an admin if you need an account.
        </p>
      </div>
    </div>
  );
}
