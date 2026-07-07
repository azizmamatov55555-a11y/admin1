import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// Все страницы используют Firebase Auth (браузерная штука) — Next.js не должен
// пытаться собрать их как статику во время билда (там ещё нет реального пользователя
// и это вызывает ошибку auth/invalid-api-key на этапе сборки, даже если ключи верные).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ziyo Admin",
  description: "Qorakol Ziyo — veb boshqaruv paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
