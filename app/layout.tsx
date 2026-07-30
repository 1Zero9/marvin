import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Nunito_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SwRegister from "@/components/SwRegister";

const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Marvin",
  description:
    "A private daily companion and shared household cookbook.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#35665B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        <div className="container"><AppShell>{children}</AppShell></div>
        <SwRegister />
      </body>
    </html>
  );
}
