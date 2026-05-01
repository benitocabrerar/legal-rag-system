import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import SkipLink from "@/components/accessibility/SkipLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// SaaS auth-protected → no tiene sentido prerender SSG; el AuthProvider sólo
// existe en cliente. Forzar dinámico evita errores "useAuth must be used within
// an AuthProvider" durante el build.
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://poweria-legal.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Poweria Legal — IA jurídica para abogados del Ecuador",
    template: "%s · Poweria Legal",
  },
  description:
    "Sala de litigación con IA, tarjetas argumentales, autocompletado de convocatorias y CFO virtual. Hecho en Ecuador, LOPDP-ready, citas con fuente.",
  keywords: [
    "IA jurídica Ecuador",
    "software para abogados",
    "litigación",
    "LOPDP",
    "automatización legal",
    "Poweria Legal",
    "COGNITEX",
  ],
  authors: [{ name: "COGNITEX", url: "https://cognitex.app" }],
  creator: "COGNITEX",
  publisher: "COGNITEX",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poweria Legal",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_EC",
    url: "/",
    siteName: "Poweria Legal",
    title: "Poweria Legal — IA jurídica para abogados del Ecuador",
    description:
      "Sala de litigación con IA, tarjetas argumentales, autocompletado de convocatorias y CFO virtual. Hecho en Ecuador, LOPDP-ready, citas con fuente.",
    images: [
      {
        // TODO: reemplazar /og.png con imagen final 1200×630 (logo + tagline + branding violeta).
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Poweria Legal — IA jurídica para abogados del Ecuador",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poweria Legal — IA jurídica para abogados del Ecuador",
    description:
      "Sala de litigación con IA, tarjetas argumentales, autocompletado de convocatorias y CFO virtual. Hecho en Ecuador, LOPDP-ready.",
    images: ["/og.png"],
    creator: "@cognitex",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
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
