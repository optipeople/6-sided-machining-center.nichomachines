import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { site } from "@/lib/site";
import "@/styles/globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#da5f06",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.legalName }],
  openGraph: {
    type: "website",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interTight.variable}>
      <body className="min-h-screen bg-[var(--color-cream-50)] text-[var(--color-ink-700)] antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-tan-500)] focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
