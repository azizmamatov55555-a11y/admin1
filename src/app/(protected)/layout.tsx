"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/login?denied=1");
    }
  }, [loading, firebaseUser, isAdmin, router]);

  if (loading || !firebaseUser || !isAdmin) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}
      >
        {loading ? "Yuklanmoqda..." : "Yo'naltirilmoqda..."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            {profile?.filialId ? `Filial: ${profile.filialId}` : "Barcha filiallar"}
          </div>
          <div key={pathname} className="page-transition">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
