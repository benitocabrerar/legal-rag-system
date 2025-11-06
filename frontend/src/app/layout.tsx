import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal RAG System",
  description: "Sistema de asistencia legal con IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
