"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        "Kirib bo'lmadi. Email va parolni tekshiring." +
          (process.env.NODE_ENV === "development" ? ` (${(err as Error).message})` : ""),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-[380px] p-8 transition-shadow duration-300"
      >
        <h1 className="mb-1 text-[20px] font-semibold tracking-tight">Ziyo Admin</h1>
        <p className="mb-7 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
          Boshqaruv paneliga kirish
        </p>

        {error && (
          <div
            className="mb-4 rounded-[10px] px-3.5 py-2.5 text-[13px]"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}

        <label className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mb-4"
          placeholder="admin@qorakolziyo.uz"
          autoComplete="username"
        />

        <label className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          Parol
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mb-6"
          autoComplete="current-password"
        />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Kirilmoqda..." : "Kirish"}
        </button>

        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Ilovadagi bilan bir xil email/parol
        </p>
      </form>
    </main>
  );
}
