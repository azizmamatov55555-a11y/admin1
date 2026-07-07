"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchFilialOptions } from "@/lib/directory";
import type { Group } from "@/types/models";

export default function ScheduleGroupsPage() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filialNames, setFilialNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      setError(null);
      try {
        const base = collection(db, "groups");
        const constraints =
          profile.role === "FILIAL_ADMIN" && profile.filialId
            ? [where("filialId", "==", profile.filialId)]
            : [];
        const [snap, filials] = await Promise.all([
          getDocs(query(base, ...constraints)),
          fetchFilialOptions(profile.role === "FILIAL_ADMIN" ? profile.filialId : undefined),
        ]);
        setGroups(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Group));
        setFilialNames(Object.fromEntries(filials.map((f) => [f.id, f.name])));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const showFilialColumn = profile?.role !== "FILIAL_ADMIN";

  return (
    <div>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Dars jadvali</h1>
      <p className="mb-6 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
        Jadvalni tahrirlash uchun guruhni tanlang
      </p>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          Xatolik: {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="px-4 py-12 text-center text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
            Yuklanmoqda...
          </p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
            Guruhlar yo&apos;q
          </p>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              href={`/schedule/${g.id}`}
              className="flex items-center justify-between px-5 py-3.5 transition-colors duration-100 hover:bg-[var(--surface-muted)]"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div>
                <p className="text-[14px] font-medium">
                  {g.subject}
                  {g.grade ? ` · ${g.grade}` : ""}
                </p>
                <p className="text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
                  {showFilialColumn && g.filialId ? `${filialNames[g.filialId] || g.filialId} · ` : ""}
                  {g.teacherName || "O'qituvchi tayinlanmagan"}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
