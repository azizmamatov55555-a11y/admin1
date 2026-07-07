"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(firebaseUser ? "/dashboard" : "/login");
  }, [loading, firebaseUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      Yuklanmoqda...
    </div>
  );
}
