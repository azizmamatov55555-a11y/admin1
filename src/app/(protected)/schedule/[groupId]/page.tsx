"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchFilialOptions } from "@/lib/directory";
import type { Group, ScheduleItem } from "@/types/models";

const DAYS = [
  { value: 1, label: "Dushanba" },
  { value: 2, label: "Seshanba" },
  { value: 3, label: "Chorshanba" },
  { value: 4, label: "Payshanba" },
  { value: 5, label: "Juma" },
  { value: 6, label: "Shanba" },
  { value: 7, label: "Yakshanba" },
];

export default function ScheduleManagePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [filialName, setFilialName] = useState("");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDay, setOpenDay] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit =
    !!profile &&
    !!group &&
    (profile.role === "BOSH_ADMIN" ||
      profile.role === "ADMIN" ||
      (profile.role === "FILIAL_ADMIN" && profile.filialId === group.filialId));

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const gSnap = await getDoc(doc(db, "groups", params.groupId));
        if (!gSnap.exists()) {
          setError("Guruh topilmadi");
          setLoading(false);
          return;
        }
        const g = { id: gSnap.id, ...(gSnap.data() as object) } as Group;
        setGroup(g);

        if (g.filialId) {
          const filials = await fetchFilialOptions(g.filialId);
          setFilialName(filials[0]?.name || "");
        }

        const snap = await getDocs(query(collection(db, "schedules"), where("groupId", "==", params.groupId)));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }) as ScheduleItem)
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
        setItems(list);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  function openAddForm(day: number) {
    setOpenDay(day);
    setEditingId(null);
    setStartTime("");
    setEndTime("");
    setRoom("");
  }

  function openEditForm(item: ScheduleItem) {
    setOpenDay(item.dayOfWeek);
    setEditingId(item.id);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setRoom(item.room);
  }

  async function onSaveItem() {
    if (!group || openDay === null) return;
    if (!startTime || !endTime) {
      setError("Boshlanish va tugash vaqtini kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = editingId ?? doc(collection(db, "schedules")).id;
      const item: ScheduleItem = {
        id,
        groupId: group.id,
        subject: group.subject,
        teacherUid: group.teacherUid,
        teacherName: group.teacherName,
        dayOfWeek: openDay,
        startTime,
        endTime,
        room: room.trim(),
      };
      await setDoc(doc(db, "schedules", id), item);
      setItems((prev) => {
        const rest = prev.filter((x) => x.id !== id);
        return [...rest, item].sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
        );
      });
      setOpenDay(null);
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Darsni jadvaldan o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, "schedules", id));
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert("O'chirib bo'lmadi: " + (e as Error).message);
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

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/schedule")}
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
        {filialName && `Filial: ${filialName}`}
        {group.teacherName && ` · O'qituvchi: ${group.teacherName}`}
      </p>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      {!canEdit && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-[13px]"
          style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
        >
          Bu guruh jadvalini faqat ko&apos;rish mumkin — tahrirlash huquqi yo&apos;q.
        </div>
      )}

      <div className="space-y-3">
        {DAYS.map((day) => {
          const dayItems = items.filter((i) => i.dayOfWeek === day.value);
          return (
            <div key={day.value} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold">{day.label}</h3>
                {canEdit && openDay !== day.value && (
                  <button
                    onClick={() => openAddForm(day.value)}
                    className="flex items-center gap-1 text-[12.5px] font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    <Plus size={14} />
                    Qo&apos;shish
                  </button>
                )}
              </div>

              {dayItems.length === 0 && openDay !== day.value ? (
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                  Dars yo&apos;q
                </p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[10px] px-3 py-2"
                      style={{ background: "var(--surface-muted)" }}
                    >
                      <div>
                        <span className="text-[13.5px] font-medium tabular-nums">
                          {item.startTime}–{item.endTime}
                        </span>
                        {item.room && (
                          <span className="ml-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                            xona {item.room}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEditForm(item)}
                            className="text-[12.5px] font-medium"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Tahrirlash
                          </button>
                          <button onClick={() => onDelete(item.id)} style={{ color: "var(--danger)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canEdit && openDay === day.value && (
                <div className="mt-3 rounded-[10px] p-3" style={{ background: "var(--surface-muted)" }}>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input"
                    />
                  </div>
                  <input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Xona (ixtiyoriy)"
                    className="input mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={onSaveItem} disabled={saving} className="btn-primary">
                      {saving ? "Saqlanmoqda..." : "Saqlash"}
                    </button>
                    <button onClick={() => setOpenDay(null)} className="btn-secondary">
                      Bekor qilish
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
