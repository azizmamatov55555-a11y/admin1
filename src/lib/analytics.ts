import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { computeDebtStatus, type Debt, type DebtStatus } from "@/types/models";

export interface MonthlyRevenuePoint {
  month: string; // "2026-05"
  label: string; // "Май"
  total: number;
}

const MONTH_LABELS = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyun",
  "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek",
];

/**
 * Выручка (сумма всех платежей внутри debt.payments[]) помесячно за последние N месяцев.
 */
export function aggregateMonthlyRevenue(debts: Debt[], months = 6): MonthlyRevenuePoint[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  const order: string[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
    order.push(key);
  }

  for (const debt of debts) {
    for (const p of debt.payments) {
      const d = new Date(p.paidAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
      }
    }
  }

  return order.map((key) => {
    const monthIdx = Number(key.split("-")[1]) - 1;
    return { month: key, label: MONTH_LABELS[monthIdx], total: buckets.get(key) ?? 0 };
  });
}

export interface DebtStatusSlice {
  status: DebtStatus;
  label: string;
  count: number;
  color: string;
}

export function aggregateDebtStatusDistribution(debts: Debt[]): DebtStatusSlice[] {
  const counts: Record<DebtStatus, number> = { PENDING: 0, PARTIAL: 0, PAID: 0, OVERDUE: 0 };
  for (const d of debts) counts[computeDebtStatus(d)]++;

  return [
    { status: "PAID", label: "To'langan", count: counts.PAID, color: "#1e8e5a" },
    { status: "PARTIAL", label: "Qisman", count: counts.PARTIAL, color: "#b7791f" },
    { status: "PENDING", label: "To'lanmagan", count: counts.PENDING, color: "#98989d" },
    { status: "OVERDUE", label: "Muddati o'tgan", count: counts.OVERDUE, color: "#d93025" },
  ];
}

export interface FilialDistributionPoint {
  filialId: string;
  name: string;
  students: number;
}

export async function aggregateStudentsByFilial(
  filialOptions: { id: string; name: string }[],
): Promise<FilialDistributionPoint[]> {
  const results = await Promise.all(
    filialOptions.map(async (f) => {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "STUDENT"), where("filialId", "==", f.id)),
      );
      return { filialId: f.id, name: f.name, students: snap.size };
    }),
  );
  return results;
}

export interface AttendancePoint {
  date: string; // "2026-07-01"
  label: string; // "01.07"
  presentRate: number; // 0..1
}

/**
 * Процент присутствия по дням за последние N дней — по коллекции `attendance`.
 *
 * ВАЖНО: у attendance нет поля filialId — только groupId. Firestore-правила
 * (eduDocReadableByGroupScopedRole) проверяются ПОДОКУМЕНТНО, и если хотя бы
 * один документ в результате запроса не проходит правило — ВЕСЬ запрос
 * целиком падает с permission-denied (Firestore list-запросы не фильтруют
 * частично). Поэтому для FILIAL_ADMIN обязательно передавать groupIds —
 * иначе запрос ко всей коллекции упадёт, как только в базе появится
 * attendance чужого филиала.
 */
export async function aggregateAttendanceTrend(
  groupIds: string[] | undefined,
  days = 14,
): Promise<AttendancePoint[]> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);

  const base = collection(db, "attendance");
  const constraints = [where("date", ">=", from.getTime())];
  if (groupIds && groupIds.length > 0) {
    constraints.push(where("groupId", "in", groupIds.slice(0, 10)));
  }

  const snap = await getDocs(query(base, ...constraints));

  const byDay = new Map<string, { present: number; total: number }>();
  const order: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, { present: 0, total: 0 });
    order.push(key);
  }

  snap.docs.forEach((doc) => {
    const data = doc.data();
    const d = new Date(data.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const bucket = byDay.get(key);
    if (!bucket) return;
    bucket.total++;
    if (data.status === "PRESENT") bucket.present++;
  });

  return order.map((key) => {
    const [, m, d] = key.split("-");
    const bucket = byDay.get(key)!;
    return {
      date: key,
      label: `${d}.${m}`,
      presentRate: bucket.total > 0 ? bucket.present / bucket.total : 0,
    };
  });
}
