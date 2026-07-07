"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Banknote, Landmark, Trash2 } from "lucide-react";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  computeDebtStatus,
  debtRemaining,
  formatUzs,
  type Debt,
  type DebtPayment,
  type DebtStatus,
} from "@/types/models";

const STATUS_LABEL: Record<DebtStatus, { label: string; bg: string; fg: string }> = {
  PENDING: { label: "To'lanmagan", bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
  PARTIAL: { label: "Qisman to'langan", bg: "var(--warning-soft)", fg: "var(--warning)" },
  PAID: { label: "To'liq to'langan", bg: "var(--success-soft)", fg: "var(--success)" },
  OVERDUE: { label: "Muddati o'tgan", bg: "var(--danger-soft)", fg: "var(--danger)" },
};

const PAYMENT_METHODS = [
  { key: "cash", label: "Naqd pul", icon: Banknote },
  { key: "transfer", label: "O'tkazma", icon: Landmark },
  { key: "card", label: "Karta", icon: CreditCard },
];

export default function DebtDetailPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, "debts", params.id));
        if (snap.exists()) {
          setDebt({ id: snap.id, ...(snap.data() as object) } as Debt);
        } else {
          setError("Topilmadi");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function onAddPayment() {
    if (!debt) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("To'g'ri summa kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const effectiveTotal = debt.totalAmount > 0 ? debt.totalAmount : debt.amount;
      const newPayment: DebtPayment = {
        id: crypto.randomUUID(),
        amount: value,
        paidAt: Date.now(),
        note: note.trim() || PAYMENT_METHODS.find((m) => m.key === method)?.label || "",
        adminUid: profile?.uid ?? "",
        adminName: profile?.name ?? "",
      };
      const newPaidAmount = debt.paidAmount + value;
      const updated: Debt = {
        ...debt,
        paidAmount: newPaidAmount,
        payments: [...debt.payments, newPayment],
        isPaid: newPaidAmount >= effectiveTotal,
      };
      updated.status = computeDebtStatus(updated);

      await setDoc(doc(db, "debts", debt.id), updated, { merge: true });
      setDebt(updated);
      setAmount("");
      setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!debt) return;
    if (!confirm("To'lov yozuvini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, "debts", debt.id));
      router.push("/debts");
    } catch (e) {
      alert("O'chirib bo'lmadi: " + (e as Error).message);
    }
  }

  if (loading) {
    return <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Yuklanmoqda...</p>;
  }

  if (!debt) {
    return (
      <div
        className="rounded-[12px] px-4 py-3 text-[13px]"
        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
      >
        {error || "Topilmadi"}
      </div>
    );
  }

  const status = computeDebtStatus(debt);
  const remaining = debtRemaining(debt);
  const effectiveTotal = debt.totalAmount > 0 ? debt.totalAmount : debt.amount;
  const percent = effectiveTotal > 0 ? Math.min(debt.paidAmount / effectiveTotal, 1) : 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">{debt.studentName}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
            {debt.groupName || "—"} {debt.month ? `· ${debt.month}` : ""}
          </p>
        </div>
        <button onClick={onDelete} className="btn-danger">
          <Trash2 size={15} />
          O&apos;chirish
        </button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      {/* Сводка */}
      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span
            className="badge"
            style={{ background: STATUS_LABEL[status].bg, color: STATUS_LABEL[status].fg }}
          >
            {STATUS_LABEL[status].label}
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Jami: <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>{formatUzs(effectiveTotal)}</span>
          </span>
        </div>

        <div
          className="mb-2 h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--surface-muted)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percent * 100}%`, background: "var(--accent)" }}
          />
        </div>
        <div className="flex justify-between text-[13px]" style={{ color: "var(--text-secondary)" }}>
          <span>To&apos;langan: {formatUzs(debt.paidAmount)}</span>
          <span>Qolgan: {formatUzs(remaining)}</span>
        </div>
      </div>

      {/* Добавить платёж */}
      {remaining > 0 && (
        <div className="card mb-6 p-6">
          <h2 className="mb-4 text-[15px] font-semibold">To&apos;lov qo&apos;shish</h2>
          <div className="mb-4 flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Masalan: ${remaining}`}
              className="input flex-1"
            />
            <button onClick={() => setAmount(String(remaining))} className="btn-secondary shrink-0">
              To&apos;liq
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-medium transition-all duration-150"
                  style={
                    active
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { background: "var(--surface-muted)", color: "var(--text-secondary)" }
                  }
                >
                  <Icon size={15} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Izoh (ixtiyoriy)"
            className="input mb-4"
          />

          <button onClick={onAddPayment} disabled={saving} className="btn-primary w-full">
            {saving ? "Saqlanmoqda..." : "To'lovni saqlash"}
          </button>
        </div>
      )}

      {/* История платежей */}
      <div className="card p-6">
        <h2 className="mb-4 text-[15px] font-semibold">To&apos;lovlar tarixi</h2>
        {debt.payments.length === 0 ? (
          <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
            Hali to&apos;lovlar yo&apos;q
          </p>
        ) : (
          <div className="space-y-3">
            {[...debt.payments].reverse().map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-[13.5px] font-medium">{formatUzs(p.amount)}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(p.paidAt).toLocaleDateString("ru-RU")} {p.note ? `· ${p.note}` : ""}
                  </p>
                </div>
                {p.adminName && (
                  <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {p.adminName}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
