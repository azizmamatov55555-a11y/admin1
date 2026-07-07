"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchFilialOptions, fetchTeacherOptions, type Option } from "@/lib/directory";

export default function GroupEditPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [filialId, setFilialId] = useState("");
  const [teacherUid, setTeacherUid] = useState("");
  const [teacherOptions, setTeacherOptions] = useState<Option[]>([]);
  const [filialOptions, setFilialOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filialLocked = profile?.role === "FILIAL_ADMIN" && !!profile.filialId;

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      setError(null);
      try {
        const scopeFilialId = filialLocked ? profile.filialId : undefined;
        const [filials, teachers] = await Promise.all([
          fetchFilialOptions(scopeFilialId),
          fetchTeacherOptions(scopeFilialId),
        ]);
        setFilialOptions(filials);
        setTeacherOptions(teachers);
        if (filialLocked) setFilialId(profile.filialId);

        if (!isNew) {
          const snap = await getDoc(doc(db, "groups", params.id));
          if (snap.exists()) {
            const g = snap.data();
            setSubject(g.subject ?? "");
            setGrade(g.grade ?? "");
            setFilialId(g.filialId ?? "");
            setTeacherUid(g.teacherUid ?? "");
          } else {
            setError("Guruh topilmadi");
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, params.id]);

  async function onSave() {
    if (!subject.trim()) {
      setError("Fan nomini kiriting");
      return;
    }
    if (!filialId) {
      setError("Filialni tanlang");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = isNew ? doc(db, "groups", crypto.randomUUID()).id : params.id;
      const teacherName = teacherOptions.find((t) => t.id === teacherUid)?.name ?? "";
      await setDoc(
        doc(db, "groups", id),
        {
          id,
          subject: subject.trim(),
          grade: grade.trim(),
          filialId,
          teacherUid,
          teacherName,
          studentCount: 0,
          schedule: {},
        },
        { merge: true },
      );
      router.push("/groups");
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
      <h1 className="mb-6 text-[24px] font-semibold tracking-tight">
        {isNew ? "Yangi guruh" : "Guruhni tahrirlash"}
      </h1>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      <div className="card space-y-4 p-6">
        <Field label="Fan *">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Masalan: Matematika"
            className="input"
          />
        </Field>

        <Field label="Sinf / daraja">
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Masalan: 4-sinf yoki boshlang'ich"
            className="input"
          />
        </Field>

        <Field label="Filial *">
          <select
            value={filialId}
            onChange={(e) => setFilialId(e.target.value)}
            disabled={filialLocked}
            className="input"
          >
            <option value="">— tanlang —</option>
            {filialOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="O'qituvchi">
          <select value={teacherUid} onChange={(e) => setTeacherUid(e.target.value)} className="input">
            <option value="">— tanlanmagan —</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button onClick={() => router.push("/groups")} className="btn-secondary">
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
