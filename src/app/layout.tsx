import type { Metadata, Viewport } from "next";
import { Archivo, Saira_Condensed } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
});

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  variable: "--font-saira",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  // metadataBase makes the generated OG image resolve to an absolute URL, which
  // link previews require. Vercel sets VERCEL_URL on every deployment.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: {
    default: "The Tipping Post",
    template: "%s · The Tipping Post",
  },
  description: "Tip every match of all four majors. Each slam runs as its own competition.",
  applicationName: "The Tipping Post",
  openGraph: {
    title: "The Tipping Post",
    description: "Tip every match of all four majors. Each slam runs as its own competition.",
    siteName: "The Tipping Post",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Tipping Post",
    description: "Tip every match of all four majors. Each slam runs as its own competition.",
  },
  appleWebApp: {
    capable: true,
    title: "Tipping Post",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#00308F",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${sairaCondensed.variable} h-full antialiased scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-archivo), system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
