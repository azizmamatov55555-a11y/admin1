"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchStudentOptions } from "@/lib/directory";
import type { Group } from "@/types/models";

interface StudentOption {
  id: string;
  name: string;
  phone: string;
  filialId: string;
  groupId: string;
}

export default function NewDebtPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [studentUid, setStudentUid] = useState("");
  const [subject, setSubject] = useState("");
  const [month, setMonth] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      try {
        const scopeFilialId =
          profile.role === "FILIAL_ADMIN" && profile.filialId ? profile.filialId : undefined;
        const [studentList, groupSnap] = await Promise.all([
          fetchStudentOptions(scopeFilialId),
          getDocs(collection(db, "groups")),
        ]);
        setStudents(studentList);
        setGroups(groupSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Group));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const selectedStudent = students.find((s) => s.id === studentUid);
  const selectedGroup = groups.find((g) => g.id === selectedStudent?.groupId);

  async function onSave() {
    if (!studentUid) return setError("O'quvchini tanlang");
    const amount = Number(totalAmount);
    if (!amount || amount <= 0) return setError("To'g'ri summa kiriting");

    setSaving(true);
    setError(null);
    try {
      const id = doc(collection(db, "debts")).id;
      const student = students.find((s) => s.id === studentUid)!;
      const group = groups.find((g) => g.id === student.groupId);
      await setDoc(doc(db, "debts", id), {
        id,
        studentUid: student.id,
        studentName: student.name,
        studentPhone: student.phone,
        filialId: student.filialId,
        groupId: student.groupId || "",
        groupName: group ? `${group.subject}${group.grade ? " · " + group.grade : ""}` : "",
        subject: subject.trim() || group?.subject || "",
        month: month.trim(),
        amount,
        totalAmount: amount,
        paidAmount: 0,
        isPaid: false,
        status: "PENDING",
        dueDate: dueDate ? new Date(dueDate).getTime() : 0,
        description: "",
        payments: [],
        createdAt: Date.now(),
      });
      router.push("/debts");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Yuklanmoqda...</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-[24px] font-semibold tracking-tight">To&apos;lov yaratish</h1>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      <div className="card space-y-4 p-6">
        <Field label="O'quvchi *">
          <select value={studentUid} onChange={(e) => setStudentUid(e.target.value)} className="input">
            <option value="">— tanlang —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {selectedGroup && (
          <div
            className="rounded-[10px] px-3.5 py-2.5 text-[13px]"
            style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
          >
            Guruh: <span className="font-medium" style={{ color: "var(--text)" }}>{selectedGroup.subject}{selectedGroup.grade ? ` · ${selectedGroup.grade}` : ""}</span>
          </div>
        )}

        <Field label="Fan (ixtiyoriy)">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={selectedGroup?.subject || "Guruh fanidan olinadi"}
            className="input"
          />
        </Field>

        <Field label="Oy">
          <input
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="Masalan: Iyul 2026"
            className="input"
          />
        </Field>

        <Field label="Summa (so'm) *">
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="Masalan: 720000"
            className="input"
          />
        </Field>

        <Field label="To'lov muddati">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button onClick={() => router.push("/debts")} className="btn-secondary">
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
