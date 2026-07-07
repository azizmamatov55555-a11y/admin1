import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Filial } from "@/types/models";

export interface Option {
  id: string;
  name: string;
}

/**
 * Список учителей. Для FILIAL_ADMIN — только его филиал (как в Android admin/group/AdminGroupEditViewModel.kt).
 */
export async function fetchTeacherOptions(filialId?: string): Promise<Option[]> {
  const base = collection(db, "users");
  const constraints = [where("role", "==", "TEACHER")];
  if (filialId) constraints.push(where("filialId", "==", filialId));
  const snap = await getDocs(query(base, ...constraints));
  return snap.docs.map((d) => {
    const data = d.data() as AppUser;
    return { id: d.id, name: data.name || d.id };
  });
}

/**
 * Список студентов (для выбора в форме долга). Для FILIAL_ADMIN — только его филиал.
 */
export async function fetchStudentOptions(filialId?: string): Promise<
  (Option & { phone: string; filialId: string; groupId: string; groupName?: string })[]
> {
  const base = collection(db, "users");
  const constraints = [where("role", "==", "STUDENT")];
  if (filialId) constraints.push(where("filialId", "==", filialId));
  const snap = await getDocs(query(base, ...constraints));
  return snap.docs.map((d) => {
    const data = d.data() as AppUser;
    return {
      id: d.id,
      name: data.name || d.id,
      phone: data.phone || "",
      filialId: data.filialId || "",
      groupId: data.groupIds?.[0] || data.groupId || "",
    };
  });
}

/**
 * Список кандидатов в "менеджеры филиала" — это FILIAL_ADMIN, НЕ учителя.
 * (В мобильном приложении раньше был баг: показывались учителя — см. OZGARISHLAR_README v4.)
 */
export async function fetchFilialAdminOptions(): Promise<Option[]> {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "FILIAL_ADMIN")));
  return snap.docs.map((d) => {
    const data = d.data() as AppUser;
    return { id: d.id, name: data.name || "Administrator" };
  });
}

/**
 * Студенты конкретной группы (по legacy groupId ИЛИ новому groupIds[]) — для отметки посещаемости.
 */
export async function fetchStudentsInGroup(groupId: string): Promise<Option[]> {
  const base = collection(db, "users");
  const [byLegacy, byArray] = await Promise.all([
    getDocs(query(base, where("role", "==", "STUDENT"), where("groupId", "==", groupId))),
    getDocs(query(base, where("role", "==", "STUDENT"), where("groupIds", "array-contains", groupId))),
  ]);
  const map = new Map<string, string>();
  [...byLegacy.docs, ...byArray.docs].forEach((d) => {
    const data = d.data() as AppUser;
    map.set(d.id, data.name || d.id);
  });
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Список филиалов. Для FILIAL_ADMIN — только собственный (правила Firestore и так это требуют).
 */
export async function fetchFilialOptions(filialId?: string): Promise<Option[]> {
  if (filialId) {
    const snap = await getDocs(query(collection(db, "filials"), where("__name__", "==", filialId)));
    return snap.docs.map((d) => ({ id: d.id, name: (d.data() as Filial).name || d.id }));
  }
  const snap = await getDocs(collection(db, "filials"));
  return snap.docs.map((d) => ({ id: d.id, name: (d.data() as Filial).name || d.id }));
}
