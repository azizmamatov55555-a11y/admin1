"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchFilialAdminOptions, type Option } from "@/lib/directory";

export default function FilialEditPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [managerUid, setManagerUid] = useState("");
  const [managerOptions, setManagerOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = profile?.role === "BOSH_ADMIN" || profile?.role === "ADMIN";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const managers = await fetchFilialAdminOptions();
        setManagerOptions(managers);

        if (!isNew) {
          const snap = await getDoc(doc(db, "filials", params.id));
          if (snap.exists()) {
            const f = snap.data();
            setName(f.name ?? "");
            setAddress(f.address ?? "");
            setPhone(f.phone ?? "");
            setManagerUid(f.managerUid ?? "");
          } else {
            setError("Filial topilmadi");
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
  }, [params.id]);

  async function onSave() {
    if (!name.trim()) {
      setError("Filial nomini kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = isNew ? doc(db, "filials", crypto.randomUUID()).id : params.id;
      await setDoc(
        doc(db, "filials", id),
        {
          id,
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          managerUid,
        },
        { merge: true },
      );
      router.push("/filials");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <div
        className="rounded-[12px] px-4 py-3 text-[13px]"
        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
      >
        Bu bo&apos;limni faqat bosh administrator tahrirlashi mumkin.
      </div>
    );
  }

  if (loading) {
    return <p className="text-[13.5px]" style={{ color: "var(--text-tertiary)" }}>Yuklanmoqda...</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-[24px] font-semibold tracking-tight">
        {isNew ? "Yangi filial" : "Filialni tahrirlash"}
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
        <Field label="Nomi *">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Masalan: Markaziy filial" />
        </Field>

        <Field label="Manzil">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
        </Field>

        <Field label="Telefon">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+998 90 123 45 67" />
        </Field>

        <Field label="Menejer (filial admini)">
          <select value={managerUid} onChange={(e) => setManagerUid(e.target.value)} className="input">
            <option value="">— tayinlanmagan —</option>
            {managerOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button onClick={() => router.push("/filials")} className="btn-secondary">
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
