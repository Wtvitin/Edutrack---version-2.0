import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTrack AI — Seu espaço de estudos",
  description: "Organize tarefas, encontre seu foco e acompanhe seu próprio ritmo de estudos.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
