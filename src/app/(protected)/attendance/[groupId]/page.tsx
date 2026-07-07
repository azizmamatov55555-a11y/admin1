"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchStudentsInGroup, type Option } from "@/lib/directory";
import type { Attendance, AttendanceStatus, Group } from "@/types/models";

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const STATUS_META: Record<AttendanceStatus, { label: string; icon: typeof Check; color: string; bg: string }> = {
  PRESENT: { label: "Keldi", icon: Check, color: "var(--success)", bg: "var(--success-soft)" },
  ABSENT: { label: "Kelmadi", icon: X, color: "var(--danger)", bg: "var(--danger-soft)" },
  LATE: { label: "Kechikdi", icon: Clock, color: "var(--warning)", bg: "var(--warning-soft)" },
};

export default function AttendanceMarkPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Option[]>([]);
  const [todayMarks, setTodayMarks] = useState<Record<string, AttendanceStatus>>({});
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const gSnap = await getDoc(doc(db, "groups", params.groupId));
        if (!gSnap.exists()) {
          setError("Guruh topilmadi");
          return;
        }
        setGroup({ id: gSnap.id, ...(gSnap.data() as object) } as Group);

        const studentList = await fetchStudentsInGroup(params.groupId);
        setStudents(studentList);

        const from = todayStart();
        const to = from + 30 * 24 * 60 * 60 * 1000; // 30 kunlik oyna (keyingi qismda faqat o'tganlarini filtrlaymiz)
        const snap = await getDocs(
          query(
            collection(db, "attendance"),
            where("groupId", "==", params.groupId),
            where("date", ">=", from - 30 * 24 * 60 * 60 * 1000),
            where("date", "<", to),
          ),
        );
        const records = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Attendance);
        setHistory(records.filter((r) => r.date < from).sort((a, b) => b.date - a.date));

        const todayRecords = records.filter((r) => r.date >= from);
        const marks: Record<string, AttendanceStatus> = {};
        todayRecords.forEach((r) => {
          marks[r.studentUid] = r.status;
        });
        setTodayMarks(marks);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  function setMark(studentUid: string, status: AttendanceStatus) {
    setTodayMarks((prev) => ({ ...prev, [studentUid]: status }));
    setSaved(false);
  }

  async function onSaveAll() {
    setSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const dateKey = todayStart();
      for (const student of students) {
        const status = todayMarks[student.id];
        if (!status) continue;
        const id = `${params.groupId}_${student.id}_${dateKey}`;
        batch.set(doc(db, "attendance", id), {
          id,
          studentUid: student.id,
          groupId: params.groupId,
          date: dateKey,
          status,
          reason: "",
        });
      }
      await batch.commit();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Yuklanmoqda...</p>;
  }

  if (!group) {
    return (
      <div
        className="rounded-[12px] px-4 py-3 text-[13px]"
        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
      >
        {error || "Guruh topilmadi"}
      </div>
    );
  }

  const presentCount = Object.values(todayMarks).filter((s) => s === "PRESENT").length;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/attendance")}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft size={15} />
        Guruhlar ro&apos;yxatiga
      </button>

      <h1 className="text-[24px] font-semibold tracking-tight">
        {group.subject}
        {group.grade ? ` · ${group.grade}` : ""}
      </h1>
      <p className="mb-6 text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
        Bugun: {new Date().toLocaleDateString("ru-RU")} · {presentCount}/{students.length} keldi
      </p>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      <div className="card mb-6 divide-y" style={{ borderColor: "var(--border)" }}>
        {students.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>
            Bu guruhda o&apos;quvchilar yo&apos;q
          </p>
        ) : (
          students.map((s) => {
            const mark = todayMarks[s.id];
            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="text-[13.5px] font-medium">{s.name}</span>
                <div className="flex gap-1.5">
                  {(Object.keys(STATUS_META) as AttendanceStatus[]).map((status) => {
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    const active = mark === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setMark(s.id, status)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150"
                        style={active ? { background: meta.bg, color: meta.color } : { color: "var(--text-tertiary)" }}
                        title={meta.label}
                      >
                        <Icon size={15} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {students.length > 0 && (
        <button onClick={onSaveAll} disabled={saving} className="btn-primary mb-8">
          {saving ? "Saqlanmoqda..." : saved ? "Saqlandi ✓" : "Davomatni saqlash"}
        </button>
      )}

      <h2 className="mb-3 text-[15px] font-semibold">Oxirgi kunlar</h2>
      <div className="card overflow-hidden">
        {history.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            Tarix yo&apos;q
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {history.slice(0, 20).map((r) => {
                const studentName = students.find((s) => s.id === r.studentUid)?.name || r.studentUid;
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5">{new Date(r.date).toLocaleDateString("ru-RU")}</td>
                    <td className="px-4 py-2.5">{studentName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
