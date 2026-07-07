"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchFilialOptions } from "@/lib/directory";
import {
  aggregateAttendanceTrend,
  aggregateDebtStatusDistribution,
  aggregateMonthlyRevenue,
  aggregateStudentsByFilial,
  type AttendancePoint,
  type DebtStatusSlice,
  type FilialDistributionPoint,
  type MonthlyRevenuePoint,
} from "@/lib/analytics";
import { formatUzs, type Debt, type Group } from "@/types/models";

type Counts = { students: number; teachers: number; parents: number; total: number };

export default function DashboardPage() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [revenue, setRevenue] = useState<MonthlyRevenuePoint[]>([]);
  const [debtSlices, setDebtSlices] = useState<DebtStatusSlice[]>([]);
  const [byFilial, setByFilial] = useState<FilialDistributionPoint[]>([]);
  const [attendance, setAttendance] = useState<AttendancePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isFilialAdmin = profile?.role === "FILIAL_ADMIN";

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      setError(null);
      try {
        const filialFilter =
          isFilialAdmin && profile.filialId ? [where("filialId", "==", profile.filialId)] : [];
        const usersBase = collection(db, "users");

        const [students, teachers, parents, total] = await Promise.all([
          getCountFromServer(query(usersBase, ...filialFilter, where("role", "==", "STUDENT"))),
          getCountFromServer(query(usersBase, ...filialFilter, where("role", "==", "TEACHER"))),
          getCountFromServer(query(usersBase, ...filialFilter, where("role", "==", "PARENT"))),
          getCountFromServer(query(usersBase, ...filialFilter)),
        ]);
        setCounts({
          students: students.data().count,
          teachers: teachers.data().count,
          parents: parents.data().count,
          total: total.data().count,
        });

        // Долги/выручка
        const debtsSnap = await getDocs(query(collection(db, "debts"), ...filialFilter));
        const debts = debtsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Debt);
        setRevenue(aggregateMonthlyRevenue(debts, 6));
        setDebtSlices(aggregateDebtStatusDistribution(debts));

        // Группы (нужны для scoped attendance-запроса у FILIAL_ADMIN)
        const groupsSnap = await getDocs(query(collection(db, "groups"), ...filialFilter));
        const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Group);
        const groupIdsForAttendance = isFilialAdmin ? groups.map((g) => g.id) : undefined;
        setAttendance(await aggregateAttendanceTrend(groupIdsForAttendance, 14));

        // Студенты по филиалам — не имеет смысла для FILIAL_ADMIN (у него один филиал)
        if (!isFilialAdmin) {
          const filials = await fetchFilialOptions();
          setByFilial(await aggregateStudentsByFilial(filials));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile, isFilialAdmin]);

  const totalRevenue = useMemo(() => revenue.reduce((s, r) => s + r.total, 0), [revenue]);
  const avgAttendance = useMemo(() => {
    const withData = attendance.filter((a) => a.presentRate > 0 || a.presentRate === 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, a) => s + a.presentRate, 0) / withData.length;
  }, [attendance]);

  return (
    <div>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight">Bosh sahifa</h1>
      <p className="mb-7 text-[14px]" style={{ color: "var(--text-secondary)" }}>
        Xush kelibsiz, {profile?.name}
      </p>

      {error && (
        <div
          className="mb-5 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          Ma&apos;lumot yuklanmadi: {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="O'quvchilar" value={counts?.students} />
        <StatCard label="O'qituvchilar" value={counts?.teachers} />
        <StatCard label="Ota-onalar" value={counts?.parents} />
        <StatCard label="Jami" value={counts?.total} emphasize />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            So&apos;nggi 6 oy — jami tushum
          </p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums">{formatUzs(totalRevenue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            O&apos;rtacha davomat (14 kun)
          </p>
          <p
            className="mt-1 text-[22px] font-semibold tabular-nums"
            style={{ color: avgAttendance >= 0.8 ? "var(--success)" : "var(--warning)" }}
          >
            {Math.round(avgAttendance * 100)}%
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Qarzdorlar (Pending + Overdue)
          </p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums" style={{ color: "var(--warning)" }}>
            {(debtSlices.find((s) => s.status === "PENDING")?.count ?? 0) +
              (debtSlices.find((s) => s.status === "OVERDUE")?.count ?? 0)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-[14px] font-semibold">Oylik tushum dinamikasi</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0071e3" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#98989d" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#98989d" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`)}
              />
              <Tooltip
                formatter={(value) => formatUzs(Number(value))}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="total" stroke="#0071e3" strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Debt status pie */}
        <div className="card p-5">
          <h3 className="mb-4 text-[14px] font-semibold">To&apos;lovlar holati</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={debtSlices}
                dataKey="count"
                nameKey="label"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {debtSlices.map((s) => (
                  <Cell key={s.status} fill={s.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {debtSlices.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-medium tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attendance trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-[14px] font-semibold">Davomat dinamikasi (14 kun)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#98989d" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#98989d" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
              />
              <Tooltip
                formatter={(value) => `${Math.round(Number(value) * 100)}%`}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13 }}
              />
              <Line type="monotone" dataKey="presentRate" stroke="#1e8e5a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Students by filial */}
        {!isFilialAdmin && (
          <div className="card p-5">
            <h3 className="mb-4 text-[14px] font-semibold">Filiallar bo&apos;yicha o&apos;quvchilar</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byFilial} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: "#6e6e73" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13 }} />
                <Bar dataKey="students" fill="#0071e3" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {loading && (
        <p className="mt-4 text-center text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
          Yangilanmoqda...
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value?: number;
  emphasize?: boolean;
}) {
  return (
    <div className="card p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p
        className="mt-1.5 text-[30px] font-semibold tracking-tight tabular-nums"
        style={{ color: emphasize ? "var(--accent)" : "var(--text)" }}
      >
        {value === undefined ? "—" : value}
      </p>
    </div>
  );
}
