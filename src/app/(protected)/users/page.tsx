"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { AppUser, UserRole } from "@/types/models";

const TABS: { label: string; role: UserRole | "ALL" }[] = [
  { label: "Barchasi", role: "ALL" },
  { label: "O'quvchilar", role: "STUDENT" },
  { label: "O'qituvchilar", role: "TEACHER" },
  { label: "Ota-onalar", role: "PARENT" },
];

export default function UsersPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<UserRole | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const base = collection(db, "users");
        const constraints = [];
        if (profile?.role === "FILIAL_ADMIN" && profile.filialId) {
          constraints.push(where("filialId", "==", profile.filialId));
        }
        if (tab !== "ALL") {
          constraints.push(where("role", "==", tab));
        }
        constraints.push(orderBy("name"));

        const snap = await getDocs(query(base, ...constraints));
        setUsers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as object) }) as AppUser));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-semibold tracking-tight">Foydalanuvchilar</h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex gap-1 rounded-[12px] p-1"
          style={{ background: "var(--surface-muted)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.role}
              onClick={() => setTab(t.role)}
              className="rounded-[9px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150"
              style={
                tab === t.role
                  ? { background: "var(--surface)", color: "var(--text)", boxShadow: "var(--shadow-card)" }
                  : { color: "var(--text-secondary)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, email yoki telefon"
            className="input w-72 pl-9"
          />
        </div>
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
              {["Ism", "Rol", "Telefon", "Email", "Guruhlar"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11.5px] font-medium uppercase tracking-wide"
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
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Hech narsa topilmadi
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.uid}
                  className="transition-colors duration-100 hover:bg-[var(--surface-muted)]"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {u.phone || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {u.email || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {u.groupIds?.length ? u.groupIds.join(", ") : u.groupId || "—"}
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

function RoleBadge({ role }: { role: UserRole }) {
  const isAdminRole = role === "ADMIN" || role === "BOSH_ADMIN" || role === "FILIAL_ADMIN";
  const style = isAdminRole
    ? { background: "var(--text)", color: "var(--surface)" }
    : { background: "var(--surface-muted)", color: "var(--text-secondary)" };
  return (
    <span className="badge" style={style}>
      {role}
    </span>
  );
}
