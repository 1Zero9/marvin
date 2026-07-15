import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SwRegister from "@/components/SwRegister";

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Marvin",
  description:
    "Starvin'? Let's sort dinner. Your personal cookbook index and recipe log.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#FF6A00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        <Nav />
        <main className="container" style={{ paddingBottom: 96, paddingTop: 24 }}>
          {children}
        </main>
        <SwRegister />
      </body>
    </html>
  );
}
