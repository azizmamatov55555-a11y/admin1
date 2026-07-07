"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Phone } from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Filial } from "@/types/models";

export default function FilialsPage() {
  const { profile } = useAuth();
  const [filials, setFilials] = useState<Filial[]>([]);
  const [managerNames, setManagerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = profile?.role === "BOSH_ADMIN" || profile?.role === "ADMIN";

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      setError(null);
      try {
        const base = collection(db, "filials");
        const snap = canManage
          ? await getDocs(base)
          : await getDocs(query(base, where("__name__", "==", profile.filialId || "__none__")));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Filial);
        setFilials(list);

        const managerUids = [...new Set(list.map((f) => f.managerUid).filter(Boolean))];
        if (managerUids.length) {
          const names: Record<string, string> = {};
          await Promise.all(
            managerUids.map(async (uid) => {
              const usnap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
              names[uid] = usnap.docs[0]?.data()?.name || uid;
            }),
          );
          setManagerNames(names);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile, canManage]);

  async function onDelete(id: string) {
    if (!confirm("Filialni o'chirishni tasdiqlaysizmi?")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "filials", id));
      setFilials((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      alert("O'chirib bo'lmadi: " + (e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight">Filiallar</h1>
        {canManage && (
          <Link href="/filials/new" className="btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            Yaratish
          </Link>
        )}
      </div>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          Xatolik: {error}
        </div>
      )}

      {loading ? (
        <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Yuklanmoqda...</p>
      ) : filials.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Filiallar yo&apos;q</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filials.map((f) => (
            <div key={f.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between">
                <h2 className="text-[16px] font-semibold">{f.name}</h2>
                {canManage && (
                  <div className="flex gap-3">
                    <Link
                      href={`/filials/${f.id}`}
                      className="text-[13px] font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Tahrirlash
                    </Link>
                    <button
                      onClick={() => onDelete(f.id)}
                      disabled={deletingId === f.id}
                      className="text-[13px] font-medium disabled:opacity-40"
                      style={{ color: "var(--danger)" }}
                    >
                      O&apos;chirish
                    </button>
                  </div>
                )}
              </div>

              {f.address && (
                <p className="mb-1 flex items-center gap-2 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
                  <MapPin size={14} /> {f.address}
                </p>
              )}
              {f.phone && (
                <p className="mb-1 flex items-center gap-2 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
                  <Phone size={14} /> {f.phone}
                </p>
              )}
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
                Menejer: {f.managerUid ? managerNames[f.managerUid] || "…" : "tayinlanmagan"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
