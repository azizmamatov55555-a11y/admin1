// Эти типы 1-в-1 повторяют структуру документов в Firestore,
// как их пишет/читает Android-приложение (см. app/src/.../domain/model/*.kt).
// Меняешь схему в приложении — обнови и здесь.

export type UserRole =
  | "STUDENT"
  | "PARENT"
  | "TEACHER"
  | "ADMIN"
  | "BOSH_ADMIN"
  | "FILIAL_ADMIN";

export interface AppUser {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  filialId: string;
  /** legacy: первая группа (обратная совместимость) */
  groupId: string;
  /** актуальное поле: список групп (у ученика может быть 1-3) */
  groupIds: string[];
  childrenUids: string[];
  fcmToken: string;
  photoUrl: string;
  createdAt: number;
}

export interface Filial {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerUid: string;
}

export interface Group {
  id: string;
  filialId: string;
  subject: string;
  teacherUid: string;
  teacherName: string;
  grade: string;
  studentCount: number;
  schedule: Record<string, string>; // "Monday" -> "14:00"
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface Attendance {
  id: string;
  studentUid: string;
  groupId: string;
  date: number;
  status: AttendanceStatus;
  reason: string;
}

export interface ScheduleItem {
  id: string;
  groupId: string;
  subject: string;
  teacherUid: string;
  teacherName: string;
  /** 1=Dushanba ... 7=Yakshanba */
  dayOfWeek: number;
  startTime: string; // "14:00"
  endTime: string; // "15:30"
  room: string;
}

export type DebtStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export interface DebtPayment {
  id: string;
  amount: number;
  paidAt: number;
  note: string;
  adminUid: string;
  adminName: string;
}

export interface Debt {
  id: string;
  studentUid: string;
  studentName: string;
  filialId: string;
  // legacy (Room) поля
  subject: string;
  month: string;
  amount: number;
  isPaid: boolean;
  createdAt: number;
  // расширенные (Firestore) поля
  studentPhone: string;
  groupId: string;
  groupName: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: number;
  status: DebtStatus;
  payments: DebtPayment[];
}

export function debtRemaining(d: Debt): number {
  const total = d.totalAmount > 0 ? d.totalAmount : d.amount;
  return Math.max(total - d.paidAmount, 0);
}

/** 1-в-1 повторяет Debt.computedStatus() из Kotlin-модели. */
export function computeDebtStatus(d: Pick<Debt, "isPaid" | "paidAmount" | "totalAmount" | "amount" | "dueDate">): DebtStatus {
  const effectiveTotal = d.totalAmount > 0 ? d.totalAmount : d.amount;
  const now = Date.now();
  if (d.isPaid || (d.paidAmount >= effectiveTotal && effectiveTotal > 0)) return "PAID";
  if (d.dueDate > 0 && now > d.dueDate && d.paidAmount < effectiveTotal) return "OVERDUE";
  if (d.paidAmount > 0) return "PARTIAL";
  return "PENDING";
}

export function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} so'm`;
}
