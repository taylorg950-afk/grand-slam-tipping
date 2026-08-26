import type { Metadata } from "next";
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
  title: "Grand Slam Tipping",
  description: "Private tipping competition for the four Grand Slams",
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
