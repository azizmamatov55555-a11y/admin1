"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Group } from "@/types/models";

export default function GroupsPage() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const base = collection(db, "groups");
        const constraints =
          profile?.role === "FILIAL_ADMIN" && profile.filialId
            ? [where("filialId", "==", profile.filialId)]
            : [];
        const snap = await getDocs(query(base, ...constraints));
        setGroups(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Group));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  async function onDelete(id: string) {
    if (!confirm("Guruhni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "groups", id));
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      alert("O'chirib bo'lmadi: " + (e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight">Guruhlar</h1>
        <Link href="/groups/new" className="btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          Yaratish
        </Link>
      </div>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          Xatolik: {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead style={{ borderBottom: "1px solid var(--border)" }}>
            <tr>
              {["Fan / Sinf", "O'qituvchi", "O'quvchilar soni", ""].map((h, i) => (
                <th
                  key={h + i}
                  className={`px-4 py-3 text-left text-[11.5px] font-medium uppercase tracking-wide ${i === 3 ? "text-right" : ""}`}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Hali guruhlar yo&apos;q
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <tr
                  key={g.id}
                  className="transition-colors duration-100 hover:bg-[var(--surface-muted)]"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3 font-medium">
                    {g.subject}
                    {g.grade ? ` · ${g.grade}` : ""}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {g.teacherName || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {g.studentCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/groups/${g.id}`}
                      className="mr-4 text-[13px] font-medium transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Tahrirlash
                    </Link>
                    <button
                      onClick={() => onDelete(g.id)}
                      disabled={deletingId === g.id}
                      className="text-[13px] font-medium disabled:opacity-40"
                      style={{ color: "var(--danger)" }}
                    >
                      {deletingId === g.id ? "..." : "O'chirish"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
