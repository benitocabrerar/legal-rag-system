import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import SkipLink from "@/components/accessibility/SkipLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// SaaS auth-protected → no tiene sentido prerender SSG; el AuthProvider sólo
// existe en cliente. Forzar dinámico evita errores "useAuth must be used within
// an AuthProvider" durante el build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Legal RAG System",
  description: "Sistema de asistencia legal con IA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Legal RAG",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SkipLink targetId="main-content" />
        <Providers>
          <LanguageSwitcher variant="fixed" />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
