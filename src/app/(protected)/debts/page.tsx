"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { computeDebtStatus, debtRemaining, formatUzs, type Debt, type DebtStatus } from "@/types/models";

const STATUS_TABS: { label: string; value: DebtStatus | "ALL" }[] = [
  { label: "Barchasi", value: "ALL" },
  { label: "To'lanmagan", value: "PENDING" },
  { label: "Qisman", value: "PARTIAL" },
  { label: "To'langan", value: "PAID" },
  { label: "Muddati o'tgan", value: "OVERDUE" },
];

export default function DebtsPage() {
  const { profile } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [status, setStatus] = useState<DebtStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const base = collection(db, "debts");
        const constraints =
          profile?.role === "FILIAL_ADMIN" && profile.filialId
            ? [where("filialId", "==", profile.filialId)]
            : [];
        const snap = await getDocs(query(base, ...constraints, orderBy("createdAt", "desc")));
        setDebts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Debt));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  const withStatus = useMemo(
    () => debts.map((d) => ({ debt: d, status: computeDebtStatus(d) })),
    [debts],
  );

  const filtered = status === "ALL" ? withStatus : withStatus.filter((x) => x.status === status);

  const totals = useMemo(() => {
    const total = debts.reduce((s, d) => s + (d.totalAmount > 0 ? d.totalAmount : d.amount), 0);
    const remaining = debts.reduce((s, d) => s + debtRemaining(d), 0);
    return { total, remaining };
  }, [debts]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight">Moliyaviy boshqaruv</h1>
        <Link href="/debts/new" className="btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          To&apos;lov yaratish
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Jami summa
          </p>
          <p className="mt-1.5 text-[24px] font-semibold tabular-nums">{formatUzs(totals.total)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Qolgan qarzdorlik
          </p>
          <p
            className="mt-1.5 text-[24px] font-semibold tabular-nums"
            style={{ color: totals.remaining > 0 ? "var(--warning)" : "var(--success)" }}
          >
            {formatUzs(totals.remaining)}
          </p>
        </div>
      </div>

      <div
        className="mb-4 inline-flex gap-1 rounded-[12px] p-1"
        style={{ background: "var(--surface-muted)" }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className="rounded-[9px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150"
            style={
              status === t.value
                ? { background: "var(--surface)", color: "var(--text)", boxShadow: "var(--shadow-card)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {t.label}
          </button>
        ))}
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
              {["O'quvchi", "Guruh / Oy", "Jami", "To'langan", "Qolgan", "Holat"].map((h) => (
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
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--text-tertiary)" }}>
                  Hech narsa topilmadi
                </td>
              </tr>
            ) : (
              filtered.map(({ debt: d, status: st }) => (
                <tr
                  key={d.id}
                  className="cursor-pointer transition-colors duration-100 hover:bg-[var(--surface-muted)]"
                  style={{ borderTop: "1px solid var(--border)" }}
                  onClick={() => (window.location.href = `/debts/${d.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{d.studentName || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {d.groupName || "—"}
                    {d.month ? ` · ${d.month}` : ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatUzs(d.totalAmount > 0 ? d.totalAmount : d.amount)}
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatUzs(d.paidAmount)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{formatUzs(debtRemaining(d))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={st} />
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

function StatusBadge({ status }: { status: DebtStatus }) {
  const map: Record<DebtStatus, { label: string; bg: string; fg: string }> = {
    PENDING: { label: "To'lanmagan", bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
    PARTIAL: { label: "Qisman", bg: "var(--warning-soft)", fg: "var(--warning)" },
    PAID: { label: "To'langan", bg: "var(--success-soft)", fg: "var(--success)" },
    OVERDUE: { label: "Muddati o'tgan", bg: "var(--danger-soft)", fg: "var(--danger)" },
  };
  const s = map[status];
  return (
    <span className="badge" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
